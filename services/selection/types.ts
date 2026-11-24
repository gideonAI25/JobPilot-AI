import { EligibilityStatus, Recommendation } from '../evaluation/types';

export interface SelectionConfig {
  maxSelectionLimit: number; // Default: 3 (maximum, not mandatory)
  minMatchScore: number; // Default: 50%
  allowUnclearEligibility: boolean; // Default: true if score >= 65, else false
  urgencyBoostDays: number; // Default: 7 days window for deadline urgency boost
}

export const DEFAULT_SELECTION_CONFIG: SelectionConfig = {
  maxSelectionLimit: 3,
  minMatchScore: 50,
  allowUnclearEligibility: true,
  urgencyBoostDays: 7,
};

export type SelectionExclusionReason =
  | 'INELIGIBLE'
  | 'REJECTED_OR_EXPIRED'
  | 'ALREADY_IN_PIPELINE'
  | 'PAST_DEADLINE'
  | 'SCORE_BELOW_THRESHOLD'
  | 'NOT_EVALUATED';

export interface RankedOpportunity {
  jobId: string;
  title: string;
  company: string;
  location: string;
  overallMatchScore: number;
  eligibility: EligibilityStatus;
  recommendation: Recommendation;
  compositeRankScore: number;
  deadline: Date | null;
  daysUntilDeadline: number | null;
  postedAt: Date | null;
  freshnessScore: number;
  applicationId: string | null;
  currentApplicationStatus: string | null;
  selectionReason: string;
  rank: number;
}

export interface SelectionResult {
  runId: string;
  totalEvaluatedConsidered: number;
  excludedCounts: {
    ineligible: number;
    rejectedOrExpired: number;
    alreadyInPipeline: number;
    pastDeadline: number;
    scoreBelowThreshold: number;
    total: number;
  };
  totalQualified: number;
  configuredLimit: number;
  selectedCount: number;
  selectedOpportunities: RankedOpportunity[];
  automationRunId?: string;
  completedAt: Date;
}
