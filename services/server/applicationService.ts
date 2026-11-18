import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  ApplicationStatus,
  ALL_APPLICATION_STATUSES,
  ApplicationListItem,
  ApplicationDetail,
  ApplicationFilterParams,
  ApplicationStatusTransitionInput,
  ApplicationOverviewMetrics,
  GeneratedDocumentItem,
  ApplicationActivityItem,
  DocumentType,
} from '@/types/application';

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapDbAppToListItem(dbApp: any): ApplicationListItem {
  const job = dbApp.job;
  const evalItem = job?.evaluations?.[0];

  return {
    id: dbApp.id,
    jobId: dbApp.jobId,
    jobTitle: job?.title || 'Untitled Opportunity',
    company: job?.company || 'Unknown Company',
    location: job?.location || 'Remote',
    workArrangement: job?.workArrangement || 'remote',
    jobUrl: job?.url || null,
    applicationUrl: job?.applicationUrl || null,
    salary: job?.salary || null,
    status: (dbApp.status as ApplicationStatus) || 'PENDING_REVIEW',
    matchScore: evalItem?.overallMatchScore ?? null,
    eligibility: evalItem?.eligibility ?? null,
    recommendation: evalItem?.recommendation ?? null,
    preparationDate: dbApp.preparationDate ? dbApp.preparationDate.toISOString() : null,
    reviewDate: dbApp.reviewDate ? dbApp.reviewDate.toISOString() : null,
    approvalDate: dbApp.approvalDate ? dbApp.approvalDate.toISOString() : null,
    submissionDate: dbApp.submissionDate ? dbApp.submissionDate.toISOString() : null,
    deadline: job?.deadline ? job.deadline.toISOString() : null,
    notes: dbApp.notes,
    rejectionReason: dbApp.rejectionReason,
    documentsCount: dbApp._count?.generatedDocuments ?? dbApp.generatedDocuments?.length ?? 0,
    createdAt: dbApp.createdAt.toISOString(),
    updatedAt: dbApp.updatedAt.toISOString(),
  };
}

/**
 * Retrieves all applications filtered by search, status, and scores.
 */
