import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  CandidateProfile,
  PersonalInformation,
  ProfessionalSummary,
  EducationEntry,
  WorkExperienceEntry,
  TechnicalSkillEntry,
  ProjectEntry,
  CertificationEntry,
  EmploymentPreferences,
  StandardAnswerEntry,
  CVDocRecord,
  ProfileSectionId,
} from '@/types/profile';
import { calculateProfileCompletion } from '@/services/profileCompletion';

// Helper to safely parse JSON strings
function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Transforms raw Prisma CandidateProfile record with relations
 * into clean, typed CandidateProfile interface.
 */
export function mapDbProfileToCandidateProfile(dbProfile: any): CandidateProfile {
  const prefs = dbProfile.preferences;

  const preferences: EmploymentPreferences = {
    targetJobTitles: safeParseJson<string[]>(prefs?.targetJobTitles, []),
    preferredEmploymentTypes: safeParseJson<any[]>(prefs?.preferredEmploymentTypes, []),
    preferredSeniority: safeParseJson<any[]>(prefs?.preferredSeniority, []),
    remoteWorkPreference: (prefs?.remoteWorkPreference as any) || 'any',
    preferredCountries: safeParseJson<string[]>(prefs?.preferredCountries, []),
    excludedLocations: safeParseJson<string[]>(prefs?.excludedLocations, []),
    minSalaryExpectation: {
      currency: prefs?.minSalaryCurrency || 'USD',
      amount: prefs?.minSalaryAmount ?? null,
      period: (prefs?.minSalaryPeriod as any) || 'yearly',
    },
  };

  const education: EducationEntry[] = (dbProfile.education || []).map((e: any) => ({
    id: e.id,
    institution: e.institution,
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy,
    startDate: e.startDate,
    graduationDate: e.graduationDate,
    academicDetails: e.academicDetails || '',
  }));

  const workExperience: WorkExperienceEntry[] = (dbProfile.workExperience || []).map((w: any) => ({
    id: w.id,
    company: w.company,
    position: w.position,
    employmentType: w.employmentType,
    startDate: w.startDate,
    endDate: w.endDate || '',
    isCurrentRole: Boolean(w.isCurrentRole),
    responsibilities: safeParseJson<string[]>(w.responsibilities, []),
    achievements: safeParseJson<string[]>(w.achievements, []),
  }));

  const technicalSkills: TechnicalSkillEntry[] = (dbProfile.technicalSkills || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    proficiency: s.proficiency,
  }));

  const projects: ProjectEntry[] = (dbProfile.projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    technologies: safeParseJson<string[]>(p.technologies, []),
    projectUrl: p.projectUrl || '',
    keyResponsibilities: p.keyResponsibilities || '',
  }));

  const certifications: CertificationEntry[] = (dbProfile.certifications || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    issuingOrganization: c.issuingOrganization,
    dateObtained: c.dateObtained,
    credentialUrl: c.credentialUrl || '',
  }));

  const standardAnswers: StandardAnswerEntry[] = (dbProfile.standardAnswers || []).map((a: any) => ({
    id: a.id,
    question: a.question,
    answer: a.answer,
    category: a.category || 'General',
  }));

  const cvDocuments: CVDocRecord[] = (dbProfile.cvDocuments || []).map((d: any) => ({
    id: d.id,
    filename: d.filename,
    originalFilename: d.originalFilename,
    filePath: d.filePath,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString() : new Date().toISOString(),
  }));

  return {
    id: dbProfile.id,
    personalInfo: {
      fullName: dbProfile.fullName || '',
      email: dbProfile.email || '',
      phone: dbProfile.phone || '',
      country: dbProfile.country || '',
      city: dbProfile.city || '',
      linkedInUrl: dbProfile.linkedInUrl || '',
      portfolioUrl: dbProfile.portfolioUrl || '',
    },
    summary: {
      headline: dbProfile.headline || '',
      summary: dbProfile.summary || '',
    },
    education,
    workExperience,
    technicalSkills,
    projects,
    certifications,
    preferences,
    standardAnswers,
    cvDocuments,
    completionPercentage: dbProfile.completionPercentage ?? 0,
    completedSections: safeParseJson<string[]>(dbProfile.completedSections, []),
    isFullyComplete: Boolean(dbProfile.isFullyComplete),
    lastUpdated: dbProfile.updatedAt ? new Date(dbProfile.updatedAt).toISOString() : undefined,
  };
}

/**
 * Recalculates and persists completion statistics for a profile in the database.
 */
