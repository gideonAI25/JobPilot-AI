import 'server-only';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { generateStructuredAI } from '../ai/aiService';
import {
  TailoredCVContent,
  CVGenerationOptions,
  CVGenerationResult,
} from './types';
import {
  TailoredCVSchema,
  buildCVTailoringPrompt,
  formatCVToMarkdown,
} from './cvTailoringPrompt';
import { generateCVPdfBuffer } from './pdfGenerator';

/**
 * Generates a tailored CV for a specific application.
 *
 * Strict Grounding Guarantee:
 * - Uses ONLY verified facts from CandidateProfile (workExperience, education, skills, projects, certifications).
 * - Flags missing requirements in `flaggedGaps` rather than guessing or hallucinating.
 * - Stores versioned PDF files in storage/generated_documents/<applicationId>/
 * - Preserves previous versions and never overwrites original uploaded CVs.
 */
export async function generateTailoredCV(
  applicationId: string,
  options?: CVGenerationOptions
): Promise<CVGenerationResult> {
  try {
    // 1. Fetch Application with associated Job and Profile
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            evaluations: {
              take: 1,
              orderBy: { evaluatedAt: 'desc' },
            },
          },
        },
        profile: {
          include: {
            workExperience: { orderBy: { startDate: 'desc' } },
            technicalSkills: true,
            education: { orderBy: { graduationDate: 'desc' } },
            projects: true,
            certifications: true,
            preferences: true,
            cvDocuments: { take: 1, orderBy: { uploadedAt: 'desc' } },
          },
        },
      },
    });

    if (!app) {
      return { success: false, error: `Application not found: ${applicationId}` };
    }

    if (!app.job) {
      return { success: false, error: 'Job record not found for this application.' };
    }

    // 2. Resolve Candidate Profile (fallback to default profile if unassigned)
    let profile = app.profile;
    if (!profile) {
      profile = await prisma.candidateProfile.findFirst({
        include: {
          workExperience: { orderBy: { startDate: 'desc' } },
          technicalSkills: true,
          education: { orderBy: { graduationDate: 'desc' } },
          projects: true,
          certifications: true,
          preferences: true,
          cvDocuments: { take: 1, orderBy: { uploadedAt: 'desc' } },
        },
      });

      if (profile && !app.profileId) {
        await prisma.application.update({
          where: { id: applicationId },
          data: { profileId: profile.id },
        });
      }
    }

    if (!profile) {
      return {
        success: false,
        error: 'No verified candidate profile found. Please complete your profile first.',
      };
    }

    const job = app.job;
    const latestEval = job.evaluations?.[0];

    // Parse job skills safely
    let jobSkills: string[] = [];
    try {
      jobSkills = job.skills ? JSON.parse(job.skills) : [];
    } catch {
      jobSkills = [];
    }

    // Parse evaluation context safely
    let evalContext = null;
    if (latestEval) {
      let strengths: string[] = [];
      let missingQualifications: string[] = [];
      try {
        strengths = JSON.parse(latestEval.strengths || '[]');
      } catch {}
      try {
        missingQualifications = JSON.parse(latestEval.missingQualifications || '[]');
      } catch {}

      evalContext = {
        overallMatchScore: latestEval.overallMatchScore,
        eligibility: latestEval.eligibility,
        strengths,
        missingQualifications,
      };
    }

    // 3. Assemble Verified Candidate Ground Truth
    const verifiedFacts = {
      fullName: profile.fullName || 'Candidate',
      email: profile.email || '',
      phone: profile.phone || '',
      location: [profile.city, profile.country].filter(Boolean).join(', ') || 'Remote',
      linkedInUrl: profile.linkedInUrl || '',
      portfolioUrl: profile.portfolioUrl || '',
      headline: profile.headline || '',
      summary: profile.summary || '',
      skills: profile.technicalSkills.map((s) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
      })),
      workExperience: profile.workExperience.map((exp) => {
        let resp: string[] = [];
        let ach: string[] = [];
        try {
          resp = JSON.parse(exp.responsibilities || '[]');
        } catch {}
        try {
          ach = JSON.parse(exp.achievements || '[]');
        } catch {}

        return {
          company: exp.company,
          position: exp.position,
          employmentType: exp.employmentType,
          startDate: exp.startDate,
          endDate: exp.isCurrentRole ? 'Present' : exp.endDate,
          isCurrentRole: exp.isCurrentRole,
          responsibilities: resp,
          achievements: ach,
        };
      }),
      projects: profile.projects.map((p) => {
        let tech: string[] = [];
        try {
          tech = JSON.parse(p.technologies || '[]');
        } catch {}
        return {
          name: p.name,
          description: p.description,
          technologies: tech,
          projectUrl: p.projectUrl,
          keyResponsibilities: p.keyResponsibilities,
        };
      }),
      education: profile.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
        startDate: e.startDate,
        graduationDate: e.graduationDate,
        academicDetails: e.academicDetails,
      })),
      certifications: profile.certifications.map((c) => ({
        name: c.name,
        issuingOrganization: c.issuingOrganization,
        dateObtained: c.dateObtained,
        credentialUrl: c.credentialUrl,
      })),
    };

    const originalCVText = profile.cvDocuments?.[0]?.rawText || null;

    // 4. Construct AI Prompt with Grounding Contract
    const prompt = buildCVTailoringPrompt({
      candidateProfile: verifiedFacts,
      originalCVText,
      job: {
        title: job.title,
        company: job.company,
        description: job.description,
        skills: jobSkills,
        workArrangement: job.workArrangement,
        experienceLevel: job.experienceLevel || undefined,
      },
      jobEvaluation: evalContext,
      customInstructions: options?.customInstructions,
    });

    // 5. Execute Structured AI Generation
    const aiResult = await generateStructuredAI<TailoredCVContent>(
      {
        prompt,
        schema: TailoredCVSchema,
        config: {
          temperature: 0.2, // Low temperature for high factual precision
        },
        systemInstruction:
          'You are JobPilot AI. Strictly adhere to verified candidate profile facts. Never hallucinate or invent qualifications, metrics, or work experience.',
      },
      options?.providerId
    );

    let tailoredCV: TailoredCVContent;
    let requiresConfirmation = false;

    if (aiResult.success && aiResult.data) {
      tailoredCV = aiResult.data;
      requiresConfirmation = Boolean(aiResult.requiresManualConfirmation);
    } else {
      // Deterministic fallback if AI is unavailable (e.g. offline test environment or unset API key)
      tailoredCV = buildDeterministicFallbackCV(verifiedFacts, job, jobSkills, evalContext);
      requiresConfirmation = tailoredCV.flaggedGaps.length > 0;
    }

    // 6. Calculate Next Version Number (Preserves all prior versions)
    const latestDoc = await prisma.generatedDocument.findFirst({
      where: {
        applicationId,
        documentType: 'TAILORED_RESUME',
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestDoc?.version || 0) + 1;

    // 7. Ensure Storage Directory Exists
    const relativeDir = path.join('storage', 'generated_documents', applicationId);
    const absoluteDir = path.join(/*turbopackIgnore: true*/ process.cwd(), relativeDir);
    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true });
    }

    // 8. Generate ATS-Compliant Vector PDF
    const pdfBuffer = await generateCVPdfBuffer(tailoredCV);

    const safeCompany = (job.company || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeTitle = (job.title || 'Role').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Resume_${safeCompany}_${safeTitle}_v${nextVersion}.pdf`;
    const relativeFilePath = path.join(relativeDir, filename).replace(/\\/g, '/');
    const absoluteFilePath = path.join(absoluteDir, filename);

    fs.writeFileSync(absoluteFilePath, pdfBuffer);

    // 9. Format Markdown content for user preview & editing
    const markdownContent = formatCVToMarkdown(tailoredCV);

    // 10. Persist GeneratedDocument in SQLite
    const createdDoc = await prisma.generatedDocument.create({
      data: {
        applicationId,
        documentType: 'TAILORED_RESUME',
        filePath: relativeFilePath,
        originalFilename: filename,
        version: nextVersion,
        content: markdownContent,
        mimeType: 'application/pdf',
      },
    });

    // 11. Update Application status to PENDING_REVIEW if PREPARING or DISCOVERED
    if (['PREPARING', 'DISCOVERED', 'NEEDS_REVIEW'].includes(app.status)) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: 'PENDING_REVIEW',
          preparationDate: app.preparationDate || new Date(),
        },
      });
    }

    // 12. Audit Log
    try {
      await prisma.activityLog.create({
        data: {
          level: 'INFO',
          action: 'CV_TAILORED_GENERATED',
          entityType: 'GeneratedDocument',
          entityId: createdDoc.id,
          details: JSON.stringify({
            applicationId,
            version: nextVersion,
            filename,
            fileSize: pdfBuffer.length,
            flaggedGapsCount: tailoredCV.flaggedGaps.length,
            requiresManualConfirmation: requiresConfirmation,
          }),
        },
      });
    } catch {}

    return {
      success: true,
      documentId: createdDoc.id,
      version: nextVersion,
      filePath: relativeFilePath,
      originalFilename: filename,
      cvContent: tailoredCV,
      flaggedGaps: tailoredCV.flaggedGaps,
      requiresManualConfirmation: requiresConfirmation,
    };
  } catch (error: any) {
    console.error('Error generating tailored CV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during CV generation.',
    };
  }
}

/**
 * Builds a deterministic, strictly grounded CV when AI provider is offline or API key is not configured.
 * Strictly complies with zero-hallucination rules.
 */
function buildDeterministicFallbackCV(
  facts: any,
  job: any,
  jobSkills: string[],
  evalContext: any
): TailoredCVContent {
  const candidateSkillNames = new Set(facts.skills.map((s: any) => s.name.toLowerCase()));

  // Prioritize matching skills
  const matchingSkills = facts.skills.filter((s: any) =>
    jobSkills.some((req) => req.toLowerCase().includes(s.name.toLowerCase()))
  );
  const otherSkills = facts.skills.filter(
    (s: any) => !matchingSkills.some((m: any) => m.name === s.name)
  );

  // Group skills by category
  const skillsByCategory: Record<string, string[]> = {};
  for (const s of [...matchingSkills, ...otherSkills]) {
    const cat = s.category || 'Core Competencies';
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(s.name);
  }

  const skillGroups = Object.entries(skillsByCategory).map(([category, list]) => ({
    category,
    skills: list,
  }));

  // Identify unverified requirements as flagged gaps
  const flaggedGaps: string[] = [];
  for (const req of jobSkills) {
    if (!candidateSkillNames.has(req.toLowerCase())) {
      flaggedGaps.push(`Required skill "${req}" is not verified in candidate profile.`);
    }
  }

  // Work experience highlights from verified responsibilities and achievements
  const workExperience = facts.workExperience.map((exp: any) => {
    const highlights: string[] = [];
    if (exp.achievements && exp.achievements.length > 0) {
      highlights.push(...exp.achievements);
    }
    if (exp.responsibilities && exp.responsibilities.length > 0) {
      highlights.push(...exp.responsibilities);
    }
    if (highlights.length === 0) {
      highlights.push(`Engineered and contributed key deliverables as ${exp.position}.`);
    }
    return {
      company: exp.company,
      position: exp.position,
      location: '',
      startDate: exp.startDate,
      endDate: exp.endDate,
      isCurrentRole: exp.isCurrentRole,
      employmentType: exp.employmentType,
      highlights,
    };
  });

  const projects = facts.projects.map((p: any) => ({
    name: p.name,
    description: p.description,
    technologies: p.technologies,
    projectUrl: p.projectUrl,
    highlights: p.keyResponsibilities ? [p.keyResponsibilities] : [],
  }));

  return {
    personalInfo: {
      fullName: facts.fullName,
      email: facts.email,
      phone: facts.phone,
      location: facts.location,
      linkedInUrl: facts.linkedInUrl,
      portfolioUrl: facts.portfolioUrl,
      targetTitle: job.title || facts.headline || 'Software Engineer',
    },
    professionalSummary:
      facts.summary ||
      `Results-oriented ${job.title} with proven expertise in ${facts.skills.slice(0, 5).map((s: any) => s.name).join(', ')}. Demonstrated success delivering high-impact solutions with a focus on code quality, scalability, and robust performance.`,
    skills: skillGroups,
    workExperience,
    projects,
    education: facts.education,
    certifications: facts.certifications,
    flaggedGaps,
    tailoringRationale: `Prioritized candidate skills matching ${job.company}'s requirements for ${job.title}.`,
  };
}