export async function getApplications(
  filters?: ApplicationFilterParams
): Promise<ApplicationListItem[]> {
  const where: any = {};

  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { job: { title: { contains: q } } },
      { job: { company: { contains: q } } },
      { notes: { contains: q } },
      { rejectionReason: { contains: q } },
    ];
  }

  if (filters?.eligibility && filters.eligibility !== 'all') {
    where.job = {
      ...where.job,
      evaluations: {
        some: { eligibility: filters.eligibility },
      },
    };
  }

  if (filters?.minScore !== undefined && filters.minScore > 0) {
    where.job = {
      ...where.job,
      evaluations: {
        some: { overallMatchScore: { gte: filters.minScore } },
      },
    };
  }

  const applications = await prisma.application.findMany({
    where,
    include: {
      job: {
        include: {
          evaluations: {
            take: 1,
            orderBy: { evaluatedAt: 'desc' },
          },
        },
      },
      generatedDocuments: {
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return applications.map(mapDbAppToListItem);
}

/**
 * Retrieves comprehensive application details by ID.
 */
export async function getApplicationById(
  id: string
): Promise<ApplicationDetail | null> {
  const dbApp = await prisma.application.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          evaluations: {
            take: 1,
            orderBy: { evaluatedAt: 'desc' },
          },
        },
      },
      generatedDocuments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!dbApp) return null;

  // Retrieve activity audit logs for this application
  const activityLogs = await prisma.activityLog.findMany({
    where: {
      entityType: 'Application',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const baseItem = mapDbAppToListItem(dbApp);
  const job = dbApp.job;
  const evalItem = job?.evaluations?.[0];

  const evaluationSummary = evalItem
    ? {
        overallMatchScore: evalItem.overallMatchScore,
        eligibility: evalItem.eligibility,
        explanation: evalItem.explanation,
        strengths: safeParseJson<string[]>(evalItem.strengths, []),
        missingQualifications: safeParseJson<string[]>(
          evalItem.missingQualifications,
          []
        ),
        scoringDimensions: safeParseJson<Record<string, number>>(
          evalItem.scoringDimensions,
          {}
        ),
      }
    : null;

  const generatedDocuments: GeneratedDocumentItem[] = dbApp.generatedDocuments.map(
    (doc) => ({
      id: doc.id,
      applicationId: doc.applicationId,
      documentType: doc.documentType as DocumentType,
      originalFilename: doc.originalFilename,
      filePath: doc.filePath,
      version: doc.version,
      content: doc.content,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    })
  );

  const activityHistory: ApplicationActivityItem[] = activityLogs.map((log) => ({
    id: log.id,
    action: log.action,
    level: log.level,
    details: safeParseJson(log.details, log.details),
    createdAt: log.createdAt.toISOString(),
  }));

  return {
    ...baseItem,
    jobDescription: job?.description || null,
    jobSkills: safeParseJson<string[]>(job?.skills, []),
    evaluationSummary,
    generatedDocuments,
    activityHistory,
  };
}

/**
 * Aggregates overview status metrics for all application records.
 */
export async function getApplicationMetrics(): Promise<ApplicationOverviewMetrics> {
  const apps = await prisma.application.findMany({
    select: { status: true },
  });

  const metrics: ApplicationOverviewMetrics = {
    total: apps.length,
    discovered: 0,
    evaluating: 0,
    needsReview: 0,
    preparing: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    readyToSubmit: 0,
    applied: 0,
    expired: 0,
    archived: 0,
  };

  for (const app of apps) {
    const s = app.status as ApplicationStatus;
    switch (s) {
      case 'DISCOVERED':
        metrics.discovered++;
        break;
      case 'EVALUATING':
        metrics.evaluating++;
        break;
      case 'NEEDS_REVIEW':
        metrics.needsReview++;
        break;
      case 'PREPARING':
        metrics.preparing++;
        break;
      case 'PENDING_REVIEW':
        metrics.pendingReview++;
        break;
      case 'APPROVED':
        metrics.approved++;
        break;
      case 'REJECTED':
        metrics.rejected++;
        break;
      case 'READY_TO_SUBMIT':
        metrics.readyToSubmit++;
        break;
      case 'APPLIED':
        metrics.applied++;
        break;
      case 'EXPIRED':
        metrics.expired++;
        break;
      case 'ARCHIVED':
        metrics.archived++;
        break;
      default:
        // Legacy DRAFT or other fallback into pendingReview
        metrics.pendingReview++;
        break;
    }
  }

  return metrics;
}

/**
 * Creates an application for a specific Job opportunity.
 */
export async function createApplicationForJob(input: {
  jobId: string;
  status?: ApplicationStatus;
  notes?: string;
}): Promise<{
  success: boolean;
  application?: ApplicationListItem;
  error?: string;
}> {
  try {
    const job = await prisma.job.findUnique({
      where: { id: input.jobId },
      include: {
        evaluations: { take: 1, orderBy: { evaluatedAt: 'desc' } },
      },
    });

    if (!job) {
      return { success: false, error: 'Job not found in database.' };
    }

    // Check if an application already exists for this job
    const existing = await prisma.application.findFirst({
      where: { jobId: input.jobId },
      include: {
        job: {
          include: {
            evaluations: { take: 1, orderBy: { evaluatedAt: 'desc' } },
          },
        },
        generatedDocuments: true,
      },
    });

    if (existing) {
      return {
        success: true,
        application: mapDbAppToListItem(existing),
      };
    }

    // Get candidate profile
    const profile = await prisma.candidateProfile.findFirst({
      select: { id: true },
    });

    const initialStatus = input.status || 'PENDING_REVIEW';
    const now = new Date();

    const created = await prisma.application.create({
      data: {
        jobId: input.jobId,
        profileId: profile?.id || null,
        status: initialStatus,
        notes: input.notes?.trim() || null,
        preparationDate: ['PREPARING', 'PENDING_REVIEW', 'APPROVED'].includes(initialStatus)
          ? now
          : null,
        reviewDate: initialStatus === 'PENDING_REVIEW' ? now : null,
      },
      include: {
        job: {
          include: {
            evaluations: { take: 1, orderBy: { evaluatedAt: 'desc' } },
          },
        },
        generatedDocuments: true,
      },
    });

    // Record creation in audit log
    await prisma.activityLog.create({
      data: {
        level: 'INFO',
        action: 'APPLICATION_CREATED',
        entityType: 'Application',
        entityId: created.id,
        details: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          status: initialStatus,
        }),
      },
    });

    return {
      success: true,
      application: mapDbAppToListItem(created),
    };
  } catch (error) {
    console.error('Error creating application:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error creating application.',
    };
  }
}

/**
 * Validates and executes an application status transition.
 * Adheres strictly to the human-in-the-loop requirement:
 * - APPLIED requires explicit human confirmation (submissionConfirmation === true)
 * - Transitions are recorded in ActivityLog
 */
export async function transitionApplicationStatus(
  id: string,
  transition: ApplicationStatusTransitionInput
): Promise<{
  success: boolean;
  application?: ApplicationListItem;
  error?: string;
}> {
  try {
    const app = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            evaluations: { take: 1, orderBy: { evaluatedAt: 'desc' } },
          },
        },
        generatedDocuments: true,
      },
    });

    if (!app) {
      return { success: false, error: 'Application record not found.' };
    }

    const fromStatus = (app.status as ApplicationStatus) || 'PENDING_REVIEW';
    const toStatus = transition.targetStatus;

    if (!ALL_APPLICATION_STATUSES.includes(toStatus)) {
      return {
        success: false,
        error: `Invalid target status "${toStatus}". Supported statuses: ${ALL_APPLICATION_STATUSES.join(', ')}`,
      };
    }

    // CRITICAL SECURITY & HUMAN-IN-THE-LOOP RULE:
    // Do NOT allow an application to be marked APPLIED unless explicitly confirmed by the candidate!
    if (toStatus === 'APPLIED') {
      if (transition.submissionConfirmation !== true) {
        return {
          success: false,
          error:
            'JobPilot AI requires explicit human confirmation before marking an application as APPLIED. Please confirm you have manually submitted this application.',
        };
      }
    }

    const now = new Date();
    const updateData: any = {
      status: toStatus,
    };

    if (transition.notes !== undefined) {
      updateData.notes = transition.notes.trim() || null;
    }

    // Update timestamps depending on target status
    if (toStatus === 'APPLIED') {
      updateData.submissionDate = transition.submissionDate
        ? new Date(transition.submissionDate)
        : (app.submissionDate || now);
    } else if (toStatus === 'APPROVED') {
      updateData.approvalDate = app.approvalDate || now;
    } else if (toStatus === 'PENDING_REVIEW') {
      updateData.reviewDate = app.reviewDate || now;
    } else if (toStatus === 'PREPARING') {
      updateData.preparationDate = app.preparationDate || now;
    } else if (toStatus === 'REJECTED') {
      if (transition.rejectionReason) {
        updateData.rejectionReason = transition.rejectionReason.trim();
      }
    }

    const updated = await prisma.application.update({
      where: { id },
      data: updateData,
      include: {
        job: {
          include: {
            evaluations: { take: 1, orderBy: { evaluatedAt: 'desc' } },
          },
        },
        generatedDocuments: true,
      },
    });

    // Record audit event in ActivityLog
    await prisma.activityLog.create({
      data: {
        level: 'INFO',
        action: 'APPLICATION_STATUS_CHANGED',
        entityType: 'Application',
        entityId: id,
        details: JSON.stringify({
          fromStatus,
          toStatus,
          jobTitle: app.job?.title,
          company: app.job?.company,
          notes: transition.notes,
          rejectionReason: transition.rejectionReason,
          submissionDate: updateData.submissionDate?.toISOString?.(),
        }),
      },
    });

    return {
      success: true,
      application: mapDbAppToListItem(updated),
    };
  } catch (error) {
    console.error('Error transitioning application status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error updating status.',
    };
  }
}

