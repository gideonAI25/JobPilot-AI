import { RankedOpportunity, SelectionConfig } from './types';
import { calculateJobFreshnessScore } from '../evaluation/scoringEngine';

export interface OpportunityCandidate {
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    deadline: Date | null;
    postedAt: Date | null;
    discoveredAt: Date;
  };
  evaluation: {
    overallMatchScore: number;
    eligibility: string;
    recommendation: string;
  };
  application: {
    id: string;
    status: string;
  } | null;
}

/**
 * Deterministically ranks qualified job opportunities based on match score,
 * application deadline urgency, listing freshness, and eligibility confidence.
 */
export function rankOpportunities(
  candidates: OpportunityCandidate[],
  config: SelectionConfig
): RankedOpportunity[] {
  const now = new Date();

  const ranked: RankedOpportunity[] = candidates.map((item) => {
    const job = item.job;
    const evalItem = item.evaluation;
    const matchScore = evalItem.overallMatchScore;

    // 1. Deadline Urgency Boost
    let deadlineBoost = 0;
    let daysUntilDeadline: number | null = null;

    if (job.deadline) {
      const deadlineDate = new Date(job.deadline);
      const diffMs = deadlineDate.getTime() - now.getTime();
      daysUntilDeadline = Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;

      if (daysUntilDeadline >= 0 && daysUntilDeadline <= 3) {
        deadlineBoost = 15; // Critical deadline approaching
      } else if (daysUntilDeadline > 3 && daysUntilDeadline <= config.urgencyBoostDays) {
        deadlineBoost = 10; // High urgency
      } else if (daysUntilDeadline > config.urgencyBoostDays && daysUntilDeadline <= 14) {
        deadlineBoost = 5; // Moderate urgency
      }
    }

    // 2. Freshness Boost
    const freshnessScore = calculateJobFreshnessScore(job.postedAt, job.discoveredAt);
    let freshnessBoost = 0;
    if (freshnessScore >= 95) {
      freshnessBoost = 5;
    } else if (freshnessScore >= 85) {
      freshnessBoost = 3;
    }

    // 3. Confirmed Eligibility Boost (Confirmed ELIGIBLE prioritized over UNCLEAR)
    const isConfirmedEligible = evalItem.eligibility === 'ELIGIBLE';
    const eligibilityBoost = isConfirmedEligible ? 5 : 0;

    // Composite Rank Score calculation
    const compositeRankScore = matchScore + deadlineBoost + freshnessBoost + eligibilityBoost;

    // Formulate transparent rationale
    const reasonParts: string[] = [`${matchScore}% overall match score`];
    if (isConfirmedEligible) {
      reasonParts.push('confirmed Nigeria eligibility');
    } else {
      reasonParts.push('unclear location boundaries requiring review');
    }
    if (daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 14) {
      reasonParts.push(`deadline in ${daysUntilDeadline} days (+${deadlineBoost} urgency boost)`);
    }
    if (freshnessBoost > 0) {
      reasonParts.push(`fresh listing (+${freshnessBoost} freshness boost)`);
    }

    const selectionReason = `Ranked with priority score ${compositeRankScore}: ${reasonParts.join(', ')}.`;

    return {
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      overallMatchScore: matchScore,
      eligibility: evalItem.eligibility as any,
      recommendation: evalItem.recommendation as any,
      compositeRankScore,
      deadline: job.deadline,
      daysUntilDeadline,
      postedAt: job.postedAt,
      freshnessScore,
      applicationId: item.application?.id || null,
      currentApplicationStatus: item.application?.status || null,
      selectionReason,
      rank: 0, // Assigned after sorting
    };
  });

  // Sort: Composite score descending, tiebreaks by matchScore, earliest deadline, newest post
  ranked.sort((a, b) => {
    if (b.compositeRankScore !== a.compositeRankScore) {
      return b.compositeRankScore - a.compositeRankScore;
    }
    if (b.overallMatchScore !== a.overallMatchScore) {
      return b.overallMatchScore - a.overallMatchScore;
    }
    // Tiebreaker: Earlier active deadline first
    if (a.daysUntilDeadline !== null && b.daysUntilDeadline !== null) {
      if (a.daysUntilDeadline !== b.daysUntilDeadline) {
        return a.daysUntilDeadline - b.daysUntilDeadline;
      }
    }
    const aDate = a.postedAt ? new Date(a.postedAt).getTime() : 0;
    const bDate = b.postedAt ? new Date(b.postedAt).getTime() : 0;
    return bDate - aDate;
  });

  // Assign sequential 1-based ranks
  return ranked.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
