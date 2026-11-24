import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  SelectionConfig,
  DEFAULT_SELECTION_CONFIG,
  SelectionResult,
  RankedOpportunity,
} from './types';
import { rankOpportunities, OpportunityCandidate } from './rankingEngine';
import { getOrCreatePrimaryProfile } from '../server/profileDbService';

export interface SelectOpportunitiesOptions {
  profileId?: string;
  config?: Partial<SelectionConfig>;
  automationRunId?: string;
  trigger?: string; // 'SCHEDULED' | 'MANUAL'
}

/**
 * Evaluates, filters, ranks, and selects the top qualified opportunities for application preparation.
 * Enforces:
 * - Exclusion of ineligible, rejected, expired, past-deadline, or low-scoring jobs.
 * - Prevention of overwriting or duplicating applications already in review or submitted.
 * - Configurable selection limit (default: maximum 3).
 * - Exact recording against AutomationRun and ActivityLog.
 */
export async function selectOpportunitiesForPreparation(
  options: SelectOpportunitiesOptions = {}
): Promise<SelectionResult> {
  const runId = `sel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

  const config: SelectionConfig = {
    ...DEFAULT_SELECTION_CONFIG,
    ...options.config,
  };

  // 1. Resolve Profile
  const primaryCandidate = options.profileId
    ? await prisma.candidateProfile.findUnique({ where: { id: options.profileId } })
    : await getOrCreatePrimaryProfile();

  if (!primaryCandidate) {
    throw new Error('No candidate profile available for opportunity selection.');
  }

  // 2. Retrieve All Evaluated Jobs
  const evaluatedJobs = await prisma.job.findMany({
    where: {
      evaluations: {
        some: {
          profileId: primaryCandidate.id,
        },
      },
    },
    include: {
      evaluations: {
        where: { profileId: primaryCandidate.id },
        orderBy: { evaluatedAt: 'desc' },
        take: 1,
      },
      applications: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const excludedCounts = {
    ineligible: 0,
    rejectedOrExpired: 0,
    alreadyInPipeline: 0,
    pastDeadline: 0,
    scoreBelowThreshold: 0,
    total: 0,
  };

  const qualifiedCandidates: OpportunityCandidate[] = [];

  // 3. Apply Exclusions
  for (const item of evaluatedJobs) {
    const latestEval = item.evaluations[0];
    if (!latestEval) continue;

    const latestApp = item.applications[0] || null;

    // Check past deadline
    if (item.deadline && new Date(item.deadline).getTime() < now.getTime()) {
      excludedCounts.pastDeadline++;
      excludedCounts.total++;
      continue;
    }

    // Check ineligibility
    if (latestEval.eligibility === 'INELIGIBLE' || latestEval.recommendation === 'NOT_RECOMMENDED') {
      excludedCounts.ineligible++;
      excludedCounts.total++;
      continue;
    }

    // Check minimum match score threshold
    if (latestEval.overallMatchScore < config.minMatchScore) {
      excludedCounts.scoreBelowThreshold++;
      excludedCounts.total++;
      continue;
    }

    // Check unclear eligibility permission
    if (latestEval.eligibility === 'UNCLEAR' && !config.allowUnclearEligibility && latestEval.overallMatchScore < 70) {
      excludedCounts.ineligible++;
      excludedCounts.total++;
      continue;
    }

    // Check existing application status (Prevention rules)
    if (latestApp) {
      const status = latestApp.status;

      // Exclude rejected, expired, or archived
      if (['REJECTED', 'EXPIRED', 'ARCHIVED'].includes(status)) {
        excludedCounts.rejectedOrExpired++;
        excludedCounts.total++;
        continue;
      }

      // PREVENTION RULE: Applications already awaiting review or in progress must NEVER be overwritten or duplicated
      if (['PREPARING', 'PENDING_REVIEW', 'APPROVED', 'READY_TO_SUBMIT', 'APPLIED'].includes(status)) {
        excludedCounts.alreadyInPipeline++;
        excludedCounts.total++;
        continue;
      }
    }

    qualifiedCandidates.push({
      job: {
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        deadline: item.deadline,
        postedAt: item.postedAt,
        discoveredAt: item.discoveredAt,
      },
      evaluation: {
        overallMatchScore: latestEval.overallMatchScore,
        eligibility: latestEval.eligibility,
        recommendation: latestEval.recommendation,
      },
      application: latestApp ? { id: latestApp.id, status: latestApp.status } : null,
    });
  }

  // 4. Rank Qualified Opportunities
  const rankedOpportunities = rankOpportunities(qualifiedCandidates, config);

  // 5. Select Opportunities (Maximum of N, but not a mandatory target)
  const selectionLimit = config.maxSelectionLimit;
  const selected = rankedOpportunities.slice(0, selectionLimit);

  // 6. Transition / Create Application Records for Selected Opportunities
  for (const opp of selected) {
    const existingApp = await prisma.application.findFirst({
      where: { jobId: opp.jobId },
    });

    const noteEntry = `[SELECTION ENGINE] Selected for application preparation (Rank #${opp.rank}, Priority: ${opp.compositeRankScore}, Match Score: ${opp.overallMatchScore}%).`;

    if (existingApp) {
      // Guard: Double-check we never overwrite PENDING_REVIEW, APPROVED, READY_TO_SUBMIT, APPLIED
      if (!['PENDING_REVIEW', 'APPROVED', 'READY_TO_SUBMIT', 'APPLIED'].includes(existingApp.status)) {
        await prisma.application.update({
          where: { id: existingApp.id },
          data: {
            status: 'PREPARING',
            preparationDate: now,
            notes: existingApp.notes ? `${existingApp.notes}\n${noteEntry}` : noteEntry,
          },
        });
      }
    } else {
      await prisma.application.create({
        data: {
          jobId: opp.jobId,
          profileId: primaryCandidate.id,
          status: 'PREPARING',
          preparationDate: now,
          notes: noteEntry,
        },
      });
    }
  }

  // 7. Record against AutomationRun and ActivityLog
  let autoRunId = options.automationRunId;

  if (autoRunId) {
    await prisma.automationRun.update({
      where: { id: autoRunId },
      data: {
        qualifiedJobs: qualifiedCandidates.length,
        preparedApplications: selected.length,
        status: 'COMPLETED',
        completionTime: now,
      },
    });
  } else {
    const autoRun = await prisma.automationRun.create({
      data: {
        runType: 'APPLICATION_PREP',
        status: 'COMPLETED',
        trigger: options.trigger || 'MANUAL',
        startTime: now,
        completionTime: now,
        discoveredJobs: evaluatedJobs.length,
        evaluatedJobs: evaluatedJobs.length,
        qualifiedJobs: qualifiedCandidates.length,
        preparedApplications: selected.length,
      },
    });
    autoRunId = autoRun.id;
  }

  // Record audit logs
  for (const opp of selected) {
    try {
      await prisma.activityLog.create({
        data: {
          automationRunId: autoRunId,
          level: 'INFO',
          action: 'OPPORTUNITY_SELECTED',
          entityType: 'Job',
          entityId: opp.jobId,
          details: JSON.stringify({
            title: opp.title,
            company: opp.company,
            rank: opp.rank,
            overallMatchScore: opp.overallMatchScore,
            compositeRankScore: opp.compositeRankScore,
            reason: opp.selectionReason,
          }),
        },
      });
    } catch {}
  }

  return {
    runId,
    totalEvaluatedConsidered: evaluatedJobs.length,
    excludedCounts,
    totalQualified: qualifiedCandidates.length,
    configuredLimit: selectionLimit,
    selectedCount: selected.length,
    selectedOpportunities: selected,
    automationRunId: autoRunId,
    completedAt: now,
  };
}