/**
 * Creates or updates tailored application documents (Resume, Cover Letter, Answers).
 */
export async function saveOrUpdateDocument(
  applicationId: string,
  doc: {
    id?: string;
    documentType: DocumentType;
    originalFilename: string;
    content: string;
  }
): Promise<{
  success: boolean;
  document?: GeneratedDocumentItem;
  error?: string;
}> {
  try {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      return { success: false, error: 'Application record not found.' };
    }

    let savedDoc: any;

    if (doc.id) {
      // Update existing document with incremented version
      const existing = await prisma.generatedDocument.findUnique({
        where: { id: doc.id },
      });
      if (!existing) {
        return { success: false, error: 'Existing document not found.' };
      }

      savedDoc = await prisma.generatedDocument.update({
        where: { id: doc.id },
        data: {
          content: doc.content,
          originalFilename: doc.originalFilename || existing.originalFilename,
          version: existing.version + 1,
        },
      });

      await prisma.activityLog.create({
        data: {
          level: 'INFO',
          action: 'DOCUMENT_UPDATED',
          entityType: 'GeneratedDocument',
          entityId: savedDoc.id,
          details: JSON.stringify({
            applicationId,
            documentType: doc.documentType,
            version: savedDoc.version,
          }),
        },
      });
    } else {
      // Create new document record
      savedDoc = await prisma.generatedDocument.create({
        data: {
          applicationId,
          documentType: doc.documentType,
          originalFilename: doc.originalFilename || `${doc.documentType}.txt`,
          filePath: `generated/${applicationId}/${doc.originalFilename || doc.documentType}.txt`,
          content: doc.content,
          version: 1,
          mimeType: 'text/markdown',
        },
      });

      await prisma.activityLog.create({
        data: {
          level: 'INFO',
          action: 'DOCUMENT_CREATED',
          entityType: 'GeneratedDocument',
          entityId: savedDoc.id,
          details: JSON.stringify({
            applicationId,
            documentType: doc.documentType,
            version: 1,
          }),
        },
      });
    }

    return {
      success: true,
      document: {
        id: savedDoc.id,
        applicationId: savedDoc.applicationId,
        documentType: savedDoc.documentType as DocumentType,
        originalFilename: savedDoc.originalFilename,
        filePath: savedDoc.filePath,
        version: savedDoc.version,
        content: savedDoc.content,
        mimeType: savedDoc.mimeType,
        createdAt: savedDoc.createdAt.toISOString(),
        updatedAt: savedDoc.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error saving document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error saving document.',
    };
  }
}
