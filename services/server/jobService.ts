import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  JobListItem,
  JobEvaluationSummary,
  ManualJobInput,
  JobFilterParams,
} from '@/types/job';
import {
  normalizeJobUrl,
  normalizeWorkArrangement,
  normalizeEmploymentType,
  normalizeExperienceLevel,
  normalizeSkills,
  generateJobFingerprint,
  extractExternalIdFromUrl,
  inferJobMetadataFromUrl,
} from '@/services/discovery/jobNormalizationService';
import { checkDuplicateJob } from '@/services/discovery/duplicateDetectionService';
import { cleanHtmlDescription } from '@/services/discovery/utils/htmlCleaner';
import { NormalizedJobPosting } from '@/services/discovery/types';
import { createApplicationForJob } from '@/services/server/applicationService';

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapDbJobToListItem(dbJob: any): JobListItem {
  const latestEval = dbJob.evaluations?.[0];
  const latestApp = dbJob.applications?.[0];

  const evaluation: JobEvaluationSummary | null = latestEval
    ? {
        id: latestEval.id,
        overallMatchScore: latestEval.overallMatchScore,
        scoringDimensions: safeParseJson<Record<string, number>>(
          latestEval.scoringDimensions,
          {}
        ),
        eligibility: latestEval.eligibility,
        explanation: latestEval.explanation,
        missingQualifications: safeParseJson<string[]>(
          latestEval.missingQualifications,
          []
        ),
        concerns: safeParseJson<string[]>(latestEval.concerns, []),
        strengths: safeParseJson<string[]>(latestEval.strengths, []),
        recommendation: latestEval.recommendation,
        evaluatedAt: latestEval.evaluatedAt.toISOString(),
      }
    : null;

  return {
    id: dbJob.id,
    sourceId: dbJob.sourceId,
    sourceName: dbJob.source?.name || 'Manual Entry',
    externalId: dbJob.externalId,
    title: dbJob.title,
    company: dbJob.company,
    description: dbJob.description,
    url: dbJob.url,
    applicationUrl: dbJob.applicationUrl,
    location: dbJob.location,
    workArrangement: dbJob.workArrangement,
    employmentType: dbJob.employmentType,
    experienceLevel: dbJob.experienceLevel,
    skills: safeParseJson<string[]>(dbJob.skills, []),
    salary: dbJob.salary,
    deadline: dbJob.deadline ? dbJob.deadline.toISOString() : null,
    postedAt: dbJob.postedAt ? dbJob.postedAt.toISOString() : null,
    discoveredAt: dbJob.discoveredAt.toISOString(),
    evaluation,
    applicationId: latestApp?.id || null,
    applicationStatus: latestApp?.status || null,
  };
}

/**
 * Retrieves all jobs matching the provided filter parameters.
 */
export async function getJobs(filters?: JobFilterParams): Promise<JobListItem[]> {
  const where: any = {};

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q } },
      { company: { contains: q } },
      { description: { contains: q } },
      { skills: { contains: q } },
      { location: { contains: q } },
    ];
  }

  if (filters?.company && filters.company.trim()) {
    where.company = { contains: filters.company.trim() };
  }

  if (filters?.workArrangement && filters.workArrangement !== 'all') {
    where.workArrangement = filters.workArrangement;
  }

  if (filters?.employmentType && filters.employmentType !== 'all') {
    where.employmentType = filters.employmentType;
  }

  if (filters?.experienceLevel && filters.experienceLevel !== 'all') {
    where.experienceLevel = filters.experienceLevel;
  }

  if (filters?.minScore !== undefined && filters.minScore > 0) {
    where.evaluations = {
      some: {
        overallMatchScore: { gte: filters.minScore },
      },
    };
  }

  if (filters?.eligibility && filters.eligibility !== 'all') {
    where.evaluations = {
      some: {
        eligibility: filters.eligibility,
      },
    };
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      source: true,
      evaluations: {
        orderBy: { evaluatedAt: 'desc' },
        take: 1,
      },
      applications: {
        take: 1,
        select: { id: true, status: true },
      },
    },
    orderBy: { discoveredAt: 'desc' },
  });

  return jobs.map(mapDbJobToListItem);
}