async function syncProfileCompletion(profileId: string) {
  const dbProfile = await prisma.candidateProfile.findUnique({
    where: { id: profileId },
    include: {
      education: true,
      workExperience: true,
      technicalSkills: true,
      projects: true,
      certifications: true,
      preferences: true,
      standardAnswers: true,
      cvDocuments: true,
    },
  });

  if (!dbProfile) return null;

  const candidateProfile = mapDbProfileToCandidateProfile(dbProfile);
  const completionSummary = calculateProfileCompletion(candidateProfile);

  const completedSectionKeys = Object.entries(completionSummary.sections)
    .filter(([_, status]) => status.isComplete)
    .map(([key]) => key);

  const updated = await prisma.candidateProfile.update({
    where: { id: profileId },
    data: {
      completionPercentage: completionSummary.completionPercentage,
      completedSections: JSON.stringify(completedSectionKeys),
      isFullyComplete: completionSummary.isFullyComplete,
    },
    include: {
      education: true,
      workExperience: true,
      technicalSkills: true,
      projects: true,
      certifications: true,
      preferences: true,
      standardAnswers: true,
      cvDocuments: { orderBy: { uploadedAt: 'desc' } },
    },
  });

  return mapDbProfileToCandidateProfile(updated);
}

/**
 * Retrieves the primary candidate profile or creates a clean initial record.
 */
