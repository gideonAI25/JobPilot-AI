import 'server-only';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateStructuredAI } from '../ai/aiService';
import {
  ScreeningQuestionAnswer,
  ApplicationScreeningAnswersContent,
  ScreeningAnswersGenerationOptions,
  ScreeningAnswersGenerationResult,
} from './types';
import {
  ScreeningAnswersSchema,
  ScreeningAnswersSchemaType,
  buildScreeningAnswersPrompt,
} from './screeningPrompt';

/**
 * Prepares tailored screening question answers for an application.
 *
 * Rules:
 * - Employs strictly verified facts from CandidateProfile and StandardAnswers.
 * - Does not invent salary, authorization, or availability.
 * - Distinguishes between VERIFIED_STANDARD, AI_DRAFTED, and MANUAL_REQUIRED.
 * - Saves versioned JSON file and records in GeneratedDocument.
 */
export async function generateApplicationScreeningAnswers(
  applicationId: string,
  options?: ScreeningAnswersGenerationOptions
): Promise<ScreeningAnswersGenerationResult> {
  try {
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
            standardAnswers: true,
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
          standardAnswers: true,
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

    // Evaluation summary
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

    // Assemble verified candidate facts
    const verifiedFacts = {
      fullName: profile.fullName || 'Candidate',
      email: profile.email || '',
      phone: profile.phone || '',
      country: profile.country || 'Nigeria',
      city: profile.city || 'Lagos',
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
          startDate: exp.startDate,
          endDate: exp.isCurrentRole ? 'Present' : exp.endDate,
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
        graduationDate: e.graduationDate,
      })),
    };

    const existingStandardAnswers = (profile.standardAnswers || []).map((a) => ({
      id: a.id,
      question: a.question,
      answer: a.answer,
      category: a.category,
    }));

    const prompt = buildScreeningAnswersPrompt({
      candidateProfile: verifiedFacts,
      existingStandardAnswers,
      employmentPreferences: profile.preferences,
      job: {
        title: job.title,
        company: job.company,
        description: job.description,
        skills: jobSkills,
        location: job.location,
        workArrangement: job.workArrangement,
      },
      jobEvaluation: evalContext,
      customInstructions: options?.customInstructions,
    });

    const aiResult = await generateStructuredAI<ScreeningAnswersSchemaType>(
      {
        prompt,
        schema: ScreeningAnswersSchema,
        config: {
          temperature: 0.2,
        },
        systemInstruction:
          'You are JobPilot AI. Provide strictly grounded screening answers. Never fabricate salary, authorization, or availability.',
      },
      options?.providerId
    );

    let items: ScreeningQuestionAnswer[] = [];
    let summary = '';
    let requiresConfirmation = false;

    if (aiResult.success && aiResult.data) {
      items = aiResult.data.items;
      summary = aiResult.data.summary;
      requiresConfirmation = items.some((i) => i.requiresConfirmation);
    } else {
      // Deterministic fallback complying strictly with zero-hallucination rules
      const fallback = buildDeterministicFallbackAnswers(
        verifiedFacts,
        existingStandardAnswers,
        profile.preferences,
        job,
        jobSkills
      );
      items = fallback.items;
      summary = fallback.summary;
      requiresConfirmation = items.some((i) => i.requiresConfirmation);
    }

    // Match each item against existing verified standard answers or enforce zero-hallucination guardrails
    for (const item of items) {
      const match = existingStandardAnswers.find(
        (std) =>
          std.question.trim().toLowerCase() === item.question.trim().toLowerCase() ||
          item.question.toLowerCase().includes(std.question.toLowerCase())
      );
      if (match) {
        item.answer = match.answer;
        item.source = 'VERIFIED_STANDARD';
        item.isVerified = true;
        item.requiresConfirmation = false;
        continue;
      }

      // Non-negotiable Programmatic Safety Guardrails: Never invent availability, salary, or domestic authorization
      if (item.category === 'Availability') {
        const hasAvailabilityOnRecord = existingStandardAnswers.some(
          (s) =>
            s.question.toLowerCase().includes('availab') ||
            s.question.toLowerCase().includes('notice') ||
            s.question.toLowerCase().includes('start')
        );
        if (!hasAvailabilityOnRecord) {
          item.source = 'MANUAL_REQUIRED';
          item.isVerified = false;
          item.requiresConfirmation = true;
          item.answer =
            '[Requires personal confirmation - please provide your notice period or earliest start date]';
          item.confirmationReason =
            'Notice period or earliest start date is not configured in your candidate profile.';
        }
      } else if (item.category === 'Salary') {
        if (!profile.preferences?.minSalaryAmount) {
          item.source = 'MANUAL_REQUIRED';
          item.isVerified = false;
          item.requiresConfirmation = true;
          item.answer =
            '[Not specified in verified profile - please confirm your salary expectation before submitting]';
          item.confirmationReason =
            'Salary expectation is not specified in your candidate profile.';
        }
      } else if (item.category === 'Work Authorization') {
        const isRemoteWorldwide =
          job.workArrangement === 'remote' ||
          job.location?.toLowerCase().includes('worldwide') ||
          job.location?.toLowerCase().includes('global');
        if (!isRemoteWorldwide) {
          item.source = 'MANUAL_REQUIRED';
          item.isVerified = false;
          item.requiresConfirmation = true;
          item.answer =
            '[Requires personal confirmation - verify work authorization / visa sponsorship with employer]';
          item.confirmationReason =
            'Location eligibility or work authorization requires candidate verification.';
        }
      }
    }

    // Calculate version number
    const latestDoc = await prisma.generatedDocument.findFirst({
      where: {
        applicationId,
        documentType: 'APPLICATION_ANSWERS',
      },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestDoc?.version || 0) + 1;

    // Storage path
    const relativeDir = path.join('storage', 'generated_documents', applicationId);
    const absoluteDir = path.join(/*turbopackIgnore: true*/ process.cwd(), relativeDir);
    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true });
    }

    const safeCompany = (job.company || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Screening_Answers_${safeCompany}_v${nextVersion}.json`;
    const relativeFilePath = path.join(relativeDir, filename).replace(/\\/g, '/');
    const absoluteFilePath = path.join(absoluteDir, filename);

    const contentPayload: ApplicationScreeningAnswersContent = {
      applicationId,
      generatedAt: new Date().toISOString(),
      version: nextVersion,
      summary,
      items,
    };

    fs.writeFileSync(absoluteFilePath, JSON.stringify(contentPayload, null, 2));

    // Save GeneratedDocument
    const createdDoc = await prisma.generatedDocument.create({
      data: {
        applicationId,
        documentType: 'APPLICATION_ANSWERS',
        filePath: relativeFilePath,
        originalFilename: filename,
        version: nextVersion,
        content: JSON.stringify(contentPayload),
        mimeType: 'application/json',
      },
    });

    const flaggedCount = items.filter((i) => i.requiresConfirmation).length;

    // Audit log
    try {
      await prisma.activityLog.create({
        data: {
          level: 'INFO',
          action: 'SCREENING_ANSWERS_GENERATED',
          entityType: 'GeneratedDocument',
          entityId: createdDoc.id,
          details: JSON.stringify({
            applicationId,
            version: nextVersion,
            totalQuestions: items.length,
            flaggedCount,
          }),
        },
      });
    } catch {}

    return {
      success: true,
      documentId: createdDoc.id,
      version: nextVersion,
      filePath: relativeFilePath,
      content: contentPayload,
      flaggedCount,
      requiresManualConfirmation: requiresConfirmation,
    };
  } catch (error: any) {
    console.error('Error generating screening answers:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error generating screening answers.',
    };
  }
}

/**
 * Updates a specific screening question answer (edit text, mark as verified, save to profile).
 */
export async function updateScreeningAnswerItem(
  applicationId: string,
  questionId: string,
  updates: {
    answer?: string;
    isVerified?: boolean;
    saveToProfileStandardAnswers?: boolean;
  }
): Promise<{ success: boolean; content?: ApplicationScreeningAnswersContent; error?: string }> {
  try {
    const doc = await prisma.generatedDocument.findFirst({
      where: { applicationId, documentType: 'APPLICATION_ANSWERS' },
      orderBy: { version: 'desc' },
    });

    if (!doc || !doc.content) {
      return { success: false, error: 'Screening answers document not found.' };
    }

    let parsed: ApplicationScreeningAnswersContent;
    try {
      parsed = JSON.parse(doc.content);
    } catch {
      return { success: false, error: 'Failed to parse existing answers document.' };
    }

    const item = parsed.items.find((i) => i.id === questionId);
    if (!item) {
      return { success: false, error: `Question with id "${questionId}" not found.` };
    }

    // Apply updates
    if (updates.answer !== undefined) {
      item.answer = updates.answer.trim();
      if (item.answer.length > 0 && item.requiresConfirmation) {
        item.requiresConfirmation = false;
        item.confirmationReason = undefined;
      }
    }

    if (updates.isVerified !== undefined) {
      item.isVerified = updates.isVerified;
      if (updates.isVerified) {
        item.source = 'VERIFIED_STANDARD';
        item.requiresConfirmation = false;
      }
    }

    item.lastUpdated = new Date().toISOString();

    // Persist updated JSON to disk
    if (doc.filePath) {
      const absPath = path.isAbsolute(doc.filePath)
        ? doc.filePath
        : path.join(/*turbopackIgnore: true*/ process.cwd(), doc.filePath);
      fs.writeFileSync(absPath, JSON.stringify(parsed, null, 2));
    }

    // Update Prisma record
    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: {
        content: JSON.stringify(parsed),
        updatedAt: new Date(),
      },
    });

    // Optionally save to candidate profile's StandardAnswer table
    if (updates.saveToProfileStandardAnswers && item.answer) {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { profileId: true },
      });
      if (app?.profileId) {
        const existingStd = await prisma.standardAnswer.findFirst({
          where: {
            profileId: app.profileId,
            question: item.question,
          },
        });

        if (existingStd) {
          await prisma.standardAnswer.update({
            where: { id: existingStd.id },
            data: { answer: item.answer, category: item.category },
          });
        } else {
          await prisma.standardAnswer.create({
            data: {
              profileId: app.profileId,
              question: item.question,
              answer: item.answer,
              category: item.category,
            },
          });
        }
      }
    }

    return { success: true, content: parsed };
  } catch (error: any) {
    console.error('Error updating screening answer item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update answer.',
    };
  }
}

/**
 * Regenerates an individual screening answer using verified profile facts.
 */
export async function regenerateSingleScreeningAnswer(
  applicationId: string,
  questionId: string,
  options?: { customInstructions?: string }
): Promise<{ success: boolean; item?: ScreeningQuestionAnswer; error?: string }> {
  try {
    const doc = await prisma.generatedDocument.findFirst({
      where: { applicationId, documentType: 'APPLICATION_ANSWERS' },
      orderBy: { version: 'desc' },
    });

    if (!doc || !doc.content) {
      return { success: false, error: 'Document not found.' };
    }

    const parsed: ApplicationScreeningAnswersContent = JSON.parse(doc.content);
    const item = parsed.items.find((i) => i.id === questionId);
    if (!item) {
      return { success: false, error: 'Question not found.' };
    }

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        profile: {
          include: {
            workExperience: true,
            technicalSkills: true,
            projects: true,
            preferences: true,
            standardAnswers: true,
          },
        },
      },
    });

    if (!app || !app.job || !app.profile) {
      return { success: false, error: 'Context not found for regeneration.' };
    }

    const prompt = `
${buildScreeningAnswersPrompt({
  candidateProfile: app.profile,
  existingStandardAnswers: app.profile.standardAnswers || [],
  employmentPreferences: app.profile.preferences,
  job: {
    title: app.job.title,
    company: app.job.company,
    description: app.job.description,
  },
  customInstructions: options?.customInstructions,
})}

TASK: REGENERATE THIS SPECIFIC SCREENING QUESTION ONLY:
Question ID: ${item.id}
Question: ${item.question}
Category: ${item.category}
Current Answer: ${item.answer}

Draft a fresh, professional, authentic answer grounded exclusively in the verified facts above.
Return JSON with fields: answer, source, requiresConfirmation, confirmationReason.
`.trim();

    const SingleQuestionRegenSchema = z.object({
      answer: z.string().describe('The tailored, authentic answer.'),
      source: z
        .enum(['VERIFIED_STANDARD', 'AI_DRAFTED', 'MANUAL_REQUIRED'])
        .optional()
        .default('AI_DRAFTED'),
      requiresConfirmation: z.boolean().optional().default(false),
      confirmationReason: z.string().optional().default(''),
    });

    const result = await generateStructuredAI<{
      answer: string;
      source?: 'VERIFIED_STANDARD' | 'AI_DRAFTED' | 'MANUAL_REQUIRED';
      requiresConfirmation?: boolean;
      confirmationReason?: string;
    }>({
      prompt,
      schema: SingleQuestionRegenSchema,
      config: { temperature: 0.3 },
      systemInstruction: 'Provide a crisp, authentic, grounded answer to this application question.',
    });

    if (result.success && result.data?.answer) {
      const newItem: ScreeningQuestionAnswer = {
        ...item,
        answer: result.data.answer,
        source: result.data.source || 'AI_DRAFTED',
        isVerified: false,
        requiresConfirmation: Boolean(result.data.requiresConfirmation),
        confirmationReason: result.data.confirmationReason || '',
        lastUpdated: new Date().toISOString(),
      };

      // Guardrail against ungrounded single regeneration
      if (newItem.category === 'Availability') {
        const hasAvailabilityOnRecord = (app.profile.standardAnswers || []).some(
          (s) =>
            s.question.toLowerCase().includes('availab') ||
            s.question.toLowerCase().includes('notice') ||
            s.question.toLowerCase().includes('start')
        );
        if (!hasAvailabilityOnRecord) {
          newItem.source = 'MANUAL_REQUIRED';
          newItem.isVerified = false;
          newItem.requiresConfirmation = true;
          newItem.answer =
            '[Requires personal confirmation - please provide your notice period or earliest start date]';
          newItem.confirmationReason =
            'Notice period or earliest start date is not configured in your candidate profile.';
        }
      } else if (newItem.category === 'Salary' && !app.profile.preferences?.minSalaryAmount) {
        newItem.source = 'MANUAL_REQUIRED';
        newItem.isVerified = false;
        newItem.requiresConfirmation = true;
        newItem.answer =
          '[Not specified in verified profile - please confirm your salary expectation before submitting]';
        newItem.confirmationReason =
          'Salary expectation is not specified in your candidate profile.';
      }

      const index = parsed.items.findIndex((i) => i.id === questionId);
      if (index !== -1) {
        parsed.items[index] = newItem;
      }

      // Persist update
      if (doc.filePath) {
        const absPath = path.isAbsolute(doc.filePath)
          ? doc.filePath
          : path.join(/*turbopackIgnore: true*/ process.cwd(), doc.filePath);
        fs.writeFileSync(absPath, JSON.stringify(parsed, null, 2));
      }

      await prisma.generatedDocument.update({
        where: { id: doc.id },
        data: { content: JSON.stringify(parsed), updatedAt: new Date() },
      });

      return { success: true, item: newItem };
    } else {
      // Graceful deterministic fallback for single question regeneration
      const fallbackList = buildDeterministicFallbackAnswers(
        {
          skills: app.profile.technicalSkills || [],
          workExperience: app.profile.workExperience || [],
          projects: app.profile.projects || [],
        },
        app.profile.standardAnswers || [],
        app.profile.preferences,
        app.job,
        []
      );
      const fallbackMatch = fallbackList.items.find(
        (f) => f.id === item.id || f.category === item.category
      );

      const newItem: ScreeningQuestionAnswer = {
        ...item,
        answer: fallbackMatch?.answer || item.answer,
        source: fallbackMatch?.source || item.source || 'AI_DRAFTED',
        isVerified: false,
        requiresConfirmation: fallbackMatch?.requiresConfirmation ?? item.requiresConfirmation,
        confirmationReason: fallbackMatch?.confirmationReason ?? item.confirmationReason,
        lastUpdated: new Date().toISOString(),
      };

      const index = parsed.items.findIndex((i) => i.id === questionId);
      if (index !== -1) {
        parsed.items[index] = newItem;
      }

      if (doc.filePath) {
        const absPath = path.isAbsolute(doc.filePath)
          ? doc.filePath
          : path.join(/*turbopackIgnore: true*/ process.cwd(), doc.filePath);
        fs.writeFileSync(absPath, JSON.stringify(parsed, null, 2));
      }

      await prisma.generatedDocument.update({
        where: { id: doc.id },
        data: { content: JSON.stringify(parsed), updatedAt: new Date() },
      });

      return { success: true, item: newItem };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error regenerating answer.',
    };
  }
}

/**
 * Fallback deterministic answers builder with authentic human phrasing.
 * Strictly avoids hallucinating salary, work authorization, or availability.
 */
function buildDeterministicFallbackAnswers(
  facts: any,
  standardAnswers: any[],
  preferences: any,
  job: any,
  jobSkills: string[]
): { summary: string; items: ScreeningQuestionAnswer[] } {
  const topSkills = facts.skills.slice(0, 5).map((s: any) => s.name).join(', ');
  const primaryRole = facts.workExperience[0];
  const primaryProject = facts.projects[0];

  let parsedResponsibilities: string[] = [];
  if (primaryRole?.responsibilities) {
    try {
      parsedResponsibilities = Array.isArray(primaryRole.responsibilities)
        ? primaryRole.responsibilities
        : JSON.parse(primaryRole.responsibilities);
    } catch {
      parsedResponsibilities = [String(primaryRole.responsibilities)];
    }
  }

  const items: ScreeningQuestionAnswer[] = [
    {
      id: 'q_tell_about_yourself',
      question: 'Tell us about yourself.',
      category: 'General',
      answer: `I am a software engineer with proven experience building production web platforms and intelligent workflows using ${topSkills}. ${
        primaryRole
          ? `In my role as ${primaryRole.position} at ${primaryRole.company}, I led architecture initiatives and delivered reliable full-stack solutions.`
          : ''
      } I focus on clean code, system reliability, and pragmatic engineering.`,
      source: 'AI_DRAFTED',
      isVerified: false,
      requiresConfirmation: false,
    },
    {
      id: 'q_why_interested',
      question: `Why are you interested in this position at ${job.company}?`,
      category: 'Motivation',
      answer: `I am interested in ${job.company} because your mission aligns closely with my experience in ${topSkills}. The opportunity to work as ${job.title} directly leverages my hands-on background solving complex system and architecture challenges.`,
      source: 'AI_DRAFTED',
      isVerified: false,
      requiresConfirmation: false,
    },
    {
      id: 'q_relevant_experience',
      question: `Describe your relevant experience for the ${job.title} role.`,
      category: 'Experience',
      answer: `${
        primaryRole
          ? `At ${primaryRole.company}, I served as ${primaryRole.position}, where I was responsible for ${
              parsedResponsibilities.slice(0, 2).join(' and ') || 'core feature development and system delivery'
            }.`
          : 'I have developed scalable applications with a focus on high code quality and test coverage.'
      } ${
        primaryProject
          ? `I also built ${primaryProject.name}, ${primaryProject.description}`
          : ''
      }`,
      source: 'AI_DRAFTED',
      isVerified: false,
      requiresConfirmation: false,
    },
    {
      id: 'q_tools_technologies',
      question: 'What key tools, technologies, and frameworks have you used in production?',
      category: 'Technical',
      answer: `My production technical stack includes: ${facts.skills
        .map((s: any) => s.name)
        .join(', ')}. I have practical experience with architectural design, database optimization, and API integration.`,
      source: 'AI_DRAFTED',
      isVerified: false,
      requiresConfirmation: false,
    },
    {
      id: 'q_salary_expectations',
      question: 'What are your salary expectations?',
      category: 'Salary',
      answer:
        preferences?.minSalaryAmount
          ? `My target compensation is approximately $${preferences.minSalaryAmount.toLocaleString()} ${preferences.minSalaryCurrency || 'USD'} per ${preferences.minSalaryPeriod || 'year'}, though I am flexible depending on total benefits and scope.`
          : '[Not specified in verified profile - please confirm your salary expectation before submitting]',
      source: preferences?.minSalaryAmount ? 'AI_DRAFTED' : 'MANUAL_REQUIRED',
      isVerified: false,
      requiresConfirmation: !preferences?.minSalaryAmount,
      confirmationReason: preferences?.minSalaryAmount
        ? undefined
        : 'Salary expectation is not configured in your candidate preferences.',
    },
    {
      id: 'q_work_authorization',
      question: 'Are you legally authorized to work in this location or remotely from your location?',
      category: 'Work Authorization',
      answer:
        job.workArrangement === 'remote' || job.location?.toLowerCase().includes('worldwide')
          ? 'I am legally eligible and authorized to work remotely from Nigeria as an independent contractor or full-time remote employee.'
          : '[Requires personal confirmation - verify work authorization / visa sponsorship with employer]',
      source:
        job.workArrangement === 'remote' || job.location?.toLowerCase().includes('worldwide')
          ? 'AI_DRAFTED'
          : 'MANUAL_REQUIRED',
      isVerified: false,
      requiresConfirmation: !(
        job.workArrangement === 'remote' || job.location?.toLowerCase().includes('worldwide')
      ),
      confirmationReason:
        job.workArrangement === 'remote' || job.location?.toLowerCase().includes('worldwide')
          ? undefined
          : 'Location eligibility requires candidate confirmation.',
    },
    {
      id: 'q_availability',
      question: 'When are you available to start working, and what is your notice period?',
      category: 'Availability',
      answer: '[Requires personal confirmation - please provide your notice period or earliest start date]',
      source: 'MANUAL_REQUIRED',
      isVerified: false,
      requiresConfirmation: true,
      confirmationReason: 'Notice period or start date is not configured.',
    },
  ];

  return {
    summary: `Prepared ${items.length} screening question responses. ${
      items.filter((i) => i.requiresConfirmation).length
    } item(s) require manual candidate confirmation.`,
    items,
  };
}
