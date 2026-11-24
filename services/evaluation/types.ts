export type EligibilityStatus = 'ELIGIBLE' | 'UNCLEAR' | 'INELIGIBLE';

export type Recommendation = 'STRONG_MATCH' | 'POSSIBLE_MATCH' | 'NOT_RECOMMENDED';

export interface EvaluationWeights {
  skillsMatch: number; // Default: 0.30 (30%)
  roleRelevance: number; // Default: 0.25 (25%)
  experienceFit: number; // Default: 0.15 (15%)
  locationEligibility: number; // Default: 0.20 (20%)
  jobFreshness: number; // Default: 0.10 (10%)
}

export const DEFAULT_EVALUATION_WEIGHTS: EvaluationWeights = {
  skillsMatch: 0.30,
  roleRelevance: 0.25,
  experienceFit: 0.15,
  locationEligibility: 0.20,
  jobFreshness: 0.10,
};

export interface EvaluationDimensionScores {
  skillsMatch: number; // 0 - 100
  roleRelevance: number; // 0 - 100
  experienceFit: number; // 0 - 100
  locationEligibility: number; // 0 - 100
  jobFreshness: number; // 0 - 100
}

export interface JobEvaluationResult {
  id?: string;
  jobId: string;
  profileId: string;
  overallMatchScore: number; // 0 - 100 (deterministic weighted aggregation)
  scoringDimensions: EvaluationDimensionScores;
  weightsUsed: EvaluationWeights;
  eligibility: EligibilityStatus;
  recommendation: Recommendation;
  relevantQualifications: string[];
  missingQualifications: string[];
  experienceAssessment: string;
  eligibilityExplanation: string;
  potentialConcerns: string[];
  explanation: string;
  evaluatedAt: Date;
  isEligible: boolean;
  requiresManualConfirmation: boolean;
}

export interface EvaluationOptions {
  profileId?: string;
  weights?: Partial<EvaluationWeights>;
  forceReevaluate?: boolean;
  aiProviderId?: string;
}
