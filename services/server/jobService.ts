import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  JobListItem,
  JobEvaluationSummary,
  ManualJobInput,
  JobFilterParams,
} from '@/types/job';

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
 * Prevents duplicate URLs and avoids inventing unsupplied data.
 */
export async function createManualJob(input: ManualJobInput): Promise<{
  success: boolean;
  job?: JobListItem;
  error?: string;
}> {
  try {
    const trimmedUrl = input.url.trim();
    const trimmedTitle = input.title.trim();
    const trimmedCompany = input.company.trim();
    const trimmedDesc = input.description.trim();

    if (!trimmedUrl) {
      return { success: false, error: 'Job URL is required.' };
    }
    if (!trimmedTitle) {
      return { success: false, error: 'Job title is required.' };
    }
    if (!trimmedCompany) {
      return { success: false, error: 'Company name is required.' };
    }
    if (!trimmedDesc) {
      return { success: false, error: 'Job description is required.' };
    }

    // Check for existing duplicate URL
    const existing = await prisma.job.findUnique({
      where: { url: trimmedUrl },
    });
    if (existing) {
      return {
        success: false,
        error: `A job with this URL is already recorded in the database: "${existing.title}" at ${existing.company}.`,
      };
    }

    // Ensure "Manual Entry" JobSource exists
    let manualSource = await prisma.jobSource.findUnique({
      where: { name: 'Manual Entry' },
    });
    if (!manualSource) {
      manualSource = await prisma.jobSource.create({
        data: {
          name: 'Manual Entry',
          type: 'manual',
          baseUrl: 'https://jobpilot.local/manual',
          isActive: true,
        },
      });
    }

    const createdJob = await prisma.job.create({
      data: {
        sourceId: manualSource.id,
        title: trimmedTitle,
        company: trimmedCompany,
        description: trimmedDesc,
        url: trimmedUrl,
        applicationUrl: input.applicationUrl?.trim() || null,
        location: input.location?.trim() || 'Remote',
        workArrangement: input.workArrangement || 'remote',
        employmentType: input.employmentType || null,
        experienceLevel: input.experienceLevel || null,
        skills: JSON.stringify(input.skills || []),
        salary: input.salary?.trim() || null,
        deadline: input.deadline ? new Date(input.deadline) : null,
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

    // Record audit event
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
        }),
      },
    });

    return {
      success: true,
      job: mapDbJobToListItem(createdJob),
    };
  } catch (error: any) {
    console.error('Error creating manual job:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'A job with this exact URL already exists.' };
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
