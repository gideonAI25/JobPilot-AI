export interface JobEvaluationSummary {
  id: string;
  overallMatchScore: number;
  scoringDimensions: Record<string, number>;
  eligibility: string; // 'ELIGIBLE' | 'BORDERLINE' | 'INELIGIBLE'
  explanation: string;
  missingQualifications: string[];
  concerns: string[];
  strengths: string[];
  recommendation: string; // 'HIGHLY_RECOMMENDED' | 'CONSIDER' | 'NOT_RECOMMENDED'
  evaluatedAt: string;
}

export interface JobListItem {
  id: string;
  sourceId: string | null;
  sourceName: string;
  externalId: string | null;
  title: string;
  company: string;
  description: string;
  url: string;
  applicationUrl: string | null;
  location: string;
  workArrangement: string; // 'remote' | 'hybrid' | 'on-site'
  employmentType: string | null; // 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship'
  experienceLevel: string | null; // 'Junior' | 'Mid-Level' | 'Senior' | 'Lead' | 'Staff'
  skills: string[];
  salary: string | null;
  deadline: string | null;
  postedAt: string | null;
  discoveredAt: string;
  evaluation: JobEvaluationSummary | null;
  applicationId: string | null;
  applicationStatus: string | null;
}

export interface ManualJobInput {
  url: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  applicationUrl?: string;
  workArrangement?: string;
  employmentType?: string;
  experienceLevel?: string;
  salary?: string;
  skills?: string[];
  deadline?: string;
}

export interface JobFilterParams {
  search?: string;
  company?: string;
  location?: string;
  workArrangement?: string;
  employmentType?: string;
  experienceLevel?: string;
  minScore?: number;
  eligibility?: string;
}
