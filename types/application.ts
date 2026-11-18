export type ApplicationStatus =
  | 'DISCOVERED'
  | 'EVALUATING'
  | 'NEEDS_REVIEW'
  | 'PREPARING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'READY_TO_SUBMIT'
  | 'APPLIED'
  | 'EXPIRED'
  | 'ARCHIVED';

export const ALL_APPLICATION_STATUSES: ApplicationStatus[] = [
  'DISCOVERED',
  'EVALUATING',
  'NEEDS_REVIEW',
  'PREPARING',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'READY_TO_SUBMIT',
  'APPLIED',
  'EXPIRED',
  'ARCHIVED',
];

export type DocumentType =
  | 'TAILORED_RESUME'
  | 'COVER_LETTER'
  | 'APPLICATION_ANSWERS';

export interface GeneratedDocumentItem {
  id: string;
  applicationId: string;
  documentType: DocumentType | string;
  originalFilename: string;
  filePath: string;
  version: number;
  content: string | null;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationActivityItem {
  id: string;
  action: string;
  level: string;
  details: Record<string, any> | string | null;
  createdAt: string;
}

export interface ApplicationListItem {
  id: string;
  jobId: string | null;
  jobTitle: string;
  company: string;
  location: string;
  workArrangement: string;
  jobUrl: string | null;
  applicationUrl: string | null;
  salary: string | null;
  status: ApplicationStatus;
  matchScore: number | null;
  eligibility: string | null;
  recommendation: string | null;
  preparationDate: string | null;
  reviewDate: string | null;
  approvalDate: string | null;
  submissionDate: string | null;
  deadline: string | null;
  notes: string | null;
  rejectionReason: string | null;
  documentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetail extends ApplicationListItem {
  jobDescription: string | null;
  jobSkills: string[];
  evaluationSummary: {
    overallMatchScore: number;
    eligibility: string;
    explanation: string;
    strengths: string[];
    missingQualifications: string[];
    scoringDimensions: Record<string, number>;
  } | null;
  generatedDocuments: GeneratedDocumentItem[];
  activityHistory: ApplicationActivityItem[];
}

export interface ApplicationFilterParams {
  search?: string; // Search across company, job title, notes
  status?: ApplicationStatus | 'ALL';
  eligibility?: string;
  minScore?: number;
}

export interface ApplicationStatusTransitionInput {
  targetStatus: ApplicationStatus;
  notes?: string;
  rejectionReason?: string;
  submissionDate?: string;
  submissionConfirmation?: boolean; // Required when marking APPLIED
}

export interface ApplicationOverviewMetrics {
  total: number;
  discovered: number;
  evaluating: number;
  needsReview: number;
  preparing: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  readyToSubmit: number;
  applied: number;
  expired: number;
  archived: number;
}
