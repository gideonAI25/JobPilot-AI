import 'server-only';
import { prisma } from '@/lib/prisma';
import { getOrCreatePrimaryProfile } from '@/services/server/profileDbService';

export interface DashboardStats {
  totalJobsDiscovered: number;
  jobsEvaluated: number;
  qualifiedOpportunities: number;
  applicationsPrepared: number;
  pendingReviews: number;
  applicationsSubmitted: number;
  averageMatchScore: number | null;
}

export interface RecentJobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  workArrangement: string;
  employmentType: string | null;
  salary: string | null;
  url: string;
  discoveredAt: string;
  sourceName: string;
  matchScore: number | null;
  recommendation: string | null;
}

export interface PendingReviewItem {
  id: string;
  jobId: string | null;
  jobTitle: string;
  company: string;
  status: string;
  preparationDate: string | null;
  reviewDate: string | null;
  matchScore: number | null;
  documentsCount: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  level: string;
  entityType: string | null;
  details: string | null;
  createdAt: string;
}

export interface AutomationTelemetry {
  lastRun: {
    id: string;
    runType: string;
    status: string;
    startTime: string;
    completionTime: string | null;
    discoveredJobs: number;
    evaluatedJobs: number;
    qualifiedJobs: number;
    preparedApplications: number;
    errors: string | null;
  } | null;
  nextScheduledRun: string | null;
  isActive: boolean;
}

export interface CandidateProfileHeaderSummary {
  fullName: string;
  headline: string;
  email: string;
  completionPercentage: number;
  isFullyComplete: boolean;
}

