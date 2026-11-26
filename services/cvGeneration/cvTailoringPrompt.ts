import { z } from 'zod';
import { CANDIDATE_GROUNDING_CONTRACT } from '../ai/prompts/groundingInstructions';
import { TailoredCVContent } from './types';

/**
 * Strict Zod schema for structured tailored CV generation.
 */
export const TailoredCVSchema: z.ZodType<TailoredCVContent> = z.object({
  personalInfo: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedInUrl: z.string().optional(),
    portfolioUrl: z.string().optional(),
    targetTitle: z.string().describe('Target job title tailored to the opening'),
  }),
  professionalSummary: z
    .string()
    .describe(
      'Targeted professional summary emphasizing candidate qualifications relevant to this role. Strictly grounded in verified profile.'
    ),
  skills: z
    .array(
      z.object({
        category: z.string().describe('Skill category, e.g. Core AI & LLMs, Backend & APIs'),
        skills: z
          .array(z.string())
          .describe('Prioritized list of candidate verified skills matching this role'),
      })
    )
    .describe('Categorized technical skills matching job requirements'),
  workExperience: z.array(
    z.object({
      company: z.string(),
      position: z.string(),
      location: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
      isCurrentRole: z.boolean(),
      employmentType: z.string().optional(),
      highlights: z
        .array(z.string())
        .describe(
          'Factual bullet points highlighting relevant achievements. Must be derived strictly from verified responsibilities/achievements without inventing new facts or unverified metrics.'
        ),
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      projectUrl: z.string().optional(),
      highlights: z.array(z.string()).optional(),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      fieldOfStudy: z.string(),
      startDate: z.string(),
      graduationDate: z.string(),
      academicDetails: z.string().optional(),
    })
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuingOrganization: z.string(),
      dateObtained: z.string(),
      credentialUrl: z.string().optional(),
    })
  ),
  flaggedGaps: z
    .array(z.string())
    .describe(
      'Any mandatory or preferred job requirements that are NOT verified in the candidate profile or need manual candidate confirmation. Never hallucinate skills to fill these gaps.'
    ),
  tailoringRationale: z
    .string()
    .describe('Brief explanation of how verified candidate facts were prioritized for this specific opportunity.'),
});

export type TailoredCVSchemaType = z.infer<typeof TailoredCVSchema>;

/**
 * Builds the prompt for tailored CV generation.
 */
export function buildCVTailoringPrompt(input: {
  candidateProfile: Record<string, any>;
  originalCVText?: string | null;
  job: {
    title: string;
    company: string;
    description: string;
    skills?: string[];
    workArrangement?: string;
    experienceLevel?: string;
  };
  jobEvaluation?: {
    overallMatchScore: number;
    eligibility: string;
    strengths: string[];
    missingQualifications: string[];
  } | null;
  customInstructions?: string;
}): string {
  const {
    candidateProfile,
    originalCVText,
    job,
    jobEvaluation,
    customInstructions,
  } = input;

  return `
${CANDIDATE_GROUNDING_CONTRACT}

TASK:
You are an expert executive resume writer and ATS optimization specialist.
Generate a professionally tailored CV for the candidate specifically targeted at the job opportunity below.

TARGET JOB OPPORTUNITY:
- Title: ${job.title}
- Company: ${job.company}
- Arrangement: ${job.workArrangement || 'Remote'}
- Experience Level: ${job.experienceLevel || 'Not specified'}
- Required / Key Skills: ${JSON.stringify(job.skills || [])}

JOB DESCRIPTION:
${job.description.slice(0, 5000)}

${
  jobEvaluation
    ? `JOB EVALUATION CONTEXT:
- Match Score: ${jobEvaluation.overallMatchScore}/100
- Candidate Strengths: ${JSON.stringify(jobEvaluation.strengths)}
- Missing / Unverified Qualifications: ${JSON.stringify(jobEvaluation.missingQualifications)}`
    : ''
}

VERIFIED CANDIDATE PROFILE (SOURCE OF TRUTH):
${JSON.stringify(candidateProfile, null, 2)}

${
  originalCVText
    ? `ORIGINAL CV EXCERPT (FOR CONTEXT & STYLE):
${originalCVText.slice(0, 3000)}`
    : ''
}

${
  customInstructions
    ? `ADDITIONAL CANDIDATE INSTRUCTIONS:
${customInstructions}`
    : ''
}

CRITICAL RULES FOR TAILORED CV GENERATION:
1. STRICT FACTUAL ACCURACY:
   - Every role, company name, employment date, degree, and certification MUST match the verified candidate profile exactly.
   - Do NOT invent companies, job titles, or dates.
   - Do NOT invent projects or tools that the candidate does not have in their verified profile.
   - Do NOT fabricate unverified percentage improvements, revenue numbers, or metrics that are not in the candidate's responsibilities or achievements.
2. RELEVANCE & PRIORITIZATION:
   - Craft a compelling, targeted professional summary that connects the candidate's actual background directly to the needs of ${job.company}.
   - Prioritize skills matching the job description at the top of the technical skills categories.
   - Reorder and emphasize bullet points in work experience and projects that align with the job's core responsibilities.
3. FLAGGED GAPS:
   - If the job description asks for qualifications, languages, or domain expertise that the candidate does not possess in their verified profile, DO NOT invent them.
   - Add them to the "flaggedGaps" array so the candidate is aware and can address them manually.
4. ATS-FRIENDLY STRUCTURE:
   - Output clear, active bullet points (using strong action verbs like Developed, Architected, Engineered, Implemented, Spearheaded).
   - Ensure clean readability and structured sections.

Return valid JSON adhering strictly to the requested schema.
`.trim();
}

