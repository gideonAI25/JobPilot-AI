export interface TailoredCVSkillCategory {
  category: string;
  skills: string[];
}

export interface TailoredCVWorkExperience {
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string;
  isCurrentRole: boolean;
  employmentType?: string;
  highlights: string[];
}

export interface TailoredCVProject {
  name: string;
  description: string;
  technologies: string[];
  projectUrl?: string;
  highlights?: string[];
}

export interface TailoredCVEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  graduationDate: string;
  academicDetails?: string;
}

export interface TailoredCVCertification {
  name: string;
  issuingOrganization: string;
  dateObtained: string;
  credentialUrl?: string;
}

export interface TailoredCVContent {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedInUrl?: string;
    portfolioUrl?: string;
    targetTitle: string;
  };
  professionalSummary: string;
  skills: TailoredCVSkillCategory[];
  workExperience: TailoredCVWorkExperience[];
  projects: TailoredCVProject[];
  education: TailoredCVEducation[];
  certifications: TailoredCVCertification[];
  flaggedGaps: string[];
  tailoringRationale: string;
}

export interface CVGenerationOptions {
  customInstructions?: string;
  providerId?: string;
}

export interface CVGenerationResult {
  success: boolean;
  documentId?: string;
  version?: number;
  filePath?: string;
  originalFilename?: string;
  cvContent?: TailoredCVContent;
  flaggedGaps?: string[];
  requiresManualConfirmation?: boolean;
  error?: string;
}
