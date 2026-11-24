import {
  JobSourceAdapter,
  SourceAdapterMetadata,
  FetchOptions,
  FetchResult,
  RawJobPosting,
} from '../types';

export interface SampleAdapterConfig {
  id?: string;
  name?: string;
  type?: 'api' | 'rss' | 'scraper' | 'mock';
  baseUrl?: string;
  fixtures?: RawJobPosting[];
  simulateFailure?: boolean;
  simulateRateLimit?: boolean;
}

export class SampleJobSourceAdapter implements JobSourceAdapter {
  public metadata: SourceAdapterMetadata;
  private fixtures: RawJobPosting[];
  private simulateFailure: boolean;
  private simulateRateLimit: boolean;

  constructor(config: SampleAdapterConfig = {}) {
    this.metadata = {
      id: config.id || 'sample-feed',
      name: config.name || 'Sample Feed Source',
      type: config.type || 'api',
      baseUrl: config.baseUrl || 'https://api.samplefeed.local/v1',
      rateLimit: {
        requestsPerMinute: 60,
        minIntervalMs: 1000,
      },
      supportsSearch: true,
    };
    this.fixtures = config.fixtures || [];
    this.simulateFailure = config.simulateFailure || false;
    this.simulateRateLimit = config.simulateRateLimit || false;
  }

  public setFixtures(fixtures: RawJobPosting[]): void {
    this.fixtures = fixtures;
  }

  public setSimulateFailure(fail: boolean): void {
    this.simulateFailure = fail;
  }

  public setSimulateRateLimit(rateLimit: boolean): void {
    this.simulateRateLimit = rateLimit;
  }

  public async fetchJobs(options?: FetchOptions): Promise<FetchResult> {
    if (this.simulateFailure) {
      return {
        success: false,
        rawJobs: [],
        totalFetched: 0,
        error: 'Simulated network timeout connecting to sample source endpoint.',
        fetchedAt: new Date(),
      };
    }

    if (this.simulateRateLimit) {
      return {
        success: false,
        rawJobs: [],
        totalFetched: 0,
        rateLimited: true,
        error: 'HTTP 429: Rate limit exceeded on sample source API.',
        fetchedAt: new Date(),
      };
    }

    let jobs = [...this.fixtures];

    if (options?.query) {
      const q = options.query.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }

    if (options?.limit && options.limit > 0) {
      jobs = jobs.slice(0, options.limit);
    }

    return {
      success: true,
      rawJobs: jobs,
      totalFetched: jobs.length,
      fetchedAt: new Date(),
    };
  }

  public async validateConfig(): Promise<boolean> {
    return Boolean(this.metadata.baseUrl);
  }
}