/**
 * Retrieves a single job by ID.
 */
export async function getJobById(id: string): Promise<JobListItem | null> {
  const dbJob = await prisma.job.findUnique({
    where: { id },
    include: {
      source: true,
      evaluations: {
        orderBy: { evaluatedAt: 'desc' },
        take: 1,
      },
      applications: {
        take: 1,
        select: { id: true, status: true },
      },
    },
  });

  return dbJob ? mapDbJobToListItem(dbJob) : null;
}

/**
 * Manually adds a job opportunity to the SQLite database.
 * Supports pasting job URLs (including LinkedIn) and pasted descriptions.
 * Normalizes the listing, detects duplicates via 4-tier deduplication,
 * preserves the original URL, and enters the discovery & evaluation pipeline.
 * If the description is not provided, the job is saved with incomplete information
 * and flagged with status 'NEEDS_REVIEW'.
 */
export async function createManualJob(input: ManualJobInput): Promise<{
  success: boolean;
  job?: JobListItem;
  error?: string;
  isIncomplete?: boolean;
}> {
  try {
    const rawInputUrl = input.url?.trim() || '';
    if (!rawInputUrl) {
      return { success: false, error: 'Job URL is required.' };
    }

    // Protocol check
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawInputUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return {
          success: false,
          error: `Invalid URL protocol "${parsedUrl.protocol}". Must be http:// or https://`,
        };
      }
    } catch {
      return { success: false, error: `Malformed URL provided: "${rawInputUrl}".` };
    }

    // Canonicalize URL and extract external ID
    const canonicalUrl = normalizeJobUrl(rawInputUrl);
    const originalUrl = input.originalUrl?.trim() || rawInputUrl;
    const externalId = extractExternalIdFromUrl(rawInputUrl);
    const isLinkedIn = parsedUrl.hostname.includes('linkedin.com');

    // Infer title and company if not provided
    const inferred = inferJobMetadataFromUrl(rawInputUrl);
    const title = input.title?.trim() || inferred.title || (isLinkedIn ? 'LinkedIn Opportunity' : 'Manual Opportunity');
    const company = input.company?.trim() || inferred.company || 'Unknown Company';

    // Handle description: allow incomplete listings and flag for review
    const rawDesc = input.description?.trim() || '';
    const isIncomplete = rawDesc.length < 20;
    const description = isIncomplete
      ? '(No job description provided upon manual entry. Flagged for review.)'
      : cleanHtmlDescription(rawDesc);

    // Normalize metadata fields
    const workArrangement = normalizeWorkArrangement(input.workArrangement, input.location, title);
    const employmentType = normalizeEmploymentType(input.employmentType);
    const experienceLevel = normalizeExperienceLevel(input.experienceLevel, title);
    const skills = normalizeSkills(input.skills);
    const location = input.location?.trim() || (workArrangement === 'remote' ? 'Remote' : 'Unspecified');
    const salary = input.salary?.trim() || null;
    let deadline: Date | null = null;
    if (input.deadline) {
      const d = new Date(input.deadline);
      if (!isNaN(d.getTime())) deadline = d;
    }

    const sourceName = isLinkedIn ? 'LinkedIn (Manual)' : 'Manual Entry';

    // Construct normalized posting for duplicate detection
    const normalizedPosting: NormalizedJobPosting = {
      sourceName,
      externalId: externalId || null,
      title,
      company,
      description,
      url: canonicalUrl,
      applicationUrl: input.applicationUrl?.trim() || originalUrl,
      location,
      workArrangement,
      employmentType,
      experienceLevel,
      skills,
      salary,
      deadline,
      postedAt: new Date(),
      fingerprint: generateJobFingerprint(company, title, workArrangement),
    };

    // Ensure JobSource exists
    let manualSource = await prisma.jobSource.findUnique({
      where: { name: sourceName },
    });
    if (!manualSource) {
      manualSource = await prisma.jobSource.create({
        data: {
          name: sourceName,
          type: 'manual',
          baseUrl: isLinkedIn ? 'https://www.linkedin.com' : 'https://jobpilot.local/manual',
          isActive: true,
          lastPolledAt: new Date(),
        },
      });
    }

    // 1. Direct exact URL check on original URL as well (in case user pasted original URL earlier)
    if (originalUrl !== canonicalUrl) {
      const existingByOriginal = await prisma.job.findFirst({
        where: {
          OR: [
            { url: originalUrl },
            { applicationUrl: originalUrl },
          ],
        },
      });
      if (existingByOriginal) {
        return {
          success: false,
          error: `A job with this URL is already recorded: "${existingByOriginal.title}" at ${existingByOriginal.company}.`,
        };
      }
    }

    // 2. Run comprehensive 4-tier deduplication
    const dupCheck = await checkDuplicateJob(normalizedPosting, manualSource.id);
    if (dupCheck.isDuplicate) {
      return {
        success: false,
        error: dupCheck.details || 'A matching job opportunity is already recorded in the database.',
      };
    }

    // 3. Save Job record
    const createdJob = await prisma.job.create({
      data: {
        sourceId: manualSource.id,
        externalId: externalId || null,
        title,
        company,
        description,
        url: canonicalUrl,
        applicationUrl: input.applicationUrl?.trim() || originalUrl,
        location,
        workArrangement,
        employmentType,
        experienceLevel,
        skills: JSON.stringify(skills),
        salary,
        deadline,
      },
      include: {
        source: true,
        evaluations: true,
        applications: {
          take: 1,
          select: { id: true, status: true },
        },
      },
    });

    // 4. Enter the same discovery & evaluation pipeline:
    // Create Application record (NEEDS_REVIEW if incomplete description, DISCOVERED if complete)
    const initialStatus = isIncomplete ? 'NEEDS_REVIEW' : 'DISCOVERED';
    const appNotes = isIncomplete
      ? '[INCOMPLETE LISTING] Job description was not provided upon manual entry. Flagged for review before automated evaluation.'
      : '[MANUAL ENTRY] Opportunity entered manually by candidate. Ready for profile evaluation.';

    await createApplicationForJob({
      jobId: createdJob.id,
      status: initialStatus,
      notes: appNotes,
    });

    // 5. Record Activity Log
    await prisma.activityLog.create({
      data: {
        level: 'INFO',
        action: 'JOB_MANUALLY_ADDED',
        entityType: 'Job',
        entityId: createdJob.id,
        details: JSON.stringify({
          title: createdJob.title,
          company: createdJob.company,
          url: createdJob.url,
          originalUrl,
          isLinkedIn,
          isIncomplete,
          applicationStatus: initialStatus,
        }),
      },
    });

    // Refetch full job to include newly created application
    const refetchedJob = await getJobById(createdJob.id);

    return {
      success: true,
      job: refetchedJob || mapDbJobToListItem(createdJob),
      isIncomplete,
    };
  } catch (error: any) {
    console.error('Error creating manual job:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'A job with this URL already exists in database.' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error adding job.',
    };
  }
}

