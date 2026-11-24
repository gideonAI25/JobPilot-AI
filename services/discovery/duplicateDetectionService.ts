import 'server-only';
import { prisma } from '@/lib/prisma';
import { NormalizedJobPosting, DeduplicationResult } from './types';
import { generateJobFingerprint } from './jobNormalizationService';

/**
 * Checks whether an incoming normalized job posting already exists or corresponds
 * to an opportunity that was previously evaluated, rejected, or expired.
 */
export async function checkDuplicateJob(
  job: NormalizedJobPosting,
  sourceId?: string | null
): Promise<DeduplicationResult> {
  // 1. Check exact URL match
  const existingByUrl = await prisma.job.findUnique({
    where: { url: job.url },
    include: {
      applications: {
        select: { id: true, status: true },
      },
      evaluations: {
        take: 1,
        orderBy: { evaluatedAt: 'desc' },
        select: { recommendation: true },
      },
    },
  });

  if (existingByUrl) {
    const isRejectedOrExpired =
      existingByUrl.applications.some(
        (app) => app.status === 'REJECTED' || app.status === 'EXPIRED' || app.status === 'ARCHIVED'
      ) || existingByUrl.evaluations[0]?.recommendation === 'NOT_RECOMMENDED';

    if (isRejectedOrExpired) {
      return {
        isDuplicate: true,
        reason: 'PREVIOUSLY_REJECTED_OR_EXPIRED',
        existingJobId: existingByUrl.id,
        details: `Job with this URL was previously rejected, expired, or archived: "${existingByUrl.title}" at ${existingByUrl.company}.`,
      };
    }

    return {
      isDuplicate: true,
      reason: 'EXACT_URL',
      existingJobId: existingByUrl.id,
      details: `Identical URL already recorded: "${existingByUrl.title}" at ${existingByUrl.company}.`,
    };
  }

  // 2. Check sourceId + externalId match
  if (job.externalId && sourceId) {
    const existingByExternalId = await prisma.job.findFirst({
      where: {
        sourceId,
        externalId: job.externalId,
      },
      include: {
        applications: {
          select: { id: true, status: true },
        },
      },
    });

    if (existingByExternalId) {
      const isRejectedOrExpired = existingByExternalId.applications.some(
        (app) => app.status === 'REJECTED' || app.status === 'EXPIRED' || app.status === 'ARCHIVED'
      );

      return {
        isDuplicate: true,
        reason: isRejectedOrExpired ? 'PREVIOUSLY_REJECTED_OR_EXPIRED' : 'EXTERNAL_ID',
        existingJobId: existingByExternalId.id,
        details: `External ID "${job.externalId}" already recorded from this source.`,
      };
    }
  }

  // 3. Cross-source fuzzy match by canonical company + title + work arrangement
  // Find jobs with similar company name
  const candidates = await prisma.job.findMany({
    where: {
      company: {
        contains: job.company.slice(0, 10).trim(),
      },
    },
    select: {
      id: true,
      title: true,
      company: true,
      workArrangement: true,
      applications: {
        select: { status: true },
      },
    },
    take: 20,
  });

  for (const candidate of candidates) {
    const candidateFingerprint = generateJobFingerprint(
      candidate.company,
      candidate.title,
      candidate.workArrangement
    );

    if (candidateFingerprint === job.fingerprint) {
      const isRejectedOrExpired = candidate.applications.some(
        (app) => app.status === 'REJECTED' || app.status === 'EXPIRED' || app.status === 'ARCHIVED'
      );

      if (isRejectedOrExpired) {
        return {
          isDuplicate: true,
          reason: 'PREVIOUSLY_REJECTED_OR_EXPIRED',
          existingJobId: candidate.id,
          details: `Opportunity previously rejected or expired across another source: "${candidate.title}" at ${candidate.company}.`,
        };
      }

      return {
        isDuplicate: true,
        reason: 'CROSS_SOURCE_MATCH',
        existingJobId: candidate.id,
        details: `Identical opportunity previously discovered from another source: "${candidate.title}" at ${candidate.company}.`,
      };
    }
  }

  return { isDuplicate: false };
}
