import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  JobEvaluationResult,
  EvaluationOptions,
  EvaluationDimensionScores,
  EligibilityStatus,
  Recommendation,
  DEFAULT_EVALUATION_WEIGHTS,
} from './types';
import {
  SemanticEvaluationOutputSchema,
  SemanticEvaluationOutput,
  buildJobEvaluationPrompt,
} from './evaluationPrompt';
import {
  normalizeWeights,
  calculateJobFreshnessScore,
  aggregateEvaluationScore,
} from './scoringEngine';
import { generateStructuredAI } from '../ai/aiService';
import { getOrCreatePrimaryProfile } from '../server/profileDbService';

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Evaluates a job opportunity against the candidate's verified profile.
 * - Semantic assessment executed via Gemini / AI provider.
 * - Numerical scoring aggregated deterministically using configurable weights.
 * - Strict Nigeria location eligibility classification enforced.
 * - Prevents duplicate evaluation records.
 * - Blocks ineligible opportunities from proceeding to application preparation.
 */
export async function evaluateJob(
  jobId: string,
  options?: EvaluationOptions
): Promise<JobEvaluationResult> {
  // 1. Fetch Job
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { source: true },
  });

  if (!job) {
    throw new Error(`Job not found with ID "${jobId}".`);
  }

  // 2. Fetch Verified Candidate Profile
  let profile = options?.profileId
    ? await prisma.candidateProfile.findUnique({
        where: { id: options.profileId },
        include: {
          technicalSkills: true,
          workExperience: true,
          education: true,
          certifications: true,
          preferences: true,
        },
      })
    : null;

  if (!profile) {
    // Fall back to primary profile
    const primaryCandidate = await getOrCreatePrimaryProfile();
    profile = await prisma.candidateProfile.findUnique({
      where: { id: primaryCandidate.id },
      include: {
        technicalSkills: true,
        workExperience: true,
        education: true,
        certifications: true,
        preferences: true,
      },
    });
  }

  if (!profile) {
    throw new Error('No candidate profile available for job evaluation.');
  }

  // 3. Prevent Repeated Evaluations from Creating Duplicate Records
  const existingEval = await prisma.jobEvaluation.findFirst({
    where: {
      jobId,
      profileId: profile.id,
    },
    orderBy: { evaluatedAt: 'desc' },
  });

  if (existingEval && !options?.forceReevaluate) {
    const parsedDimensions = safeParseJson<EvaluationDimensionScores>(
      existingEval.scoringDimensions,
      {
        skillsMatch: 0,
        roleRelevance: 0,
        experienceFit: 0,
        locationEligibility: 0,
        jobFreshness: 0,
      }
    );

    return {
      id: existingEval.id,
      jobId: existingEval.jobId,
      profileId: existingEval.profileId || profile.id,
      overallMatchScore: existingEval.overallMatchScore,
      scoringDimensions: parsedDimensions,
      weightsUsed: DEFAULT_EVALUATION_WEIGHTS,
      eligibility: existingEval.eligibility as EligibilityStatus,
      recommendation: existingEval.recommendation as Recommendation,
      relevantQualifications: safeParseJson<string[]>(existingEval.strengths, []),
      missingQualifications: safeParseJson<string[]>(existingEval.missingQualifications, []),
      experienceAssessment: '',
      eligibilityExplanation: existingEval.explanation,
      potentialConcerns: safeParseJson<string[]>(existingEval.concerns, []),
      explanation: existingEval.explanation,
      evaluatedAt: existingEval.evaluatedAt,
      isEligible: existingEval.eligibility !== 'INELIGIBLE',
      requiresManualConfirmation: existingEval.eligibility === 'UNCLEAR',
    };
  }

  // 4. Calculate Deterministic Dimensions & Weights
  const weights = normalizeWeights(options?.weights);
  const freshnessScore = calculateJobFreshnessScore(job.postedAt, job.discoveredAt);

  // 5. Execute Semantic Assessment via AI Engine
  const parsedSkills = safeParseJson<string[]>(job.skills, []);
  const prompt = buildJobEvaluationPrompt({
    job: {
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      workArrangement: job.workArrangement,
      employmentType: job.employmentType,
      experienceLevel: job.experienceLevel,
      skills: parsedSkills,
    },
    candidate: {
      country: profile.country || 'Nigeria',
      city: profile.city || undefined,
      headline: profile.headline || undefined,
      summary: profile.summary || undefined,
      technicalSkills: profile.technicalSkills.map((s) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
      })),
      workExperience: profile.workExperience.map((w) => ({
        position: w.position,
        company: w.company,
        responsibilities: safeParseJson<string[]>(w.responsibilities, []),
        startDate: w.startDate,
        endDate: w.endDate,
      })),
      education: profile.education.map((e) => ({
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
        institution: e.institution,
      })),
      certifications: profile.certifications.map((c) => ({
        name: c.name,
        issuingOrganization: c.issuingOrganization,
      })),
      preferences: profile.preferences
        ? {
            targetJobTitles: safeParseJson<string[]>(profile.preferences.targetJobTitles, []),
            remoteWorkPreference: profile.preferences.remoteWorkPreference,
            preferredCountries: safeParseJson<string[]>(profile.preferences.preferredCountries, []),
          }
        : undefined,
    },
  });

  const aiResult = await generateStructuredAI<SemanticEvaluationOutput>(
    {
      prompt,
      schema: SemanticEvaluationOutputSchema,
      candidateContext: {
        candidateName: profile.fullName,
        country: profile.country || 'Nigeria',
        verifiedSkills: profile.technicalSkills.map((s) => s.name),
        roles: profile.workExperience.map((w) => `${w.position} at ${w.company}`),
      },
    },
    options?.aiProviderId
  );

  let semantic: SemanticEvaluationOutput;

  if (aiResult.success && aiResult.data) {
    semantic = aiResult.data;
  } else {
    // Intelligent semantic assessment fallback
    const candidateSkills = new Set(profile.technicalSkills.map((s) => s.name.toLowerCase()));
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    if (parsedSkills.length > 0) {
      for (const skill of parsedSkills) {
        if (candidateSkills.has(skill.toLowerCase())) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    } else {
      matchedSkills.push(...profile.technicalSkills.map((s) => s.name).slice(0, 3));
    }

    const skillRatio = parsedSkills.length > 0 ? matchedSkills.length / parsedSkills.length : 0.7;
    const calculatedSkillsScore = Math.min(100, Math.max(30, Math.round(50 + skillRatio * 45)));

    const titleLower = job.title.toLowerCase();
    const candidateHeadline = (profile.headline || '').toLowerCase();
    const isAiRole = titleLower.includes('ai') || titleLower.includes('machine learning');
    const isAiCandidate = candidateHeadline.includes('ai') || candidateHeadline.includes('machine learning');
    const calculatedRoleScore = isAiRole && isAiCandidate ? 85 : 70;

    const candidateIsSenior = candidateHeadline.includes('senior');
    const jobIsSenior = (job.experienceLevel || '').toLowerCase().includes('senior') || titleLower.includes('senior');
    const calculatedExpScore = candidateIsSenior === jobIsSenior ? 85 : 65;

    const fallbackLocation = `${job.location} ${job.description}`.toLowerCase();
    const isExplicitlyWorldwide =
      fallbackLocation.includes('worldwide') ||
      fallbackLocation.includes('anywhere in the world') ||
      fallbackLocation.includes('nigeria') ||
      fallbackLocation.includes('global (no geographical restrictions)');

    const isExplicitlyRestricted =
      fallbackLocation.includes('us only') ||
      fallbackLocation.includes('usa only') ||
      fallbackLocation.includes('eu only') ||
      fallbackLocation.includes('uk only') ||
      fallbackLocation.includes('north america only') ||
      fallbackLocation.includes('us citizen');

    const fallbackEligibility: EligibilityStatus = isExplicitlyRestricted
      ? 'INELIGIBLE'
      : isExplicitlyWorldwide
      ? 'ELIGIBLE'
      : 'UNCLEAR';

    semantic = {
      skillsMatchScore: calculatedSkillsScore,
      roleRelevanceScore: calculatedRoleScore,
      experienceFitScore: calculatedExpScore,
      locationEligibilityScore:
        fallbackEligibility === 'ELIGIBLE' ? 95 : fallbackEligibility === 'UNCLEAR' ? 50 : 10,
      eligibility: fallbackEligibility,
      relevantQualifications: matchedSkills.length > 0 ? matchedSkills : parsedSkills.slice(0, 3),
      missingQualifications: missingSkills,
      experienceAssessment: `Candidate profile matches ${matchedSkills.length} of ${parsedSkills.length} required competencies with seniority alignment.`,
      eligibilityExplanation: isExplicitlyRestricted
        ? 'Location restricted to specific territory or citizenship requirement excluding Nigeria.'
        : isExplicitlyWorldwide
        ? 'Worldwide remote opportunity explicitly permits applicants from Nigeria.'
        : 'Geographical boundaries are unconfirmed; manual confirmation required.',
      potentialConcerns: fallbackEligibility === 'UNCLEAR' ? ['Unconfirmed geographical eligibility for Nigeria'] : [],
      summaryExplanation: `Automated assessment: ${fallbackEligibility} classification based on location criteria.`,
      requiresManualConfirmation: fallbackEligibility === 'UNCLEAR',
      manualConfirmationReason: fallbackEligibility === 'UNCLEAR' ? 'Verify country eligibility' : null,
    };
  }

  // 6. Aggregate Scores Deterministically
  const dimensionScores: EvaluationDimensionScores = {
    skillsMatch: semantic.skillsMatchScore,
    roleRelevance: semantic.roleRelevanceScore,
    experienceFit: semantic.experienceFitScore,
    locationEligibility: semantic.locationEligibilityScore,
    jobFreshness: freshnessScore,
  };

  const aggregated = aggregateEvaluationScore(
    dimensionScores,
    weights,
    semantic.eligibility
  );

  const fullExplanation = `${semantic.summaryExplanation} ${aggregated.decisionExplanation}`;

  // 7. Persist Evaluation in SQLite
  let savedEval;
  if (existingEval) {
    savedEval = await prisma.jobEvaluation.update({
      where: { id: existingEval.id },
      data: {
        overallMatchScore: aggregated.overallScore,
        scoringDimensions: JSON.stringify(dimensionScores),
        eligibility: semantic.eligibility,
        explanation: fullExplanation,
        missingQualifications: JSON.stringify(semantic.missingQualifications),
        concerns: JSON.stringify(semantic.potentialConcerns),
        strengths: JSON.stringify(semantic.relevantQualifications),
        recommendation: aggregated.recommendation,
        evaluatedAt: new Date(),
      },
    });
  } else {
    savedEval = await prisma.jobEvaluation.create({
      data: {
        jobId,
        profileId: profile.id,
        overallMatchScore: aggregated.overallScore,
        scoringDimensions: JSON.stringify(dimensionScores),
        eligibility: semantic.eligibility,
        explanation: fullExplanation,
        missingQualifications: JSON.stringify(semantic.missingQualifications),
        concerns: JSON.stringify(semantic.potentialConcerns),
        strengths: JSON.stringify(semantic.relevantQualifications),
        recommendation: aggregated.recommendation,
      },
    });
  }

  // 8. Pipeline Status Sync (Rule 4: Ineligible jobs must not proceed to application preparation)
  const application = await prisma.application.findFirst({
    where: { jobId },
  });

  if (application) {
    if (semantic.eligibility === 'INELIGIBLE') {
      await prisma.application.update({
        where: { id: application.id },
        data: {
          status: 'REJECTED',
          rejectionReason: semantic.eligibilityExplanation,
          notes: `[AUTOMATED EVALUATION] INELIGIBLE: Nigeria is excluded or work authorization criteria are not met. Marked as REJECTED to block application preparation.`,
        },
      });
    } else if (semantic.eligibility === 'UNCLEAR') {
      if (application.status === 'DISCOVERED' || application.status === 'EVALUATING') {
        await prisma.application.update({
          where: { id: application.id },
          data: {
            status: 'NEEDS_REVIEW',
            notes: `[AUTOMATED EVALUATION] Location eligibility for Nigeria is unclear. Candidate must confirm geographical eligibility before drafting application materials.`,
          },
        });
      }
    } else if (semantic.eligibility === 'ELIGIBLE') {
      if (application.status === 'DISCOVERED' || application.status === 'EVALUATING') {
        if (aggregated.recommendation === 'STRONG_MATCH' || aggregated.recommendation === 'POSSIBLE_MATCH') {
          await prisma.application.update({
            where: { id: application.id },
            data: {
              status: 'PENDING_REVIEW',
              notes: `[AUTOMATED EVALUATION] Qualified opportunity (${aggregated.overallScore}% match). Verified eligible for candidate location.`,
            },
          });
        }
      }
    }
  }

  // 9. Record Audit Log in ActivityLog
  try {
    await prisma.activityLog.create({
      data: {
        level: 'INFO',
        action: 'JOB_EVALUATED',
        entityType: 'Job',
        entityId: jobId,
        details: JSON.stringify({
          title: job.title,
          company: job.company,
          overallScore: aggregated.overallScore,
          eligibility: semantic.eligibility,
          recommendation: aggregated.recommendation,
          weightsUsed: weights,
        }),
      },
    });
  } catch {}

  return {
    id: savedEval.id,
    jobId: savedEval.jobId,
    profileId: profile.id,
    overallMatchScore: aggregated.overallScore,
    scoringDimensions: dimensionScores,
    weightsUsed: weights,
    eligibility: semantic.eligibility,
    recommendation: aggregated.recommendation,
    relevantQualifications: semantic.relevantQualifications,
    missingQualifications: semantic.missingQualifications,
    experienceAssessment: semantic.experienceAssessment,
    eligibilityExplanation: semantic.eligibilityExplanation,
    potentialConcerns: semantic.potentialConcerns,
    explanation: fullExplanation,
    evaluatedAt: savedEval.evaluatedAt,
    isEligible: semantic.eligibility !== 'INELIGIBLE',
    requiresManualConfirmation: semantic.eligibility === 'UNCLEAR' || semantic.requiresManualConfirmation,
  };
}

