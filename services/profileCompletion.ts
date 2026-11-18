import {
  CandidateProfile,
  ProfileCompletionSummary,
  ProfileSectionId,
  SectionStatus,
} from '@/types/profile';

/**
 * Calculates the completion status of an individual profile section.
 */
export function calculateSectionStatus(
  sectionId: ProfileSectionId,
  profile: CandidateProfile
): SectionStatus {
  switch (sectionId) {
    case 'personal': {
      const missing: string[] = [];
      const { fullName, email, phone, country, city } = profile.personalInfo;
      if (!fullName?.trim()) missing.push('Full Name');
      if (!email?.trim()) missing.push('Email');
      if (!phone?.trim()) missing.push('Phone Number');
      if (!country?.trim()) missing.push('Country');
      if (!city?.trim()) missing.push('City');

      return {
        id: 'personal',
        title: 'Personal Information',
        description: 'Contact details and online professional presence',
        isComplete: missing.length === 0,
        missingFields: missing,
      };
    }

    case 'summary': {
      const missing: string[] = [];
      const { headline, summary } = profile.summary;
      if (!headline?.trim()) missing.push('Professional Headline');
      if (!summary?.trim()) missing.push('Summary / About Text');

      return {
        id: 'summary',
        title: 'Professional Summary',
        description: 'Elevator pitch and executive overview',
        isComplete: missing.length === 0,
        missingFields: missing,
      };
    }

    case 'education': {
      const count = profile.education.length;
      const missing: string[] = [];
      if (count === 0) {
        missing.push('At least one education record');
      }

      return {
        id: 'education',
        title: 'Education',
        description: 'Degrees, academic institutions, and coursework',
        isComplete: count > 0,
        itemCount: count,
        missingFields: missing,
      };
    }

    case 'experience': {
      const count = profile.workExperience.length;
      const missing: string[] = [];
      if (count === 0) {
        missing.push('At least one work experience record');
      }

      return {
        id: 'experience',
        title: 'Work Experience',
        description: 'Career history, key roles, and achievements',
        isComplete: count > 0,
        itemCount: count,
        missingFields: missing,
      };
    }

    case 'skills': {
      const count = profile.technicalSkills.length;
      const missing: string[] = [];
      if (count < 3) {
        missing.push(`Add at least 3 skills (${count}/3 added)`);
      }

      return {
        id: 'skills',
        title: 'Technical Skills',
        description: 'Core competencies, languages, and tools',
        isComplete: count >= 3,
        itemCount: count,
        missingFields: missing,
      };
    }

    case 'projects': {
      const count = profile.projects.length;
      const missing: string[] = [];
      if (count === 0) {
        missing.push('At least one featured project');
      }

      return {
        id: 'projects',
        title: 'Projects',
        description: 'Notable projects, portfolios, and repositories',
        isComplete: count > 0,
        itemCount: count,
        missingFields: missing,
      };
    }

    case 'certifications': {
      const count = profile.certifications.length;
      const missing: string[] = [];
      if (count === 0) {
        missing.push('At least one certification (optional but recommended)');
      }

      return {
        id: 'certifications',
        title: 'Certifications',
        description: 'Accredited certificates and licenses',
        isComplete: count > 0,
        itemCount: count,
        missingFields: missing,
      };
    }

    case 'preferences': {
      const missing: string[] = [];
      const { targetJobTitles, preferredEmploymentTypes, preferredSeniority } = profile.preferences;
      if (!targetJobTitles || targetJobTitles.length === 0) {
        missing.push('At least one target job title');
      }
      if (!preferredEmploymentTypes || preferredEmploymentTypes.length === 0) {
        missing.push('Preferred employment type(s)');
      }
      if (!preferredSeniority || preferredSeniority.length === 0) {
        missing.push('Target seniority level');
      }

      return {
        id: 'preferences',
        title: 'Employment Preferences',
        description: 'Target roles, remote options, locations & salary',
        isComplete: missing.length === 0,
        missingFields: missing,
      };
    }

    case 'standard-answers': {
      const count = profile.standardAnswers.length;
      const missing: string[] = [];
      if (count === 0) {
        missing.push('At least one verified standard answer');
      }

      return {
        id: 'standard-answers',
        title: 'Standard Application Answers',
        description: 'Answers for recurring job application questions',
        isComplete: count > 0,
        itemCount: count,
        missingFields: missing,
      };
    }

    case 'cv-documents': {
      const count = profile.cvDocuments?.length || 0;
      const missing: string[] = [];
      if (count === 0) {
        missing.push('At least one uploaded CV document');
      }

      return {
        id: 'cv-documents',
        title: 'CV Documents',
        description: 'Uploaded resumes and CV source files',
        isComplete: count > 0,
        itemCount: count,
        missingFields: missing,
      };
    }
  }
}

/**
 * Calculates aggregate profile completion across all sections.
 */
export function calculateProfileCompletion(profile: CandidateProfile): ProfileCompletionSummary {
  const sectionsList: ProfileSectionId[] = [
    'personal',
    'summary',
    'education',
    'experience',
    'skills',
    'projects',
    'certifications',
    'preferences',
    'standard-answers',
    'cv-documents',
  ];

  const sections = {} as Record<ProfileSectionId, SectionStatus>;
  let completedCount = 0;

  for (const sectionId of sectionsList) {
    const status = calculateSectionStatus(sectionId, profile);
    sections[sectionId] = status;
    if (status.isComplete) {
      completedCount++;
    }
  }

  const totalSections = sectionsList.length;
  const completionPercentage = Math.round((completedCount / totalSections) * 100);

  return {
    totalSections,
    completedSections: completedCount,
    completionPercentage,
    sections,
    isFullyComplete: completedCount === totalSections,
  };
}
