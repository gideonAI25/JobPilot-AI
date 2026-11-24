import {
  EvaluationWeights,
  DEFAULT_EVALUATION_WEIGHTS,
  EvaluationDimensionScores,
  EligibilityStatus,
  Recommendation,
} from './types';

/**
 * Normalizes user-supplied weights to guarantee they sum to 1.0.
 */
export function normalizeWeights(weights?: Partial<EvaluationWeights>): EvaluationWeights {
  const merged: EvaluationWeights = {
    skillsMatch: weights?.skillsMatch ?? DEFAULT_EVALUATION_WEIGHTS.skillsMatch,
    roleRelevance: weights?.roleRelevance ?? DEFAULT_EVALUATION_WEIGHTS.roleRelevance,
    experienceFit: weights?.experienceFit ?? DEFAULT_EVALUATION_WEIGHTS.experienceFit,
    locationEligibility: weights?.locationEligibility ?? DEFAULT_EVALUATION_WEIGHTS.locationEligibility,
    jobFreshness: weights?.jobFreshness ?? DEFAULT_EVALUATION_WEIGHTS.jobFreshness,
  };

  const total =
    merged.skillsMatch +
    merged.roleRelevance +
    merged.experienceFit +
    merged.locationEligibility +
    merged.jobFreshness;

  if (total <= 0) {
    return { ...DEFAULT_EVALUATION_WEIGHTS };
  }

  // Normalize so sum is exactly 1.0
  return {
    skillsMatch: merged.skillsMatch / total,
    roleRelevance: merged.roleRelevance / total,
    experienceFit: merged.experienceFit / total,
    locationEligibility: merged.locationEligibility / total,
    jobFreshness: merged.jobFreshness / total,
  };
}

/**
 * Calculates a deterministic job freshness score (0 - 100) based on listing age.
 * - <= 3 days: 100
 * - <= 7 days: 90
 * - <= 14 days: 75
 * - <= 30 days: 55
 * - > 30 days: 30
 */
export function calculateJobFreshnessScore(
  postedAt?: Date | string | null,
  discoveredAt?: Date | string | null
): number {
  const rawDate = postedAt || discoveredAt || new Date();
  const d = new Date(rawDate);
  const now = new Date();

  const diffMs = now.getTime() - d.getTime();
  const ageInDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

  if (ageInDays <= 3) return 100;
  if (ageInDays <= 7) return 90;
  if (ageInDays <= 14) return 75;
  if (ageInDays <= 30) return 55;
  return 30;
}

/**
 * Deterministically calculates the overall weighted match score and recommendation.
 * Enforces strict compliance with eligibility rules:
 * - Ineligible jobs cannot receive recommendation other than NOT_RECOMMENDED.
 * - Unclear eligibility jobs cannot receive STRONG_MATCH.
 */
export function aggregateEvaluationScore(
  dimensions: EvaluationDimensionScores,
  weights: EvaluationWeights,
  eligibility: EligibilityStatus
): {
  overallScore: number;
  recommendation: Recommendation;
  decisionExplanation: string;
} {
  // Enforce Rule 4: Clearly ineligible jobs must not proceed to application preparation
  if (eligibility === 'INELIGIBLE') {
    const rawCappedScore = Math.min(
      35,
      Math.round(
        dimensions.skillsMatch * weights.skillsMatch +
        dimensions.roleRelevance * weights.roleRelevance
      )
    );

    return {
      overallScore: rawCappedScore,
      recommendation: 'NOT_RECOMMENDED',
      decisionExplanation:
        'Opportunity is ineligible for candidate location/authorization (Nigeria). Regardless of skill or experience alignment, ineligible jobs are classified as NOT_RECOMMENDED and blocked from application preparation.',
    };
  }

  // Standard weighted deterministic calculation
  const weightedTotal =
    dimensions.skillsMatch * weights.skillsMatch +
    dimensions.roleRelevance * weights.roleRelevance +
    dimensions.experienceFit * weights.experienceFit +
    dimensions.locationEligibility * weights.locationEligibility +
    dimensions.jobFreshness * weights.jobFreshness;

  const overallScore = Math.min(100, Math.max(0, Math.round(weightedTotal)));

  // Recommendation logic enforcing Rule 3: Do not treat unclear eligibility as confirmed eligibility
  let recommendation: Recommendation;
  let decisionExplanation: string;

  if (eligibility === 'UNCLEAR') {
    if (overallScore >= 55) {
      recommendation = 'POSSIBLE_MATCH';
      decisionExplanation =
        `Candidate shows promising technical match (${overallScore}%), but geographical eligibility for Nigeria is unverified and requires manual confirmation before preparing applications.`;
    } else {
      recommendation = 'NOT_RECOMMENDED';
      decisionExplanation =
        `Moderate score (${overallScore}%) combined with ambiguous geographical eligibility does not justify an application.`;
    }
  } else {
    // Confirmed ELIGIBLE
    if (overallScore >= 75) {
      recommendation = 'STRONG_MATCH';
      decisionExplanation =
        `Strong competitive match (${overallScore}%) with verified candidate eligibility for Nigeria. Highly qualified across core responsibilities and seniority.`;
    } else if (overallScore >= 50) {
      recommendation = 'POSSIBLE_MATCH';
      decisionExplanation =
        `Viable match (${overallScore}%) with confirmed geographical eligibility, though some secondary qualifications or experience gaps exist.`;
    } else {
      recommendation = 'NOT_RECOMMENDED';
      decisionExplanation =
        `Low overall alignment (${overallScore}%). Missing critical required qualifications or seniority mismatch.`;
    }
  }

  return {
    overallScore,
    recommendation,
    decisionExplanation,
  };
}