export async function getOrCreatePrimaryProfile(): Promise<CandidateProfile> {
  let dbProfile = await prisma.candidateProfile.findFirst({
    include: {
      education: true,
      workExperience: true,
      technicalSkills: true,
      projects: true,
      certifications: true,
      preferences: true,
      standardAnswers: true,
      cvDocuments: { orderBy: { uploadedAt: 'desc' } },
    },
  });

  if (!dbProfile) {
    dbProfile = await prisma.candidateProfile.create({
      data: {
        fullName: '',
        email: '',
        phone: '',
        country: '',
        city: '',
        linkedInUrl: '',
        portfolioUrl: '',
        headline: '',
        summary: '',
        preferences: {
          create: {
            targetJobTitles: JSON.stringify([]),
            preferredEmploymentTypes: JSON.stringify([]),
            preferredSeniority: JSON.stringify([]),
            remoteWorkPreference: 'remote-only',
            preferredCountries: JSON.stringify([]),
            excludedLocations: JSON.stringify([]),
            minSalaryCurrency: 'USD',
            minSalaryAmount: null,
            minSalaryPeriod: 'yearly',
          },
        },
      },
      include: {
        education: true,
        workExperience: true,
        technicalSkills: true,
        projects: true,
        certifications: true,
        preferences: true,
        standardAnswers: true,
        cvDocuments: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    const refreshed = await syncProfileCompletion(dbProfile.id);
    if (refreshed) return refreshed;
  }

  return mapDbProfileToCandidateProfile(dbProfile);
}

/**
 * Updates a specific profile section atomically, leaving unrelated data untouched.
 */
export async function updateProfileSection(
  sectionId: ProfileSectionId,
  data: any
): Promise<CandidateProfile> {
  const profile = await getOrCreatePrimaryProfile();
  const profileId = profile.id!;

  switch (sectionId) {
    case 'personal': {
      const p = data as Partial<PersonalInformation>;
      await prisma.candidateProfile.update({
        where: { id: profileId },
        data: {
          fullName: p.fullName ?? '',
          email: p.email ?? '',
          phone: p.phone ?? '',
          country: p.country ?? '',
          city: p.city ?? '',
          linkedInUrl: p.linkedInUrl ?? '',
          portfolioUrl: p.portfolioUrl ?? '',
        },
      });
      break;
    }

    case 'summary': {
      const s = data as Partial<ProfessionalSummary>;
      await prisma.candidateProfile.update({
        where: { id: profileId },
        data: {
          headline: s.headline ?? '',
          summary: s.summary ?? '',
        },
      });
      break;
    }

    case 'preferences': {
      const pref = data as Partial<EmploymentPreferences>;
      await prisma.employmentPreferences.upsert({
        where: { profileId },
        create: {
          profileId,
          targetJobTitles: JSON.stringify(pref.targetJobTitles || []),
          preferredEmploymentTypes: JSON.stringify(pref.preferredEmploymentTypes || []),
          preferredSeniority: JSON.stringify(pref.preferredSeniority || []),
          remoteWorkPreference: pref.remoteWorkPreference || 'any',
          preferredCountries: JSON.stringify(pref.preferredCountries || []),
          excludedLocations: JSON.stringify(pref.excludedLocations || []),
          minSalaryCurrency: pref.minSalaryExpectation?.currency || 'USD',
          minSalaryAmount: pref.minSalaryExpectation?.amount ?? null,
          minSalaryPeriod: pref.minSalaryExpectation?.period || 'yearly',
        },
        update: {
          targetJobTitles: JSON.stringify(pref.targetJobTitles || []),
          preferredEmploymentTypes: JSON.stringify(pref.preferredEmploymentTypes || []),
          preferredSeniority: JSON.stringify(pref.preferredSeniority || []),
          remoteWorkPreference: pref.remoteWorkPreference || 'any',
          preferredCountries: JSON.stringify(pref.preferredCountries || []),
          excludedLocations: JSON.stringify(pref.excludedLocations || []),
          minSalaryCurrency: pref.minSalaryExpectation?.currency || 'USD',
          minSalaryAmount: pref.minSalaryExpectation?.amount ?? null,
          minSalaryPeriod: pref.minSalaryExpectation?.period || 'yearly',
        },
      });
      break;
    }

    default:
      throw new Error(`Section "${sectionId}" is updated via granular list item operations.`);
  }

  const updatedProfile = await syncProfileCompletion(profileId);
  return updatedProfile || (await getOrCreatePrimaryProfile());
}

/**
 * Adds an item to a list section (education, experience, skill, project, certification, standardAnswer).
 */
export async function addProfileListItem(
  sectionKey:
    | 'education'
    | 'workExperience'
    | 'technicalSkills'
    | 'projects'
    | 'certifications'
    | 'standardAnswers',
  item: any
): Promise<CandidateProfile> {
  const profile = await getOrCreatePrimaryProfile();
  const profileId = profile.id!;

  switch (sectionKey) {
    case 'education':
      await prisma.education.create({
        data: {
          profileId,
          institution: item.institution,
          degree: item.degree,
          fieldOfStudy: item.fieldOfStudy,
          startDate: item.startDate || '',
          graduationDate: item.graduationDate || '',
          academicDetails: item.academicDetails || '',
        },
      });
      break;

    case 'workExperience':
      await prisma.workExperience.create({
        data: {
          profileId,
          company: item.company,
          position: item.position,
          employmentType: item.employmentType || 'full-time',
          startDate: item.startDate || '',
          endDate: item.endDate || '',
          isCurrentRole: Boolean(item.isCurrentRole),
          responsibilities: JSON.stringify(item.responsibilities || []),
          achievements: JSON.stringify(item.achievements || []),
        },
      });
      break;

    case 'technicalSkills':
      // Upsert to handle potential duplicate skill names gracefully
      await prisma.technicalSkill.upsert({
        where: {
          profileId_name: {
            profileId,
            name: item.name.trim(),
          },
        },
        create: {
          profileId,
          name: item.name.trim(),
          category: item.category || 'Other',
          proficiency: item.proficiency || 'Intermediate',
        },
        update: {
          category: item.category || 'Other',
          proficiency: item.proficiency || 'Intermediate',
        },
      });
      break;

    case 'projects':
      await prisma.project.create({
        data: {
          profileId,
          name: item.name,
          description: item.description || '',
          technologies: JSON.stringify(item.technologies || []),
          projectUrl: item.projectUrl || '',
          keyResponsibilities: item.keyResponsibilities || '',
        },
      });
      break;

    case 'certifications':
      await prisma.certification.create({
        data: {
          profileId,
          name: item.name,
          issuingOrganization: item.issuingOrganization || '',
          dateObtained: item.dateObtained || '',
          credentialUrl: item.credentialUrl || '',
        },
      });
      break;

    case 'standardAnswers':
      await prisma.standardAnswer.create({
        data: {
          profileId,
          question: item.question,
          answer: item.answer,
          category: item.category || 'General',
        },
      });
      break;

    default:
      throw new Error(`Unsupported section key: ${sectionKey}`);
  }

  const updatedProfile = await syncProfileCompletion(profileId);
  return updatedProfile || (await getOrCreatePrimaryProfile());
}

/**
 * Updates a specific list item in place.
 */
export async function updateProfileListItem(
  sectionKey:
    | 'education'
    | 'workExperience'
    | 'technicalSkills'
    | 'projects'
    | 'certifications'
    | 'standardAnswers',
  id: string,
  item: any
): Promise<CandidateProfile> {
  const profile = await getOrCreatePrimaryProfile();
  const profileId = profile.id!;

  switch (sectionKey) {
    case 'education':
      await prisma.education.update({
        where: { id },
        data: {
          institution: item.institution,
          degree: item.degree,
          fieldOfStudy: item.fieldOfStudy,
          startDate: item.startDate,
          graduationDate: item.graduationDate,
          academicDetails: item.academicDetails,
        },
      });
      break;

    case 'workExperience':
      await prisma.workExperience.update({
        where: { id },
        data: {
          company: item.company,
          position: item.position,
          employmentType: item.employmentType,
          startDate: item.startDate,
          endDate: item.endDate,
          isCurrentRole: Boolean(item.isCurrentRole),
          responsibilities: JSON.stringify(item.responsibilities || []),
          achievements: JSON.stringify(item.achievements || []),
        },
      });
      break;

    case 'technicalSkills':
      await prisma.technicalSkill.update({
        where: { id },
        data: {
          name: item.name,
          category: item.category,
          proficiency: item.proficiency,
        },
      });
      break;

    case 'projects':
      await prisma.project.update({
        where: { id },
        data: {
          name: item.name,
          description: item.description,
          technologies: JSON.stringify(item.technologies || []),
          projectUrl: item.projectUrl,
          keyResponsibilities: item.keyResponsibilities,
        },
      });
      break;

    case 'certifications':
      await prisma.certification.update({
        where: { id },
        data: {
          name: item.name,
          issuingOrganization: item.issuingOrganization,
          dateObtained: item.dateObtained,
          credentialUrl: item.credentialUrl,
        },
      });
      break;

    case 'standardAnswers':
      await prisma.standardAnswer.update({
        where: { id },
        data: {
          question: item.question,
          answer: item.answer,
          category: item.category,
        },
      });
      break;
  }

  const updatedProfile = await syncProfileCompletion(profileId);
  return updatedProfile || (await getOrCreatePrimaryProfile());
}

/**
 * Removes a list item by ID without affecting any other records.
 */
export async function deleteProfileListItem(
  sectionKey:
    | 'education'
    | 'workExperience'
    | 'technicalSkills'
    | 'projects'
    | 'certifications'
    | 'standardAnswers',
  id: string
): Promise<CandidateProfile> {
  const profile = await getOrCreatePrimaryProfile();
  const profileId = profile.id!;

  switch (sectionKey) {
    case 'education':
      await prisma.education.delete({ where: { id } });
      break;
    case 'workExperience':
      await prisma.workExperience.delete({ where: { id } });
      break;
    case 'technicalSkills':
      await prisma.technicalSkill.delete({ where: { id } });
      break;
    case 'projects':
      await prisma.project.delete({ where: { id } });
      break;
    case 'certifications':
      await prisma.certification.delete({ where: { id } });
      break;
    case 'standardAnswers':
      await prisma.standardAnswer.delete({ where: { id } });
      break;
  }

  const updatedProfile = await syncProfileCompletion(profileId);
  return updatedProfile || (await getOrCreatePrimaryProfile());
}

/**
 * Merges approved CV sections into the candidate profile in SQLite.
 * Uses atomic transactions to prevent partial updates.
 */
export async function mergeApprovedCVSections(
  approved: Partial<CandidateProfile>
): Promise<CandidateProfile> {
  const profile = await getOrCreatePrimaryProfile();
  const profileId = profile.id!;

  await prisma.$transaction(async (tx) => {
    // 1. Personal Info
    if (approved.personalInfo) {
      const p = approved.personalInfo;
      await tx.candidateProfile.update({
        where: { id: profileId },
        data: {
          fullName: p.fullName || undefined,
          email: p.email || undefined,
          phone: p.phone || undefined,
          country: p.country || undefined,
          city: p.city || undefined,
          linkedInUrl: p.linkedInUrl || undefined,
          portfolioUrl: p.portfolioUrl || undefined,
        },
      });
    }

    // 2. Summary
    if (approved.summary) {
      await tx.candidateProfile.update({
        where: { id: profileId },
        data: {
          headline: approved.summary.headline || undefined,
          summary: approved.summary.summary || undefined,
        },
      });
    }

    // 3. Education
    if (Array.isArray(approved.education) && approved.education.length > 0) {
      for (const edu of approved.education) {
        await tx.education.create({
          data: {
            profileId,
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy,
            startDate: edu.startDate || '',
            graduationDate: edu.graduationDate || '',
            academicDetails: edu.academicDetails || '',
          },
        });
      }
    }

    // 4. Work Experience
    if (Array.isArray(approved.workExperience) && approved.workExperience.length > 0) {
      for (const exp of approved.workExperience) {
        await tx.workExperience.create({
          data: {
            profileId,
            company: exp.company,
            position: exp.position,
            employmentType: exp.employmentType || 'full-time',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            isCurrentRole: Boolean(exp.isCurrentRole),
            responsibilities: JSON.stringify(exp.responsibilities || []),
            achievements: JSON.stringify(exp.achievements || []),
          },
        });
      }
    }

    // 5. Technical Skills
    if (Array.isArray(approved.technicalSkills) && approved.technicalSkills.length > 0) {
      for (const skill of approved.technicalSkills) {
        if (!skill.name?.trim()) continue;
        await tx.technicalSkill.upsert({
          where: {
            profileId_name: {
              profileId,
              name: skill.name.trim(),
            },
          },
          create: {
            profileId,
            name: skill.name.trim(),
            category: skill.category || 'Other',
            proficiency: skill.proficiency || 'Intermediate',
          },
          update: {
            category: skill.category || 'Other',
            proficiency: skill.proficiency || 'Intermediate',
          },
        });
      }
    }

    // 6. Projects
    if (Array.isArray(approved.projects) && approved.projects.length > 0) {
      for (const proj of approved.projects) {
        await tx.project.create({
          data: {
            profileId,
            name: proj.name,
            description: proj.description || '',
            technologies: JSON.stringify(proj.technologies || []),
            projectUrl: proj.projectUrl || '',
            keyResponsibilities: proj.keyResponsibilities || '',
          },
        });
      }
    }

    // 7. Certifications
    if (Array.isArray(approved.certifications) && approved.certifications.length > 0) {
      for (const cert of approved.certifications) {
        await tx.certification.create({
          data: {
            profileId,
            name: cert.name,
            issuingOrganization: cert.issuingOrganization || '',
            dateObtained: cert.dateObtained || '',
            credentialUrl: cert.credentialUrl || '',
          },
        });
      }
    }
  });

  const updatedProfile = await syncProfileCompletion(profileId);
  return updatedProfile || (await getOrCreatePrimaryProfile());
}

/**
 * Resets the candidate profile to a pristine empty state in SQLite.
 */
export async function resetCandidateProfile(): Promise<CandidateProfile> {
  const profile = await getOrCreatePrimaryProfile();
  const profileId = profile.id!;

  await prisma.$transaction([
    prisma.education.deleteMany({ where: { profileId } }),
    prisma.workExperience.deleteMany({ where: { profileId } }),
    prisma.technicalSkill.deleteMany({ where: { profileId } }),
    prisma.project.deleteMany({ where: { profileId } }),
    prisma.certification.deleteMany({ where: { profileId } }),
    prisma.standardAnswer.deleteMany({ where: { profileId } }),
    prisma.candidateProfile.update({
      where: { id: profileId },
      data: {
        fullName: '',
        email: '',
        phone: '',
        country: '',
        city: '',
        linkedInUrl: '',
        portfolioUrl: '',
        headline: '',
        summary: '',
      },
    }),
  ]);

  const updatedProfile = await syncProfileCompletion(profileId);
  return updatedProfile || (await getOrCreatePrimaryProfile());
}

/**
 * Saves an uploaded CV document record in the database.
 */
export async function recordUploadedCV(data: {
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  rawText?: string;
  parsedData?: string;
}): Promise<CVDocRecord> {
  const profile = await getOrCreatePrimaryProfile();

  const record = await prisma.cVDocument.create({
    data: {
      profileId: profile.id,
      filename: data.filename,
      originalFilename: data.originalFilename,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      rawText: data.rawText || '',
      parsedData: data.parsedData || '',
    },
  });

  // Re-sync completion if cvDocuments affects profile status
  await syncProfileCompletion(profile.id!);

  return {
    id: record.id,
    filename: record.filename,
    originalFilename: record.originalFilename,
    filePath: record.filePath,
    fileSize: record.fileSize,
    mimeType: record.mimeType,
    uploadedAt: record.uploadedAt.toISOString(),
  };
}

/**
 * Returns all uploaded CV records.
 */
export async function getCVDocuments(): Promise<CVDocRecord[]> {
  const profile = await getOrCreatePrimaryProfile();

  const records = await prisma.cVDocument.findMany({
    where: { profileId: profile.id },
    orderBy: { uploadedAt: 'desc' },
  });

  return records.map((r) => ({
    id: r.id,
    filename: r.filename,
    originalFilename: r.originalFilename,
    filePath: r.filePath,
    fileSize: r.fileSize,
    mimeType: r.mimeType,
    uploadedAt: r.uploadedAt.toISOString(),
  }));
}

/**
 * Deletes a CV document record and optionally deletes the file.
 */
export async function deleteCVDocumentRecord(id: string): Promise<boolean> {
  try {
    await prisma.cVDocument.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}
