import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  JobSourceAdapter,
  DiscoveryRunReport,
  FetchOptions,
  NormalizedJobPosting,
} from './types';
import { validateRawJob } from './jobValidationService';
import { normalizeJob } from './jobNormalizationService';
import { checkDuplicateJob } from './duplicateDetectionService';
import { ensureJobSource, persistJob } from './jobPersistenceService';
import { adapterRegistry } from './adapterRegistry';

/**
 * Orchestrates a complete job discovery run across one or multiple source adapters.
 * Manages fetching, validation, normalization, duplicate detection, persistence,
 * and comprehensive run statistics logging.
 */
export async function executeDiscovery(
  adapters?: JobSourceAdapter[],
  options?: FetchOptions
): Promise<DiscoveryRunReport> {
  const startTime = new Date();
  const targetAdapters = adapters && adapters.length > 0 ? adapters : adapterRegistry.getAll();

  // 1. Initialize AutomationRun tracking record in SQLite
  const automationRun = await prisma.automationRun.create({
    data: {
      runType: 'DISCOVERY',
      status: 'RUNNING',
      startTime,
      trigger: 'MANUAL',
    },
  });

  const report: DiscoveryRunReport = {
    runId: automationRun.id,
    startTime,
    completionTime: startTime,
    sourcesPolled: targetAdapters.length,
    totalRawFetched: 0,
    validJobsCount: 0,
    invalidJobsSkipped: 0,
    duplicatesSkipped: {
      exactUrl: 0,
      externalId: 0,
      crossSource: 0,
      previouslyRejectedOrExpired: 0,
      total: 0,
    },
    newJobsSaved: 0,
    savedJobIds: [],
    errors: [],
    sourceBreakdowns: {},
  };

  if (targetAdapters.length === 0) {
    const errorMsg = 'No job source adapters registered or selected for discovery.';
    report.errors.push(errorMsg);
    await prisma.automationRun.update({
      where: { id: automationRun.id },
      data: {
        status: 'FAILED',
        completionTime: new Date(),
        errors: JSON.stringify([errorMsg]),
      },
    });
    return report;
  }

  // 2. Process each adapter
  for (const adapter of targetAdapters) {
    const sourceMeta = adapter.metadata;
    const breakdown = {
      sourceName: sourceMeta.name,
      rawFetched: 0,
      saved: 0,
      duplicates: 0,
      invalid: 0,
      status: 'SUCCESS' as 'SUCCESS' | 'PARTIAL' | 'FAILED',
      error: undefined as string | undefined,
    };

    try {
      // Ensure source record exists in DB
      const dbSource = await ensureJobSource(sourceMeta);

      // Fetch raw jobs from adapter
      const fetchResult = await adapter.fetchJobs(options);
      if (!fetchResult.success) {
        breakdown.status = 'FAILED';
        breakdown.error = fetchResult.error || 'Fetch operation failed';
        report.errors.push(`[${sourceMeta.name}] ${breakdown.error}`);
        report.sourceBreakdowns[sourceMeta.id] = breakdown;
        continue;
      }

      breakdown.rawFetched = fetchResult.rawJobs.length;
      report.totalRawFetched += fetchResult.rawJobs.length;

      // Process each raw job listing
      for (const rawJob of fetchResult.rawJobs) {
        // A. Validate raw listing
        const validation = validateRawJob(rawJob);
        if (!validation.isValid) {
          breakdown.invalid++;
          report.invalidJobsSkipped++;
          continue;
        }

        report.validJobsCount++;

        // B. Normalize job listing
        const normalized: NormalizedJobPosting = normalizeJob(rawJob, sourceMeta.name);

        // C. Check duplicates & previously rejected/expired opportunities
        const deduplication = await checkDuplicateJob(normalized, dbSource.id);
        if (deduplication.isDuplicate) {
          breakdown.duplicates++;
          report.duplicatesSkipped.total++;

          switch (deduplication.reason) {
            case 'EXACT_URL':
              report.duplicatesSkipped.exactUrl++;
              break;
            case 'EXTERNAL_ID':
              report.duplicatesSkipped.externalId++;
              break;
            case 'CROSS_SOURCE_MATCH':
              report.duplicatesSkipped.crossSource++;
              break;
            case 'PREVIOUSLY_REJECTED_OR_EXPIRED':
              report.duplicatesSkipped.previouslyRejectedOrExpired++;
              break;
            default:
              report.duplicatesSkipped.exactUrl++;
              break;
          }
          continue;
        }

        // D. Persist new opportunity
        const saveResult = await persistJob(normalized, dbSource.id, automationRun.id);
        if (saveResult.success && saveResult.jobId) {
          breakdown.saved++;
          report.newJobsSaved++;
          report.savedJobIds.push(saveResult.jobId);
        } else {
          report.errors.push(`[${sourceMeta.name}] Failed to save "${normalized.title}": ${saveResult.error}`);
        }
      }

      report.sourceBreakdowns[sourceMeta.id] = breakdown;
    } catch (sourceError) {
      console.error(`Error processing adapter ${sourceMeta.name}:`, sourceError);
      breakdown.status = 'FAILED';
      breakdown.error = sourceError instanceof Error ? sourceError.message : 'Unknown adapter failure';
      report.errors.push(`[${sourceMeta.name}] ${breakdown.error}`);
      report.sourceBreakdowns[sourceMeta.id] = breakdown;
    }
  }

  // 3. Finalize AutomationRun record
  const completionTime = new Date();
  report.completionTime = completionTime;

  const finalStatus =
    report.errors.length === 0
      ? 'COMPLETED'
      : report.newJobsSaved > 0
      ? 'PARTIAL_SUCCESS'
      : 'FAILED';

  await prisma.automationRun.update({
    where: { id: automationRun.id },
    data: {
      status: finalStatus,
      completionTime,
      discoveredJobs: report.totalRawFetched,
      evaluatedJobs: 0,
      qualifiedJobs: report.newJobsSaved,
      errors: report.errors.length > 0 ? JSON.stringify(report.errors) : null,
    },
  });

  // Record summary log in ActivityLog
  await prisma.activityLog.create({
    data: {
      automationRunId: automationRun.id,
      level: report.errors.length > 0 ? 'WARN' : 'INFO',
      action: 'DISCOVERY_RUN_COMPLETED',
      entityType: 'AutomationRun',
      entityId: automationRun.id,
      details: JSON.stringify({
        sourcesPolled: report.sourcesPolled,
        totalRawFetched: report.totalRawFetched,
        validJobs: report.validJobsCount,
        invalidSkipped: report.invalidJobsSkipped,
        duplicatesSkipped: report.duplicatesSkipped.total,
        newJobsSaved: report.newJobsSaved,
        status: finalStatus,
      }),
    },
  });

  return report;
}
