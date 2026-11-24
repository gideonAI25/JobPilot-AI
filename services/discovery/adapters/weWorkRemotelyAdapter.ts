import {
  JobSourceAdapter,
  SourceAdapterMetadata,
  FetchOptions,
  FetchResult,
  RawJobPosting,
} from '../types';
import { cleanHtmlDescription } from '../utils/htmlCleaner';

export interface WeWorkRemotelyAdapterConfig {
  feedUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
}

export class WeWorkRemotelyAdapter implements JobSourceAdapter {
  public metadata: SourceAdapterMetadata;
  private feedUrl: string;
  private userAgent: string;
  private timeoutMs: number;

  constructor(config: WeWorkRemotelyAdapterConfig = {}) {
    this.feedUrl =
      config.feedUrl ||
      'https://weworkremotely.com/categories/remote-programming-jobs.rss';
    this.userAgent =
      config.userAgent ||
      'JobPilotAI/1.0 (https://github.com/gideonAI25/JobPilot-AI; automated-job-discovery)';
    this.timeoutMs = config.timeoutMs || 15000;

    this.metadata = {
      id: 'weworkremotely',
      name: 'We Work Remotely',
      type: 'rss',
      baseUrl: 'https://weworkremotely.com',
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

      const res = await fetch(this.feedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/rss+xml, application/xml, text/xml',
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
          error: 'WeWorkRemotely rate limit reached (HTTP 429). Backing off.',
          fetchedAt,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          rawJobs: [],
          totalFetched: 0,
          error: `WeWorkRemotely returned HTTP error ${res.status}: ${res.statusText}`,
          fetchedAt,
        };
      }

      const xml = await res.text();
      const rawJobs = this.parseRssItems(xml, options);

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
            ? 'WeWorkRemotely RSS request timed out.'
            : err.message,
        fetchedAt,
      };
    }
  }

  private parseRssItems(xml: string, options?: FetchOptions): RawJobPosting[] {
    const rawJobs: RawJobPosting[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];

      // Extract title
      const rawTitle = this.extractTag(itemContent, 'title');
      if (!rawTitle) continue;

      // WeWorkRemotely formats title as "Company: Position"
      let company = 'Unknown Company';
      let position = rawTitle;
      const colonIdx = rawTitle.indexOf(':');
      if (colonIdx > 0) {
        company = rawTitle.slice(0, colonIdx).trim();
        position = rawTitle.slice(colonIdx + 1).trim();
      }

      // Extract link & guid
      const link = this.extractTag(itemContent, 'link');
      const guid = this.extractTag(itemContent, 'guid');
      const jobUrl = link || guid;
      if (!jobUrl) continue;

      // Extract region / location
      const region = this.extractTag(itemContent, 'region') || 'Remote (Worldwide)';

      // Extract category / skills
      const category = this.extractTag(itemContent, 'category');
      const skills: string[] = category ? [category] : [];

      // Extract pubDate
      let postedAt: Date | null = null;
      const pubDate = this.extractTag(itemContent, 'pubDate');
      if (pubDate) {
        const d = new Date(pubDate);
        if (!isNaN(d.getTime())) postedAt = d;
      }

      // Extract description
      const rawDesc = this.extractTag(itemContent, 'description') || position;
      const cleanedDesc = cleanHtmlDescription(this.unescapeXml(rawDesc));

      // Detect experience level
      let experienceLevel: string | null = null;
      const lowerTitle = position.toLowerCase();
      if (
        lowerTitle.includes('junior') ||
        lowerTitle.includes('entry level') ||
        lowerTitle.includes('intern')
      ) {
        experienceLevel = 'Junior';
      } else if (lowerTitle.includes('lead') || lowerTitle.includes('head')) {
        experienceLevel = 'Lead';
      } else if (lowerTitle.includes('staff') || lowerTitle.includes('principal')) {
        experienceLevel = 'Staff';
      } else if (lowerTitle.includes('senior') || lowerTitle.includes('sr.')) {
        experienceLevel = 'Senior';
      }

      // Detect employment type
      let employmentType: string | null = null;
      if (lowerTitle.includes('intern') || cleanedDesc.toLowerCase().includes('internship')) {
        employmentType = 'internship';
      } else if (cleanedDesc.toLowerCase().includes('contract') || lowerTitle.includes('contract')) {
        employmentType = 'contract';
      } else if (cleanedDesc.toLowerCase().includes('part-time') || cleanedDesc.toLowerCase().includes('part time')) {
        employmentType = 'part-time';
      } else {
        employmentType = 'full-time';
      }

      const rawPosting: RawJobPosting = {
        externalId: guid ? this.extractIdFromUrl(guid) : null,
        title: position,
        company,
        description: cleanedDesc || position,
        url: jobUrl.trim(),
        applicationUrl: jobUrl.trim(),
        location: region.trim(),
        workArrangement: 'remote',
        employmentType,
        experienceLevel,
        skills,
        salary: null, // WeWorkRemotely does not provide structured salary; preserved as null
        deadline: null, // preserved as null
        postedAt,
        rawPayload: {
          category,
          region,
          rawTitle,
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

      if (options?.limit && rawJobs.length >= options.limit) {
        break;
      }
    }

    return rawJobs;
  }

  private extractTag(content: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = content.match(regex);
    if (!m) return null;
    return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }

  private unescapeXml(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private extractIdFromUrl(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1] || url;
  }

  public async validateConfig(): Promise<boolean> {
    return Boolean(this.feedUrl);
  }
}
