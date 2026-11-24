import 'server-only';
import { prisma } from '@/lib/prisma';
import { NormalizedJobPosting, SourceAdapterMetadata } from './types';

/**
 * Ensures a JobSource record exists in the SQLite database and updates its polling timestamp.
 */
export async function ensureJobSource(metadata: SourceAdapterMetadata): Promise<{ id: string; name: string }> {
  let source = await prisma.jobSource.findUnique({
    where: { name: metadata.name },
  });

  if (!source) {
    source = await prisma.jobSource.create({
      data: {
        name: metadata.name,
        type: metadata.type,
        baseUrl: metadata.baseUrl,
        isActive: true,
        lastPolledAt: new Date(),
      },
    });
  } else {
    source = await prisma.jobSource.update({
      where: { id: source.id },
      data: {
        lastPolledAt: new Date(),
      },
    });
  }

  return { id: source.id, name: source.name };
}

/**
 * Persists a validated, normalized job listing into the SQLite database.
 * Preserves null values for missing/unprovided data without inventing qualifications or details.
 */
export async function persistJob(
  job: NormalizedJobPosting,
  sourceId: string,
  automationRunId?: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const createdJob = await prisma.job.create({
      data: {
        sourceId,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        description: job.description,
        url: job.url,
        applicationUrl: job.applicationUrl,
        location: job.location,
        workArrangement: job.workArrangement,
        employmentType: job.employmentType,
        experienceLevel: job.experienceLevel,
        skills: JSON.stringify(job.skills || []),
        salary: job.salary,
        deadline: job.deadline,
        postedAt: job.postedAt,
      },
    });

    // Record audit event in ActivityLog
    await prisma.activityLog.create({
      data: {
        automationRunId: automationRunId || null,
        level: 'INFO',
        action: 'JOB_DISCOVERED',
        entityType: 'Job',
        entityId: createdJob.id,
        details: JSON.stringify({
          title: createdJob.title,
          company: createdJob.company,
          source: job.sourceName,
          url: createdJob.url,
          workArrangement: createdJob.workArrangement,
        }),
      },
    });

    return {
      success: true,
      jobId: createdJob.id,
    };
  } catch (error: any) {
    console.error('Error persisting job listing:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'A job with this unique URL already exists in database.' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error saving job.',
    };
  }
}
