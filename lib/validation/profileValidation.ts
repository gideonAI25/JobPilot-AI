import {
  PersonalInformation,
  ProfessionalSummary,
  EducationEntry,
  WorkExperienceEntry,
  TechnicalSkillEntry,
  ProjectEntry,
  CertificationEntry,
  EmploymentPreferences,
  StandardAnswerEntry,
  EmploymentType,
  ProficiencyLevel,
  SkillCategory,
  RemotePreference,
} from '@/types/profile';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

const VALID_EMPLOYMENT_TYPES: EmploymentType[] = [
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
];

const VALID_PROFICIENCIES: ProficiencyLevel[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

const VALID_SKILL_CATEGORIES: SkillCategory[] = [
  'Frontend',
  'Backend',
  'Full Stack',
  'Database',
  'DevOps / Cloud',
  'Programming Languages',
  'AI / Machine Learning',
  'Testing & QA',
  'Tools & Platforms',
  'Other',
];

const VALID_REMOTE_PREFS: RemotePreference[] = [
  'remote-only',
  'hybrid',
  'onsite-or-remote',
  'any',
];

export function validatePersonalInfo(data: Partial<PersonalInformation>): ValidationResult {
  const errors: string[] = [];

  if (data.email && data.email.trim() && !EMAIL_REGEX.test(data.email.trim())) {
    errors.push('Invalid email address format.');
  }

  if (data.linkedInUrl && data.linkedInUrl.trim()) {
    const url = data.linkedInUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.includes('linkedin.com')) {
      errors.push('LinkedIn URL must be a valid web address.');
    }
  }

  if (data.portfolioUrl && data.portfolioUrl.trim()) {
    const url = data.portfolioUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      errors.push('Portfolio URL must start with http:// or https://.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSummary(data: Partial<ProfessionalSummary>): ValidationResult {
  const errors: string[] = [];
  if (data.headline && data.headline.length > 300) {
    errors.push('Professional headline cannot exceed 300 characters.');
  }
  if (data.summary && data.summary.length > 10000) {
    errors.push('Professional summary cannot exceed 10,000 characters.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateEducationEntry(data: Partial<EducationEntry>): ValidationResult {
  const errors: string[] = [];
  if (!data.institution || !data.institution.trim()) {
    errors.push('Institution name is required.');
  }
  if (!data.degree || !data.degree.trim()) {
    errors.push('Degree is required.');
  }
  if (!data.fieldOfStudy || !data.fieldOfStudy.trim()) {
    errors.push('Field of study is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateWorkExperienceEntry(data: Partial<WorkExperienceEntry>): ValidationResult {
  const errors: string[] = [];
  if (!data.company || !data.company.trim()) {
    errors.push('Company name is required.');
  }
  if (!data.position || !data.position.trim()) {
    errors.push('Position/Title is required.');
  }
  if (data.employmentType && !VALID_EMPLOYMENT_TYPES.includes(data.employmentType)) {
    errors.push(`Invalid employment type: ${data.employmentType}`);
  }
  if (!data.startDate || !data.startDate.trim()) {
    errors.push('Start date is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTechnicalSkillEntry(data: Partial<TechnicalSkillEntry>): ValidationResult {
  const errors: string[] = [];
  if (!data.name || !data.name.trim()) {
    errors.push('Skill name is required.');
  }
  if (data.category && !VALID_SKILL_CATEGORIES.includes(data.category)) {
    errors.push(`Invalid skill category: ${data.category}`);
  }
  if (data.proficiency && !VALID_PROFICIENCIES.includes(data.proficiency)) {
    errors.push(`Invalid proficiency level: ${data.proficiency}`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateProjectEntry(data: Partial<ProjectEntry>): ValidationResult {
  const errors: string[] = [];
  if (!data.name || !data.name.trim()) {
    errors.push('Project name is required.');
  }
  if (!data.description || !data.description.trim()) {
    errors.push('Project description is required.');
  }
  if (data.projectUrl && data.projectUrl.trim()) {
    const url = data.projectUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      errors.push('Project URL must start with http:// or https://.');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateCertificationEntry(data: Partial<CertificationEntry>): ValidationResult {
  const errors: string[] = [];
  if (!data.name || !data.name.trim()) {
    errors.push('Certification name is required.');
  }
  if (!data.issuingOrganization || !data.issuingOrganization.trim()) {
    errors.push('Issuing organization is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateEmploymentPreferences(data: Partial<EmploymentPreferences>): ValidationResult {
  const errors: string[] = [];
  if (data.remoteWorkPreference && !VALID_REMOTE_PREFS.includes(data.remoteWorkPreference)) {
    errors.push(`Invalid remote preference: ${data.remoteWorkPreference}`);
  }
  if (data.minSalaryExpectation) {
    const amt = data.minSalaryExpectation.amount;
    if (amt !== null && amt !== undefined && (typeof amt !== 'number' || amt < 0)) {
      errors.push('Minimum salary must be a positive number.');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateStandardAnswerEntry(data: Partial<StandardAnswerEntry>): ValidationResult {
  const errors: string[] = [];
  if (!data.question || !data.question.trim()) {
    errors.push('Question is required.');
  }
  if (!data.answer || !data.answer.trim()) {
    errors.push('Answer is required.');
  }
  return { valid: errors.length === 0, errors };
}