export interface NotificationItem {
  id: string;
  channel: string;
  notificationType: string;
  title: string | null;
  message: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

export interface DashboardOverviewData {
  stats: DashboardStats;
  recentJobs: RecentJobItem[];
  pendingReviews: PendingReviewItem[];
  recentActivity: RecentActivityItem[];
  automation: AutomationTelemetry;
  profile: CandidateProfileHeaderSummary;
  notifications: {
    unreadCount: number;
    items: NotificationItem[];
  };
}

/**
 * Aggregates real metrics and data from SQLite database for the Overview Dashboard.
 * Truthful: returns real numbers or null/empty arrays for unpopulated tables.
 */
export async function getDashboardOverviewData(): Promise<DashboardOverviewData> {
  // 1. Candidate Profile Summary
  const profile = await getOrCreatePrimaryProfile();

  // 2. Aggregate Numerical Stats
  const [
    totalJobsDiscovered,
    jobsEvaluated,
    qualifiedOpportunities,
    applicationsPrepared,
    pendingReviewsCount,
    applicationsSubmitted,
    avgScoreAgg,
  ] = await Promise.all([
    prisma.job.count(),
    prisma.jobEvaluation.count(),
    prisma.jobEvaluation.count({
      where: {
        OR: [
          { recommendation: { in: ['HIGHLY_RECOMMENDED', 'CONSIDER'] } },
          { overallMatchScore: { gte: 75 } },
          { eligibility: 'ELIGIBLE' },
        ],
      },
    }),
    prisma.application.count({
      where: {
        status: { in: ['PREPARING', 'PENDING_REVIEW', 'APPROVED', 'READY_TO_SUBMIT', 'APPLIED', 'PREPARED'] },
      },
    }),
    prisma.application.count({
      where: {
        status: { in: ['PENDING_REVIEW', 'NEEDS_REVIEW', 'UNDER_REVIEW'] },
        submissionDate: null,
      },
    }),
    prisma.application.count({
      where: {
        status: { in: ['APPLIED', 'SUBMITTED'] },
        submissionDate: { not: null },
      },
    }),
    prisma.jobEvaluation.aggregate({
      _avg: {
        overallMatchScore: true,
      },
    }),
  ]);

  const averageMatchScore =
    avgScoreAgg._avg.overallMatchScore !== null
      ? Math.round(avgScoreAgg._avg.overallMatchScore)
      : null;

  // 3. Recent Job Discoveries (take 5)
  const recentJobsRaw = await prisma.job.findMany({
    take: 5,
    orderBy: { discoveredAt: 'desc' },
    include: {
      source: true,
      evaluations: {
        take: 1,
        orderBy: { evaluatedAt: 'desc' },
      },
    },
  });

  const recentJobs: RecentJobItem[] = recentJobsRaw.map((j) => {
    const latestEval = j.evaluations[0];
    return {
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      workArrangement: j.workArrangement,
      employmentType: j.employmentType,
      salary: j.salary,
      url: j.url,
      discoveredAt: j.discoveredAt.toISOString(),
      sourceName: j.source?.name || 'Direct Feed',
      matchScore: latestEval ? latestEval.overallMatchScore : null,
      recommendation: latestEval ? latestEval.recommendation : null,
    };
  });

  // 4. Pending Application Reviews (take 5)
  const pendingReviewsRaw = await prisma.application.findMany({
    where: {
      status: { in: ['PREPARED', 'READY_TO_APPLY', 'UNDER_REVIEW'] },
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      job: {
        include: {
          evaluations: {
            take: 1,
            orderBy: { evaluatedAt: 'desc' },
          },
        },
      },
      generatedDocuments: true,
    },
  });

  const pendingReviews: PendingReviewItem[] = pendingReviewsRaw.map((app) => ({
    id: app.id,
    jobId: app.jobId,
    jobTitle: app.job?.title || 'Untitled Role',
    company: app.job?.company || 'Unknown Company',
    status: app.status,
    preparationDate: app.preparationDate ? app.preparationDate.toISOString() : null,
    reviewDate: app.reviewDate ? app.reviewDate.toISOString() : null,
    matchScore: app.job?.evaluations[0]?.overallMatchScore ?? null,
    documentsCount: app.generatedDocuments.length,
  }));

  // 5. Recent Activity Logs (take 6)
  const recentActivityRaw = await prisma.activityLog.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  const recentActivity: RecentActivityItem[] = recentActivityRaw.map((a) => ({
    id: a.id,
    action: a.action,
    level: a.level,
    entityType: a.entityType,
    details: a.details,
    createdAt: a.createdAt.toISOString(),
  }));

  // 6. Latest Automation Run & Telemetry
  const latestRunRaw = await prisma.automationRun.findFirst({
    orderBy: { startTime: 'desc' },
  });

  const automation: AutomationTelemetry = {
    lastRun: latestRunRaw
      ? {
          id: latestRunRaw.id,
          runType: latestRunRaw.runType,
          status: latestRunRaw.status,
          startTime: latestRunRaw.startTime.toISOString(),
          completionTime: latestRunRaw.completionTime
            ? latestRunRaw.completionTime.toISOString()
            : null,
          discoveredJobs: latestRunRaw.discoveredJobs,
          evaluatedJobs: latestRunRaw.evaluatedJobs,
          qualifiedJobs: latestRunRaw.qualifiedJobs,
          preparedApplications: latestRunRaw.preparedApplications,
          errors: latestRunRaw.errors,
        }
      : null,
    nextScheduledRun: null, // Configurable in automation phase
    isActive: true,
  };

  // 7. Notifications
  const [unreadCount, notificationsRaw] = await Promise.all([
    prisma.notificationLog.count({
      where: { status: 'PENDING' },
    }),
    prisma.notificationLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const notifications = {
    unreadCount,
    items: notificationsRaw.map((n) => ({
      id: n.id,
      channel: n.channel,
      notificationType: n.notificationType,
      title: n.title,
      message: n.message,
      status: n.status,
      sentAt: n.sentAt ? n.sentAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
  };

  return {
    stats: {
      totalJobsDiscovered,
      jobsEvaluated,
      qualifiedOpportunities,
      applicationsPrepared,
      pendingReviews: pendingReviewsCount,
      applicationsSubmitted,
      averageMatchScore,
    },
    recentJobs,
    pendingReviews,
    recentActivity,
    automation,
    profile: {
      fullName: profile.personalInfo.fullName || 'JobPilot Candidate',
      headline: profile.summary.headline || 'Configure candidate profile',
      email: profile.personalInfo.email || '',
      completionPercentage: profile.completionPercentage || 0,
      isFullyComplete: Boolean(profile.isFullyComplete),
    },
    notifications,
  };
}
