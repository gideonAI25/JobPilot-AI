export interface RawJobPosting {
  externalId?: string | null;
  title: string;
  company: string;
  description: string;
  url: string;
  applicationUrl?: string | null;
  location?: string | null;
  workArrangement?: string | null; // e.g. "remote", "Remote - US Only", "Hybrid", "On-site"
  employmentType?: string | null; // e.g. "Full Time", "contract", "freelance"
  experienceLevel?: string | null; // e.g. "Senior", "Mid Level", "Staff", "Junior"
  skills?: string[] | string | null;
  salary?: string | null;
  deadline?: string | Date | null;
  postedAt?: string | Date | null;
  rawPayload?: Record<string, any>;
}

export interface NormalizedJobPosting {
  sourceName: string;
  externalId: string | null;
  title: string;
  company: string;
  description: string;
  url: string; // canonicalized, stripped of tracking queries
  applicationUrl: string | null;
  location: string;
  workArrangement: 'remote' | 'hybrid' | 'on-site';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | null;
  experienceLevel: 'Junior' | 'Mid-Level' | 'Senior' | 'Lead' | 'Staff' | null;
  skills: string[];
  salary: string | null;
  deadline: Date | null;
  postedAt: Date | null;
  fingerprint: string; // canonical cross-source fingerprint
}

export type DeduplicationReason =
  | 'EXACT_URL'
  | 'EXTERNAL_ID'
  | 'CROSS_SOURCE_MATCH'
  | 'PREVIOUSLY_REJECTED_OR_EXPIRED';

export interface DeduplicationResult {
  isDuplicate: boolean;
  reason?: DeduplicationReason;
  existingJobId?: string;
  details?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SourceAdapterMetadata {
  id: string; // unique identifier e.g. 'mock-feed', 'remoteok'
  name: string; // human readable name
  type: 'api' | 'rss' | 'scraper' | 'mock';
  baseUrl: string;
  rateLimit?: {
    requestsPerMinute: number;
    minIntervalMs: number;
  };
  supportsSearch?: boolean;
}

export interface FetchOptions {
  limit?: number;
  query?: string;
  tags?: string[];
  since?: Date;
}

export interface FetchResult {
  success: boolean;
  rawJobs: RawJobPosting[];
  totalFetched: number;
  rateLimited?: boolean;
  error?: string;
  fetchedAt: Date;
}

export interface JobSourceAdapter {
  metadata: SourceAdapterMetadata;
  fetchJobs(options?: FetchOptions): Promise<FetchResult>;
  validateConfig?(): Promise<boolean>;
}

export interface DiscoveryRunReport {
  runId: string;
  startTime: Date;
  completionTime: Date;
  sourcesPolled: number;
  totalRawFetched: number;
  validJobsCount: number;
  invalidJobsSkipped: number;
  duplicatesSkipped: {
    exactUrl: number;
    externalId: number;
    crossSource: number;
    previouslyRejectedOrExpired: number;
    total: number;
  };
  newJobsSaved: number;
  savedJobIds: string[];
  errors: string[];
  sourceBreakdowns: Record<
    string,
    {
      sourceName: string;
      rawFetched: number;
      saved: number;
      duplicates: number;
      invalid: number;
      status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      error?: string;
    }
  >;
}
