import { z } from 'zod';
import { CANDIDATE_GROUNDING_CONTRACT } from '../ai/prompts/groundingInstructions';
import { TailoredCoverLetterContent } from './types';

/**
 * Zod schema for structured cover letter generation.
 */
export const CoverLetterSchema: z.ZodType<TailoredCoverLetterContent> = z.object({
  senderInfo: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    date: z.string().describe('Formatted current date, e.g. November 26, 2026'),
  }),
  recipientInfo: z.object({
    hiringManager: z.string().optional().describe('Hiring Manager name or Hiring Team'),
    company: z.string(),
    companyLocation: z.string().optional(),
    roleTitle: z.string(),
  }),
  salutation: z.string().describe('Formal salutation, e.g. "Dear Hiring Team at [Company],"'),
  opening: z
    .string()
    .describe(
      'Compelling, non-generic opening paragraph stating the role applied for and connecting candidate verified background to company context.'
    ),
  bodyParagraphs: z
    .array(z.string())
    .describe(
      '2 to 3 substantive paragraphs explaining genuine relevant experience, citing verified projects and concrete skills.'
    ),
  callToAction: z
    .string()
    .describe('Professional, confident closing statement inviting technical interview or discussion.'),
  signOff: z.string().describe('Professional closing e.g. "Sincerely,\\n[Candidate Name]"'),
  fullLetterMarkdown: z.string().describe('Complete markdown document with letterhead and paragraphs.'),
  highlightedMatches: z
    .array(z.string())
    .describe('Summary list of verified candidate skills and experiences highlighted in the letter.'),
  flaggedGaps: z
    .array(z.string())
    .describe(
      'Any key job requirements unverified in the candidate profile. Never hallucinate skills to fill gaps.'
    ),
});

/**
 * Builds the prompt for tailored, human-sounding cover letter generation.
 */
export function buildCoverLetterPrompt(input: {
  candidateProfile: Record<string, any>;
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
  } | null;
  customInstructions?: string;
  tone?: string;
}): string {
  const { candidateProfile, job, jobEvaluation, customInstructions, tone } = input;

  return `
${CANDIDATE_GROUNDING_CONTRACT}

TASK:
You are an expert career strategist and executive copywriter. Write an authentic, compelling, highly customized cover letter for the candidate targeting the specific job opportunity below.

TARGET OPPORTUNITY:
- Role Title: ${job.title}
- Company: ${job.company}
- Location / Arrangement: ${job.location || 'Remote'} (${job.workArrangement || 'Remote'})
- Required / Key Skills: ${JSON.stringify(job.skills || [])}

JOB DESCRIPTION:
${job.description.slice(0, 5000)}

${
  jobEvaluation
    ? `EVALUATION CONTEXT:
- Match Score: ${jobEvaluation.overallMatchScore}/100
- Verified Strengths: ${JSON.stringify(jobEvaluation.strengths)}
- Missing / Unverified Qualifications: ${JSON.stringify(jobEvaluation.missingQualifications)}`
    : ''
}

VERIFIED CANDIDATE PROFILE (STRICT SOURCE OF TRUTH):
${JSON.stringify(candidateProfile, null, 2)}

${
  customInstructions
    ? `ADDITIONAL CANDIDATE INSTRUCTIONS:
${customInstructions}`
    : ''
}

TONE & STYLE REQUIREMENTS:
1. NATURAL HUMAN VOICE:
   - Write like a thoughtful, experienced software professional speaking to peer engineers or engineering leaders.
   - AVOID ALL AI CLICHÉS:
     * Never write: "I am thrilled / delighted / eager to apply..."
     * Never write: "In today's fast-paced digital world / landscape..."
     * Never write: "A testament to my ability..."
     * Never write: "My unique blend of skills..."
     * Never write: "Spearheaded a paradigm shift..."
     * Never write: "Allow me to delve into..."
   - Open directly with context and relevance: What caught the candidate's attention about ${job.company}'s mission, technical challenges, or engineering approach.
2. STRICT TRUTHFULNESS & GROUNDING:
   - Only reference companies, degrees, years of experience, and projects that exist in the verified profile.
   - Do NOT invent metrics, revenue numbers, team sizes, or non-existent roles.
   - If the job demands a tool or qualification the candidate does not have, DO NOT claim proficiency. Instead, place it in "flaggedGaps".
3. SUBSTANTIVE DEMONSTRATION OF VALUE:
   - Highlight 1-2 concrete projects or responsibilities from the candidate's genuine background.
   - Explain how those practical experiences solve the exact technical challenges highlighted in the job description.
4. STRUCTURE:
   - Header with candidate contact info and date.
   - Addressed to Hiring Team or Manager at ${job.company}.
   - Opening: 1 crisp paragraph connecting candidate background to the role.
   - Body Paragraph 1: Direct alignment of genuine work experience with the core responsibilities.
   - Body Paragraph 2: Spotlight on a relevant verified project, architecture, or technical accomplishment.
   - Closing / Call to Action: Professional invitation to connect and discuss technical contributions.
   - Sign-off: "Sincerely," followed by candidate's full name.

Return valid JSON adhering strictly to the requested schema.
`.trim();
}

/**
 * Formats TailoredCoverLetterContent into clean Markdown for rendering and editing.
 */
export function formatCoverLetterToMarkdown(letter: TailoredCoverLetterContent): string {
  const parts: string[] = [];

  // Header / Letterhead
  parts.push(`# ${letter.senderInfo.fullName}`);
  const contactLine = [
    letter.senderInfo.email,
    letter.senderInfo.phone,
    letter.senderInfo.location,
  ]
    .filter(Boolean)
    .join(' | ');
  if (contactLine) parts.push(contactLine);
  parts.push('');

  // Date
  parts.push(`**Date:** ${letter.senderInfo.date}`);
  parts.push('');

  // Recipient
  parts.push(`**To:** ${letter.recipientInfo.hiringManager || 'Hiring Team'}`);
  parts.push(`**Company:** ${letter.recipientInfo.company}`);
  if (letter.recipientInfo.companyLocation) {
    parts.push(`**Location:** ${letter.recipientInfo.companyLocation}`);
  }
  parts.push(`**Position:** ${letter.recipientInfo.roleTitle}`);
  parts.push('---');
  parts.push('');

  // Salutation
  parts.push(letter.salutation);
  parts.push('');

  // Opening
  parts.push(letter.opening);
  parts.push('');

  // Body Paragraphs
  for (const para of letter.bodyParagraphs) {
    parts.push(para);
    parts.push('');
  }

  // Call to Action
  parts.push(letter.callToAction);
  parts.push('');

  // Sign Off
  parts.push(letter.signOff);
  parts.push('');

  // Flagged Information Gaps if present
  if (letter.flaggedGaps && letter.flaggedGaps.length > 0) {
    parts.push('---');
    parts.push('### ⚠️ Flagged Information Gaps (Manual Confirmation Required)');
    for (const gap of letter.flaggedGaps) {
      parts.push(`- ${gap}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
