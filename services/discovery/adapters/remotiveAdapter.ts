import {
  JobSourceAdapter,
  SourceAdapterMetadata,
  FetchOptions,
  FetchResult,
  RawJobPosting,
} from '../types';
import { cleanHtmlDescription } from '../utils/htmlCleaner';

export interface RemotiveAdapterConfig {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
}

export class RemotiveAdapter implements JobSourceAdapter {
  public metadata: SourceAdapterMetadata;
  private baseUrl: string;
  private userAgent: string;
  private timeoutMs: number;

  constructor(config: RemotiveAdapterConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://remotive.com/api/remote-jobs';
    this.userAgent =
      config.userAgent ||
      'JobPilotAI/1.0 (https://github.com/gideonAI25/JobPilot-AI; automated-job-discovery)';
    this.timeoutMs = config.timeoutMs || 15000;

    this.metadata = {
      id: 'remotive',
      name: 'Remotive',
      type: 'api',
      baseUrl: 'https://remotive.com',
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
        url.searchParams.set('limit', Math.min(options.limit, 50).toString());
      } else {
        url.searchParams.set('limit', '30');
      }

      if (options?.query) {
        url.searchParams.set('search', options.query);
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
          error: 'Remotive rate limit reached (HTTP 429). Backing off.',
          fetchedAt,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          rawJobs: [],
          totalFetched: 0,
          error: `Remotive returned HTTP error ${res.status}: ${res.statusText}`,
          fetchedAt,
        };
      }

      const data = await res.json();
      const items: any[] = Array.isArray(data?.jobs) ? data.jobs : [];

      const rawJobs: RawJobPosting[] = [];

      for (const item of items) {
        if (!item || !item.title || !item.url) continue;

        // Salary: preserve truthfully or null
        const rawSalary = typeof item.salary === 'string' ? item.salary.trim() : null;
        const salary = rawSalary && rawSalary.length > 0 ? rawSalary : null;

        // Employment type mapping
        let employmentType: string | null = null;
        const rawType = String(item.job_type || '').toLowerCase();
        if (rawType.includes('full')) {
          employmentType = 'full-time';
        } else if (rawType.includes('part')) {
          employmentType = 'part-time';
        } else if (rawType.includes('contract') || rawType.includes('freelance')) {
          employmentType = 'contract';
        } else if (rawType.includes('intern')) {
          employmentType = 'internship';
        }

        // Seniority / Experience level extraction
        let experienceLevel: string | null = null;
        const combinedText = `${item.title} ${(item.tags || []).join(' ')}`.toLowerCase();
        if (combinedText.includes('intern')) {
          experienceLevel = 'Internship';
        } else if (combinedText.includes('junior') || combinedText.includes('entry') || combinedText.includes('associate')) {
          experienceLevel = 'Junior';
        } else if (combinedText.includes('lead') || combinedText.includes('director') || combinedText.includes('head')) {
          experienceLevel = 'Lead';
        } else if (combinedText.includes('staff') || combinedText.includes('principal')) {
          experienceLevel = 'Staff';
        } else if (combinedText.includes('senior') || combinedText.includes('sr.') || combinedText.includes('sr ')) {
          experienceLevel = 'Senior';
        } else if (combinedText.includes('mid') || combinedText.includes('intermediate')) {
          experienceLevel = 'Mid-Level';
        }

        // Skills & tags
        const skills: string[] = [];
        if (Array.isArray(item.tags)) {
          skills.push(...item.tags.filter((t: any) => typeof t === 'string' && t.trim().length > 0));
        }
        if (item.category && typeof item.category === 'string' && !skills.includes(item.category)) {
          skills.push(item.category);
        }

        // Publication date
        let postedAt: Date | null = null;
        if (item.publication_date) {
          const d = new Date(item.publication_date);
          if (!isNaN(d.getTime())) postedAt = d;
        }

        // Description
        const descHtml = item.description || item.title;
        const cleanedDesc = cleanHtmlDescription(descHtml);

        // Location / Geographic eligibility
        const location = item.candidate_required_location?.trim() || 'Remote (Worldwide)';

        const rawPosting: RawJobPosting = {
          externalId: item.id ? String(item.id) : null,
          title: item.title.trim(),
          company: item.company_name?.trim() || 'Unknown Company',
          description: cleanedDesc || item.title.trim(),
          url: item.url.trim(),
          applicationUrl: item.url.trim(),
          location,
          workArrangement: 'remote', // Remotive listings are 100% remote
          employmentType,
          experienceLevel,
          skills,
          salary,
          deadline: null, // Remotive does not provide an application deadline; preserved as null
          postedAt,
          rawPayload: {
            category: item.category,
            tags: item.tags,
            candidate_required_location: item.candidate_required_location,
            company_logo: item.company_logo,
          },
        };

        rawJobs.push(rawPosting);

        // Respect limit if specified
        if (options?.limit && rawJobs.length >= options.limit) {
          break;
        }
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
        error:
          err.name === 'AbortError'
            ? 'Remotive API request timed out.'
            : err.message,
        fetchedAt,
      };
    }
  }
}
