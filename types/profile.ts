/**
 * Candidate Profile Types for JobPilot AI
 *
 * Defines the structured data model for candidate professional information
 * and employment preferences. Designed to serve as the verified source of truth
 * for AI evaluation and to map cleanly to future Prisma models.
 */

export type ProfileSectionId =
  | 'personal'
  | 'summary'
  | 'education'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'preferences'
  | 'standard-answers'
  | 'cv-documents';

export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'freelance'
  | 'internship';

export type ProficiencyLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert';

export type SkillCategory =
  | 'Frontend'
  | 'Backend'
  | 'Full Stack'
  | 'Database'
  | 'DevOps / Cloud'
  | 'Programming Languages'
  | 'AI / Machine Learning'
  | 'Testing & QA'
  | 'Tools & Platforms'
  | 'Other';

export type SeniorityLevel =
  | 'Junior'
  | 'Mid-Level'
  | 'Senior'
  | 'Lead'
  | 'Staff / Principal'
  | 'Director / Executive';

export type RemotePreference =
  | 'remote-only'
  | 'hybrid'
  | 'onsite-or-remote'
  | 'any';

export type SalaryPeriod = 'yearly' | 'monthly' | 'hourly';

// 1. Personal Information
export interface PersonalInformation {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  linkedInUrl: string;
  portfolioUrl: string;
}

// 2. Professional Summary
export interface ProfessionalSummary {
  headline: string;
  summary: string;
}

// 3. Education
export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  graduationDate: string;
  academicDetails: string; // GPA, honors, notable coursework, etc.
}

// 4. Work Experience
export interface WorkExperienceEntry {
  id: string;
  company: string;
  position: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string;
  isCurrentRole: boolean;
  responsibilities: string[]; // Key day-to-day duties
  achievements: string[]; // Tangible outcomes / metrics
}

// 5. Technical Skills
export interface TechnicalSkillEntry {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: ProficiencyLevel;
}

// 6. Projects
export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  projectUrl: string;
  keyResponsibilities: string;
}

// 7. Certifications
export interface CertificationEntry {
  id: string;
  name: string;
  issuingOrganization: string;
  dateObtained: string;
  credentialUrl: string;
}

// 8. Employment Preferences
export interface SalaryExpectation {
  currency: string;
  amount: number | null;
  period: SalaryPeriod;
}

export interface EmploymentPreferences {
  targetJobTitles: string[];
  preferredEmploymentTypes: EmploymentType[];
  preferredSeniority: SeniorityLevel[];
  remoteWorkPreference: RemotePreference;
  preferredCountries: string[];
  excludedLocations: string[];
  minSalaryExpectation: SalaryExpectation;
}

// 9. Standard Application Answers
export interface StandardAnswerEntry {
  id: string;
  question: string;
  answer: string;
  category: string; // e.g. 'Work Authorization', 'Availability', 'Salary', 'Custom'
}

// 10. Uploaded CV Document Record
export interface CVDocRecord {
  id: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// Aggregate Candidate Profile
export interface CandidateProfile {
  id?: string;
  personalInfo: PersonalInformation;
  summary: ProfessionalSummary;
  education: EducationEntry[];
  workExperience: WorkExperienceEntry[];
  technicalSkills: TechnicalSkillEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  preferences: EmploymentPreferences;
  standardAnswers: StandardAnswerEntry[];
  cvDocuments?: CVDocRecord[];
  completionPercentage?: number;
  completedSections?: string[];
  isFullyComplete?: boolean;
  lastUpdated?: string;
}

// Profile Completion & Section Status Types
export interface SectionStatus {
  id: ProfileSectionId;
  title: string;
  description: string;
  isComplete: boolean;
  itemCount?: number;
  missingFields: string[];
}

export interface ProfileCompletionSummary {
  totalSections: number;
  completedSections: number;
  completionPercentage: number;
  sections: Record<ProfileSectionId, SectionStatus>;
  isFullyComplete: boolean;
}
