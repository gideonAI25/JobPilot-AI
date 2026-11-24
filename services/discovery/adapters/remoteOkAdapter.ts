import {
  JobSourceAdapter,
  SourceAdapterMetadata,
  FetchOptions,
  FetchResult,
  RawJobPosting,
} from '../types';
import { cleanHtmlDescription } from '../utils/htmlCleaner';

export interface RemoteOkAdapterConfig {
  endpointUrl?: string;
  userAgent?: string;
  requestTimeoutMs?: number;
}

export class RemoteOkAdapter implements JobSourceAdapter {
  public metadata: SourceAdapterMetadata;
  private endpointUrl: string;
  private userAgent: string;
  private timeoutMs: number;

  constructor(config: RemoteOkAdapterConfig = {}) {
    this.endpointUrl = config.endpointUrl || 'https://remoteok.com/api';
    this.userAgent =
      config.userAgent ||
      'JobPilotAI/1.0 (https://github.com/gideonAI25/JobPilot-AI; automated-job-discovery)';
    this.timeoutMs = config.requestTimeoutMs || 15000;

    this.metadata = {
      id: 'remoteok',
      name: 'RemoteOK',
      type: 'api',
      baseUrl: 'https://remoteok.com',
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(this.endpointUrl, {
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
          error: 'RemoteOK API rate limit exceeded (HTTP 429). Please back off before next request.',
          fetchedAt,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          rawJobs: [],
          totalFetched: 0,
          error: `RemoteOK returned HTTP error ${res.status}: ${res.statusText}`,
          fetchedAt,
        };
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        return {
          success: false,
          rawJobs: [],
          totalFetched: 0,
          error: 'RemoteOK API response format invalid: expected JSON array.',
          fetchedAt,
        };
      }

      // First item in RemoteOK is a legal disclaimer object, skip it
      const rawItems = data.filter(
        (item: any) => item && typeof item === 'object' && !item.legal && item.id && item.position
      );

      const rawJobs: RawJobPosting[] = [];

      for (const item of rawItems) {
        // Extract salary if available
        let salary: string | null = null;
        const minSalary = Number(item.salary_min) || 0;
        const maxSalary = Number(item.salary_max) || 0;
        if (minSalary > 0 && maxSalary > 0) {
          salary = `$${minSalary.toLocaleString()} - $${maxSalary.toLocaleString()} USD/year`;
        } else if (minSalary > 0) {
          salary = `From $${minSalary.toLocaleString()} USD/year`;
        } else if (maxSalary > 0) {
          salary = `Up to $${maxSalary.toLocaleString()} USD/year`;
        }

        // Tags and skills
        const tags: string[] = Array.isArray(item.tags)
          ? item.tags.map((t: any) => String(t).trim()).filter(Boolean)
          : [];

        // Detect employment type from tags or position
        let employmentType: string | null = null;
        const lowerTags = tags.map((t) => t.toLowerCase());
        const lowerPosition = String(item.position || '').toLowerCase();
        if (lowerTags.includes('internship') || lowerPosition.includes('intern')) {
          employmentType = 'internship';
        } else if (lowerTags.includes('contract') || lowerTags.includes('freelance')) {
          employmentType = 'contract';
        } else if (lowerTags.includes('part-time') || lowerTags.includes('parttime')) {
          employmentType = 'part-time';
        } else if (lowerTags.includes('full-time') || lowerTags.includes('fulltime')) {
          employmentType = 'full-time';
        }

        // Detect experience level
        let experienceLevel: string | null = null;
        if (
          lowerPosition.includes('junior') ||
          lowerPosition.includes('entry level') ||
          lowerPosition.includes('graduate') ||
          lowerTags.includes('junior')
        ) {
          experienceLevel = 'Junior';
        } else if (
          lowerPosition.includes('lead') ||
          lowerPosition.includes('head') ||
          lowerTags.includes('lead')
        ) {
          experienceLevel = 'Lead';
        } else if (
          lowerPosition.includes('staff') ||
          lowerPosition.includes('principal')
        ) {
          experienceLevel = 'Staff';
        } else if (
          lowerPosition.includes('senior') ||
          lowerPosition.includes('sr.') ||
          lowerTags.includes('senior')
        ) {
          experienceLevel = 'Senior';
        }

        // Posting date
        let postedAt: Date | null = null;
        if (item.date) {
          const parsed = new Date(item.date);
          if (!isNaN(parsed.getTime())) postedAt = parsed;
        } else if (item.epoch) {
          const parsed = new Date(Number(item.epoch) * 1000);
          if (!isNaN(parsed.getTime())) postedAt = parsed;
        }

        const cleanedDescription = cleanHtmlDescription(item.description || '');

        const jobUrl = item.url
          ? item.url.startsWith('http')
            ? item.url
            : `https://remoteok.com${item.url}`
          : `https://remoteok.com/remote-jobs/${item.id}`;

        const rawPosting: RawJobPosting = {
          externalId: String(item.id),
          title: String(item.position).trim(),
          company: String(item.company || 'Unknown Company').trim(),
          description: cleanedDescription || item.position,
          url: jobUrl,
          applicationUrl: item.apply_url?.trim() || null,
          location: item.location?.trim() || 'Remote (Worldwide)',
          workArrangement: 'remote',
          employmentType,
          experienceLevel,
          skills: tags,
          salary,
          deadline: null, // RemoteOK does not supply deadlines; strictly preserved as null
          postedAt,
          rawPayload: {
            slug: item.slug,
            tags: item.tags,
            originalUrl: item.url,
          },
        };

        // Query filtering if requested
        if (options?.query) {
          const q = options.query.toLowerCase();
          const skillsMatch = Array.isArray(rawPosting.skills)
            ? rawPosting.skills.some((s: string) => s.toLowerCase().includes(q))
            : typeof rawPosting.skills === 'string'
            ? (rawPosting.skills as string).toLowerCase().includes(q)
            : false;
          const matches =
            rawPosting.title.toLowerCase().includes(q) ||
            rawPosting.company.toLowerCase().includes(q) ||
            skillsMatch ||
            rawPosting.description.toLowerCase().includes(q);
          if (!matches) continue;
        }

        rawJobs.push(rawPosting);

        // Limit check
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
        error: err.name === 'AbortError' ? 'RemoteOK request timed out.' : err.message,
        fetchedAt,
      };
    }
  }

  public async validateConfig(): Promise<boolean> {
    return Boolean(this.endpointUrl);
  }
}