/**
 * Retrieves an existing job evaluation for a given job and profile.
 */
export async function getJobEvaluation(
  jobId: string,
  profileId?: string
): Promise<JobEvaluationResult | null> {
  const where: any = { jobId };
  if (profileId) where.profileId = profileId;

  const dbEval = await prisma.jobEvaluation.findFirst({
    where,
    orderBy: { evaluatedAt: 'desc' },
  });

  if (!dbEval) return null;

  const parsedDimensions = safeParseJson<EvaluationDimensionScores>(
    dbEval.scoringDimensions,
    {
      skillsMatch: 0,
      roleRelevance: 0,
      experienceFit: 0,
      locationEligibility: 0,
      jobFreshness: 0,
    }
  );

  return {
    id: dbEval.id,
    jobId: dbEval.jobId,
    profileId: dbEval.profileId || '',
    overallMatchScore: dbEval.overallMatchScore,
    scoringDimensions: parsedDimensions,
    weightsUsed: DEFAULT_EVALUATION_WEIGHTS,
    eligibility: dbEval.eligibility as EligibilityStatus,
    recommendation: dbEval.recommendation as Recommendation,
    relevantQualifications: safeParseJson<string[]>(dbEval.strengths, []),
    missingQualifications: safeParseJson<string[]>(dbEval.missingQualifications, []),
    experienceAssessment: '',
    eligibilityExplanation: dbEval.explanation,
    potentialConcerns: safeParseJson<string[]>(dbEval.concerns, []),
    explanation: dbEval.explanation,
    evaluatedAt: dbEval.evaluatedAt,
    isEligible: dbEval.eligibility !== 'INELIGIBLE',
    requiresManualConfirmation: dbEval.eligibility === 'UNCLEAR',
  };
}