/**
 * Converts TailoredCVContent into structured Markdown text for human review and editing.
 */
export function formatCVToMarkdown(cv: TailoredCVContent): string {
  const parts: string[] = [];

  // Header
  parts.push(`# ${cv.personalInfo.fullName}`);
  parts.push(`**${cv.personalInfo.targetTitle}**`);
  const contactItems = [
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.location,
    cv.personalInfo.linkedInUrl,
    cv.personalInfo.portfolioUrl,
  ].filter(Boolean);
  parts.push(contactItems.join(' | '));
  parts.push('');

  // Professional Summary
  parts.push('## Professional Summary');
  parts.push(cv.professionalSummary);
  parts.push('');

  // Technical Skills
  if (cv.skills && cv.skills.length > 0) {
    parts.push('## Technical Skills');
    for (const group of cv.skills) {
      parts.push(`- **${group.category}**: ${group.skills.join(', ')}`);
    }
    parts.push('');
  }

  // Work Experience
  if (cv.workExperience && cv.workExperience.length > 0) {
    parts.push('## Professional Experience');
    for (const exp of cv.workExperience) {
      const dates = `${exp.startDate} - ${exp.isCurrentRole ? 'Present' : exp.endDate}`;
      const locStr = exp.location ? ` | ${exp.location}` : '';
      parts.push(`### ${exp.position} - ${exp.company}${locStr}`);
      parts.push(`*${dates}*`);
      parts.push('');
      for (const h of exp.highlights) {
        parts.push(`- ${h}`);
      }
      parts.push('');
    }
  }

  // Key Projects
  if (cv.projects && cv.projects.length > 0) {
    parts.push('## Key Projects');
    for (const proj of cv.projects) {
      const techStr = proj.technologies.length > 0 ? ` (${proj.technologies.join(', ')})` : '';
      const urlStr = proj.projectUrl ? ` [Link](${proj.projectUrl})` : '';
      parts.push(`### ${proj.name}${techStr}${urlStr}`);
      parts.push(proj.description);
      if (proj.highlights && proj.highlights.length > 0) {
        for (const h of proj.highlights) {
          parts.push(`- ${h}`);
        }
      }
      parts.push('');
    }
  }

  // Education
  if (cv.education && cv.education.length > 0) {
    parts.push('## Education');
    for (const edu of cv.education) {
      parts.push(`### ${edu.degree} in ${edu.fieldOfStudy}`);
      parts.push(`**${edu.institution}** | ${edu.startDate} - ${edu.graduationDate}`);
      if (edu.academicDetails) {
        parts.push(edu.academicDetails);
      }
      parts.push('');
    }
  }

  // Certifications
  if (cv.certifications && cv.certifications.length > 0) {
    parts.push('## Certifications');
    for (const cert of cv.certifications) {
      const urlStr = cert.credentialUrl ? ` [Credential](${cert.credentialUrl})` : '';
      parts.push(`- **${cert.name}** - ${cert.issuingOrganization} (${cert.dateObtained})${urlStr}`);
    }
    parts.push('');
  }

  // Flagged Information Gaps
  if (cv.flaggedGaps && cv.flaggedGaps.length > 0) {
    parts.push('---');
    parts.push('### ⚠️ Flagged Information Gaps (Manual Confirmation Required)');
    for (const gap of cv.flaggedGaps) {
      parts.push(`- ${gap}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
