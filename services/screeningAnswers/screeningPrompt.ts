import { z } from 'zod';
import { CANDIDATE_GROUNDING_CONTRACT } from '../ai/prompts/groundingInstructions';
import { ScreeningQuestionAnswer } from './types';

/**
 * Zod schema for individual screening question answer item.
 */
export const ScreeningQuestionAnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: z.enum([
    'General',
    'Experience',
    'Technical',
    'Motivation',
    'Salary',
    'Work Authorization',
    'Availability',
    'Role-Specific',
  ]),
  answer: z.string(),
  source: z.enum(['VERIFIED_STANDARD', 'AI_DRAFTED', 'MANUAL_REQUIRED']),
  isVerified: z.boolean(),
  requiresConfirmation: z.boolean(),
  confirmationReason: z.string().optional().default(''),
});

export const ScreeningAnswersSchema = z.object({
  summary: z.string().describe('Brief summary of drafted answers and flagged items needing confirmation.'),
  items: z.array(ScreeningQuestionAnswerSchema),
});

export type ScreeningAnswersSchemaType = z.infer<typeof ScreeningAnswersSchema>;

/**
 * Builds the prompt for AI screening question assistance.
 */
export function buildScreeningAnswersPrompt(input: {
  candidateProfile: Record<string, any>;
  existingStandardAnswers: Array<{ id: string; question: string; answer: string; category: string }>;
  employmentPreferences?: Record<string, any> | null;
  job: {
    title: string;
    company: string;
    description: string;
    skills?: string[];
    location?: string;
    workArrangement?: string;
  };
  jobEvaluation?: {
    overallMatchScore: number;
    strengths: string[];
    missingQualifications: string[];
    eligibility?: string;
  } | null;
  customInstructions?: string;
}): string {
  const {
    candidateProfile,
    existingStandardAnswers,
    employmentPreferences,
    job,
    jobEvaluation,
    customInstructions,
  } = input;

  return `
${CANDIDATE_GROUNDING_CONTRACT}

TASK:
You are an expert technical recruiter and career coach assistant for JobPilot AI.
Your objective is to prepare honest, well-crafted, job-specific answers for common application screening questions for the candidate targeting the job opportunity below.

TARGET JOB OPPORTUNITY:
- Role Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || 'Remote'} (${job.workArrangement || 'Remote'})
- Required Skills: ${JSON.stringify(job.skills || [])}

JOB DESCRIPTION:
${job.description.slice(0, 5000)}

${
  jobEvaluation
    ? `EVALUATION CONTEXT:
- Match Score: ${jobEvaluation.overallMatchScore}/100
- Eligibility: ${jobEvaluation.eligibility || 'ELIGIBLE'}
- Candidate Strengths: ${JSON.stringify(jobEvaluation.strengths)}
- Missing Qualifications: ${JSON.stringify(jobEvaluation.missingQualifications)}`
    : ''
}

VERIFIED CANDIDATE PROFILE (GROUND TRUTH):
${JSON.stringify(candidateProfile, null, 2)}

VERIFIED STANDARD ANSWERS ON FILE:
${JSON.stringify(existingStandardAnswers, null, 2)}

EMPLOYMENT PREFERENCES (SALARY & AVAILABILITY):
${JSON.stringify(employmentPreferences || {}, null, 2)}

${
  customInstructions
    ? `ADDITIONAL CANDIDATE INSTRUCTIONS:
${customInstructions}`
    : ''
}

QUESTIONS TO PREPARE ANSWERS FOR:
1. "Tell us about yourself." (Category: General)
2. "Why are you interested in this position at ${job.company}?" (Category: Motivation)
3. "Describe your relevant experience for the ${job.title} role." (Category: Experience)
4. "What key tools, technologies, and frameworks have you used in production?" (Category: Technical)
5. "What are your salary expectations?" (Category: Salary)
6. "Are you legally authorized to work in this location or remotely from your location?" (Category: Work Authorization)
7. "When are you available to start working, and what is your notice period?" (Category: Availability)
8. Plus 1 or 2 relevant Role-Specific questions derived directly from ${job.company}'s job requirements.

STRICT GROUNDING & INTEGRITY RULES:
1. TRUTHFULNESS:
   - For General, Motivation, Experience, and Technical questions: Craft authentic, concise (1-2 paragraphs) answers derived strictly from candidate's genuine profile, projects, and employment history. Set source: "AI_DRAFTED", isVerified: false, requiresConfirmation: false.
2. EXISTING VERIFIED STANDARD ANSWERS:
   - If an existing verified standard answer exists in "VERIFIED STANDARD ANSWERS ON FILE" that answers the question, use it or adapt it while preserving the verified answer. Set source: "VERIFIED_STANDARD", isVerified: true, requiresConfirmation: false.
3. SALARY EXPECTATIONS (NON-NEGOTIABLE):
   - ONLY cite salary numbers if explicitly specified in "EMPLOYMENT PREFERENCES" or in standard answers.
   - If salary expectation is NOT declared: DO NOT INVENT A NUMBER. Set answer to: "[Not specified in verified profile - please confirm your salary expectation before submitting]". Set source: "MANUAL_REQUIRED", isVerified: false, requiresConfirmation: true, confirmationReason: "Salary preference is not specified in your candidate profile.".
4. WORK AUTHORIZATION (NON-NEGOTIABLE):
   - Candidate location is Nigeria.
   - If the job permits worldwide remote work: State that the candidate is authorized to work remotely from Nigeria (e.g. as a contractor or full-time remote employee).
   - If the job explicitly requires domestic authorization (US/EU/UK only) or visa sponsorship that is unconfirmed: DO NOT CLAIM AUTHORIZATION. Set answer to: "[Requires personal confirmation - verify work authorization / visa sponsorship with employer]". Set source: "MANUAL_REQUIRED", isVerified: false, requiresConfirmation: true, confirmationReason: "Work authorization requirements for this location require candidate verification.".
5. AVAILABILITY & START DATE (NON-NEGOTIABLE):
   - If availability/notice period is in verified profile or standard answers, use it.
   - If availability is unknown: DO NOT GUESS. Set answer to: "[Requires personal confirmation - please provide your notice period or earliest start date]". Set source: "MANUAL_REQUIRED", isVerified: false, requiresConfirmation: true, confirmationReason: "Notice period or start date is not configured.".

Return valid JSON adhering strictly to the requested schema.
`.trim();
}
