import {
  JobSourceAdapter,
  SourceAdapterMetadata,
  FetchOptions,
  FetchResult,
  RawJobPosting,
} from '../types';
import { cleanHtmlDescription } from '../utils/htmlCleaner';

export interface JobicyAdapterConfig {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
}

export class JobicyAdapter implements JobSourceAdapter {
  public metadata: SourceAdapterMetadata;
  private baseUrl: string;
  private userAgent: string;
  private timeoutMs: number;

  constructor(config: JobicyAdapterConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://jobicy.com/api/v2/remote-jobs';
    this.userAgent =
      config.userAgent ||
      'JobPilotAI/1.0 (https://github.com/gideonAI25/JobPilot-AI; automated-job-discovery)';
    this.timeoutMs = config.timeoutMs || 15000;

    this.metadata = {
      id: 'jobicy',
      name: 'Jobicy',
      type: 'api',
      baseUrl: 'https://jobicy.com',
      rateLimit: {
        requestsPerMinute: 30,
        minIntervalMs: 2000,
      },
      supportsSearch: true,
    };
  }

  public async fetchJobs(options?: FetchOptions): Promise<FetchResult> {
    const fetchedAt = new Date();

    try {
      const url = new URL(this.baseUrl);
      if (options?.limit && options.limit > 0) {
        url.searchParams.set('count', Math.min(options.limit, 50).toString());
      } else {
        url.searchParams.set('count', '30');
      }

      if (options?.query) {
        url.searchParams.set('tag', options.query);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 429) {
        return {
          success: false,
          rawJobs: [],
          totalFetched: 0,
          rateLimited: true,
          error: 'Jobicy rate limit reached (HTTP 429). Backing off.',
          fetchedAt,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          rawJobs: [],
          totalFetched: 0,
          error: `Jobicy returned HTTP error ${res.status}: ${res.statusText}`,
          fetchedAt,
        };
      }

      const data = await res.json();
      const items: any[] = Array.isArray(data?.jobs) ? data.jobs : [];

      const rawJobs: RawJobPosting[] = [];

      for (const item of items) {
        if (!item || !item.jobTitle || !item.url) continue;

        // Salary formatting
        let salary: string | null = null;
        const min = Number(item.salaryMin) || 0;
        const max = Number(item.salaryMax) || 0;
        const currency = item.salaryCurrency || 'USD';
        const period = item.salaryPeriod || 'year';

        if (min > 0 && max > 0) {
          salary = `${currency} ${min.toLocaleString()} - ${max.toLocaleString()} / ${period}`;
        } else if (min > 0) {
          salary = `From ${currency} ${min.toLocaleString()} / ${period}`;
        } else if (max > 0) {
          salary = `Up to ${currency} ${max.toLocaleString()} / ${period}`;
        }

        // Employment type
        let employmentType: string | null = null;
        const rawTypes: string[] = Array.isArray(item.jobType)
          ? item.jobType
          : typeof item.jobType === 'string'
          ? [item.jobType]
          : [];

        const typeStr = rawTypes.join(' ').toLowerCase();
        if (typeStr.includes('full')) {
          employmentType = 'full-time';
        } else if (typeStr.includes('part')) {
          employmentType = 'part-time';
        } else if (typeStr.includes('contract')) {
          employmentType = 'contract';
        } else if (typeStr.includes('freelance')) {
          employmentType = 'freelance';
        } else if (typeStr.includes('intern')) {
          employmentType = 'internship';
        }

        // Experience Level
        let experienceLevel: string | null = null;
        const levelStr = String(item.jobLevel || '').toLowerCase();
        if (levelStr.includes('junior') || levelStr.includes('entry')) {
          experienceLevel = 'Junior';
        } else if (levelStr.includes('lead') || levelStr.includes('director') || levelStr.includes('head')) {
          experienceLevel = 'Lead';
        } else if (levelStr.includes('staff') || levelStr.includes('principal')) {
          experienceLevel = 'Staff';
        } else if (levelStr.includes('senior') || levelStr.includes('sr')) {
          experienceLevel = 'Senior';
        } else if (levelStr.includes('mid')) {
          experienceLevel = 'Mid-Level';
        }

        // Skills / Industry keywords
        const skills: string[] = [];
        if (Array.isArray(item.jobIndustry)) {
          skills.push(...item.jobIndustry.filter(Boolean));
        } else if (typeof item.jobIndustry === 'string') {
          skills.push(item.jobIndustry);
        }

        // Posted Date
        let postedAt: Date | null = null;
        if (item.pubDate) {
          const p = new Date(item.pubDate);
          if (!isNaN(p.getTime())) postedAt = p;
        }

        const description = cleanHtmlDescription(
          item.jobDescription || item.jobExcerpt || item.jobTitle
        );

        const rawPosting: RawJobPosting = {
          externalId: item.id ? String(item.id) : null,
          title: String(item.jobTitle).trim(),
          company: String(item.companyName || 'Unknown Company').trim(),
          description: description || item.jobTitle,
          url: item.url.trim(),
          applicationUrl: item.url.trim(),
          location: item.jobGeo?.trim() || 'Remote (Worldwide)',
          workArrangement: 'remote',
          employmentType,
          experienceLevel,
          skills,
          salary,
          deadline: null, // Jobicy does not specify application deadline; preserved as null
          postedAt,
          rawPayload: {
            jobSlug: item.jobSlug,
            jobIndustry: item.jobIndustry,
            jobLevel: item.jobLevel,
          },
        };

        rawJobs.push(rawPosting);
      }

      return {
        success: true,
        rawJobs,
        totalFetched: rawJobs.length,
        fetchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        rawJobs: [],
        totalFetched: 0,
        error: err.name === 'AbortError' ? 'Jobicy API request timed out.' : err.message,
        fetchedAt,
      };
    }
  }

  public async validateConfig(): Promise<boolean> {
    return Boolean(this.baseUrl);
  }
}
