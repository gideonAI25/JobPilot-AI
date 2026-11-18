import {
  PersonalInformation,
  ProfessionalSummary,
  EducationEntry,
  WorkExperienceEntry,
  TechnicalSkillEntry,
  ProjectEntry,
  CertificationEntry,
  ProfileSectionId,
} from './profile';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ExtractedSectionReview<T> {
  sectionId: ProfileSectionId;
  sectionTitle: string;
  status: ReviewStatus; // Always defaults to 'pending'; NEVER automatically approved!
  isExtracted: boolean;
  extractedData: T;
  editedData: T; // User can modify extracted values before approving
  rawSnippet?: string; // Original text fragment extracted from CV for verification
  missingFields: string[]; // Clearly identify fields that could not be extracted
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface CVExtractionResult {
  documentId: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  rawText: string;
  charCount: number;
  unextractedSections: string[];
  sections: {
    personal: ExtractedSectionReview<PersonalInformation>;
    summary: ExtractedSectionReview<ProfessionalSummary>;
    education: ExtractedSectionReview<EducationEntry[]>;
    experience: ExtractedSectionReview<WorkExperienceEntry[]>;
    skills: ExtractedSectionReview<TechnicalSkillEntry[]>;
    projects: ExtractedSectionReview<ProjectEntry[]>;
    certifications: ExtractedSectionReview<CertificationEntry[]>;
  };
}

export interface DocumentUploadResponse {
  success: boolean;
  extraction?: CVExtractionResult;
  error?: string;
}
