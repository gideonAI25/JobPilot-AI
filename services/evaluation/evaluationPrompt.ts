import { z } from 'zod';

/**
 * Zod schema strictly validating Gemini's semantic evaluation output.
 */
export const SemanticEvaluationOutputSchema = z.object({
  skillsMatchScore: z.number().min(0).max(100),
  roleRelevanceScore: z.number().min(0).max(100),
  experienceFitScore: z.number().min(0).max(100),
  locationEligibilityScore: z.number().min(0).max(100),
  eligibility: z.enum(['ELIGIBLE', 'UNCLEAR', 'INELIGIBLE']),
  relevantQualifications: z.array(z.string()),
  missingQualifications: z.array(z.string()),
  experienceAssessment: z.string(),
  eligibilityExplanation: z.string(),
  potentialConcerns: z.array(z.string()),
  summaryExplanation: z.string(),
  requiresManualConfirmation: z.boolean(),
  manualConfirmationReason: z.string().nullable(),
});

export type SemanticEvaluationOutput = z.infer<typeof SemanticEvaluationOutputSchema>;

/**
 * Builds the comprehensive prompt instructing Gemini on semantic job evaluation
 * against the verified candidate profile with strict Nigeria location eligibility rules.
 */
export function buildJobEvaluationPrompt(params: {
  job: {
    title: string;
    company: string;
    description: string;
    location: string;
    workArrangement: string;
    employmentType?: string | null;
    experienceLevel?: string | null;
    skills?: string[];
  };
  candidate: {
    country: string;
    city?: string;
    headline?: string;
    summary?: string;
    technicalSkills: { name: string; category?: string; proficiency?: string }[];
    workExperience: { position: string; company: string; responsibilities?: string[]; startDate?: string; endDate?: string }[];
    education: { degree: string; fieldOfStudy: string; institution: string }[];
    certifications?: { name: string; issuingOrganization: string }[];
    preferences?: {
      targetJobTitles?: string[];
      remoteWorkPreference?: string;
      preferredCountries?: string[];
    };
  };
}): string {
  const candidateLocation = params.candidate.country || 'Nigeria';

  return `
EVALUATE THE FOLLOWING JOB OPPORTUNITY AGAINST THE VERIFIED CANDIDATE PROFILE.

CRITICAL OBJECTIVE:
Evaluate this opportunity by understanding actual job responsibilities and technical depth rather than superficial keyword matching.
Assess whether the candidate possesses the genuine depth of skill, experience level, and geographic eligibility required to succeed in this role.

LOCATION & NIGERIA ELIGIBILITY RULES (NON-NEGOTIABLE):
The candidate is based in: ${candidateLocation}.
Classify eligibility strictly into one of three classifications:
1. ELIGIBLE:
   - Nigeria is explicitly listed or accepted, OR
   - The listing explicitly confirms "Worldwide", "Anywhere in the World", or "Global (no geographical restrictions)".
2. UNCLEAR:
   - The listing states "Remote" without specifying country, continent, or timezone boundaries.
   - Geographical eligibility is ambiguous or unverified.
   - (NOTE: Do NOT treat unclear eligibility as confirmed eligibility. Flag for manual confirmation.)
3. INELIGIBLE:
   - Nigeria is excluded, OR
   - The listing mandates citizenship or work authorization the candidate does not have (e.g. "US Citizen Only", "Must have US/EU/UK right to work without sponsorship", "Must be located in North America / Latin America / Europe timezone only").
   - (NOTE: Do NOT assume "Remote" means worldwide. Most remote jobs have geographic boundaries.)

SCORING GUIDELINES (0 to 100 each):
1. skillsMatchScore:
   - Evaluate actual mastery of core technologies and frameworks needed for day-to-day responsibilities.
   - Distinguish between core non-negotiable requirements vs nice-to-have secondary tools.
2. roleRelevanceScore:
   - How closely the daily responsibilities, domain, and day-to-day problems match the candidate's career trajectory and proven work history.
3. experienceFitScore:
   - Compare required seniority and years of experience against candidate's verified background.
4. locationEligibilityScore:
   - If INELIGIBLE: Score MUST be 0 - 20.
   - If UNCLEAR: Score MUST be 40 - 60 (reflecting uncertainty requiring manual review).
   - If ELIGIBLE: Score MUST be 85 - 100.

JOB DETAILS:
- Title: ${params.job.title}
- Company: ${params.job.company}
- Location Requirement: ${params.job.location}
- Work Arrangement: ${params.job.workArrangement}
- Seniority: ${params.job.experienceLevel || 'Unspecified'}
- Employment Type: ${params.job.employmentType || 'Unspecified'}
- Tagged Skills: ${(params.job.skills || []).join(', ') || 'None provided'}

JOB DESCRIPTION:
${params.job.description}

VERIFIED CANDIDATE FACTS:
- Full Profile Location: ${candidateLocation} ${params.candidate.city ? `(${params.candidate.city})` : ''}
- Headline: ${params.candidate.headline || 'None'}
- Summary: ${params.candidate.summary || 'None'}
- Verified Skills: ${params.candidate.technicalSkills.map((s) => `${s.name} (${s.proficiency || 'Verified'})`).join(', ') || 'None'}
- Verified Roles: ${params.candidate.workExperience.map((w) => `${w.position} at ${w.company} (${w.startDate || ''} - ${w.endDate || 'Present'})`).join('; ') || 'None'}
- Verified Education: ${params.candidate.education.map((e) => `${e.degree} in ${e.fieldOfStudy} from ${e.institution}`).join('; ') || 'None'}
- Certifications: ${(params.candidate.certifications || []).map((c) => `${c.name} (${c.issuingOrganization})`).join(', ') || 'None'}
- Target Titles: ${(params.candidate.preferences?.targetJobTitles || []).join(', ') || 'None specified'}

OUTPUT FORMAT:
Return strictly a valid JSON object matching the requested schema with no surrounding markdown or explanation.
`.trim();
}