/**
 * Deletes a job record from the database.
 */
export async function deleteJob(id: string): Promise<boolean> {
  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return false;

    await prisma.job.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        level: 'INFO',
        action: 'JOB_DELETED',
        entityType: 'Job',
        entityId: id,
        details: JSON.stringify({ title: job.title, company: job.company }),
      },
    });

    return true;
  } catch (error) {
    console.error('Error deleting job:', error);
    return false;
  }
}

/**
 * Returns distinct companies, employment types, seniority levels from existing records
 * for dynamic filter options.
 */
export async function getDistinctFilterOptions() {
  const jobs = await prisma.job.findMany({
    select: {
      company: true,
      employmentType: true,
      experienceLevel: true,
      workArrangement: true,
    },
  });

  const companies = Array.from(new Set(jobs.map((j) => j.company).filter(Boolean))).sort();
  const employmentTypes = Array.from(
    new Set(jobs.map((j) => j.employmentType).filter(Boolean))
  ) as string[];
  const experienceLevels = Array.from(
    new Set(jobs.map((j) => j.experienceLevel).filter(Boolean))
  ) as string[];
  const workArrangements = Array.from(
    new Set(jobs.map((j) => j.workArrangement).filter(Boolean))
  ) as string[];

  return {
    companies,
    employmentTypes,
    experienceLevels,
    workArrangements,
  };
}
