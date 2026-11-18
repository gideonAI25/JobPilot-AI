'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardOverviewData } from '@/services/server/dashboardService';
import { StatCard } from './StatCard';
import { RecentJobsCard } from './RecentJobsCard';
import { PendingReviewsCard } from './PendingReviewsCard';
import { AutomationStatusCard } from './AutomationStatusCard';
import { RecentActivityCard } from './RecentActivityCard';
import {
  SearchIcon,
  FileTextIcon,
  SparklesIcon,
  ClipboardListIcon,
  ClockIcon,
  SendIcon,
  TrendingUpIcon,
  ChevronRightIcon,
  UserIcon,
} from '@/components/icons/Icons';

interface OverviewViewProps {
  data: DashboardOverviewData;
}

export function OverviewView({ data }: OverviewViewProps) {
  const { stats, recentJobs, pendingReviews, recentActivity, automation, profile } = data;

  return (
    <div className="space-y-8">
      {/* Profile Readiness & Welcome Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-sm flex items-center justify-center shrink-0">
            {profile.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Welcome back, {profile.fullName}
              </h2>
              {profile.isFullyComplete ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Profile Verified
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Profile In Progress ({profile.completionPercentage}%)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {profile.headline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Manage Profile</span>
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Discover Jobs</span>
          </Link>
        </div>
      </div>

      {/* 7 Core SaaS Metric Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Pipeline Analytics
          </h2>
          <span className="text-[11px] text-zinc-400">
            Real-time SQLite database metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Jobs Discovered"
            value={stats.totalJobsDiscovered}
            subtext="Across active ingestion feeds"
            icon={<SearchIcon className="w-4 h-4" />}
          />
          <StatCard
            label="Jobs Evaluated"
            value={stats.jobsEvaluated}
            subtext="Scored against verified profile"
            icon={<FileTextIcon className="w-4 h-4" />}
          />
          <StatCard
            label="Qualified Opportunities"
            value={stats.qualifiedOpportunities}
            subtext="Meeting >= 75% match threshold"
            icon={<SparklesIcon className="w-4 h-4" />}
            badge={{
              text: stats.qualifiedOpportunities > 0 ? 'Qualified' : 'Empty',
              variant: stats.qualifiedOpportunities > 0 ? 'success' : 'neutral',
            }}
          />
          <StatCard
            label="Average Match Score"
            value={stats.averageMatchScore !== null ? `${stats.averageMatchScore}%` : '—'}
            subtext={stats.averageMatchScore !== null ? 'Across all evaluated jobs' : 'No evaluations yet'}
            icon={<TrendingUpIcon className="w-4 h-4" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <StatCard
            label="Applications Prepared"
            value={stats.applicationsPrepared}
            subtext="Tailored materials ready"
            icon={<ClipboardListIcon className="w-4 h-4" />}
          />
          <StatCard
            label="Pending Reviews"
            value={stats.pendingReviews}
            subtext="Awaiting manual candidate sign-off"
            icon={<ClockIcon className="w-4 h-4" />}
            badge={{
              text: stats.pendingReviews > 0 ? `${stats.pendingReviews} Action Needed` : 'Up to Date',
              variant: stats.pendingReviews > 0 ? 'warning' : 'neutral',
            }}
          />
          <StatCard
            label="Applications Submitted"
            value={stats.applicationsSubmitted}
            subtext="Human-verified submissions"
            icon={<SendIcon className="w-4 h-4" />}
            badge={{
              text: 'Zero Auto-Submit',
              variant: 'neutral',
            }}
          />
        </div>
      </section>

      {/* Two-Column Layout for Feed & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 cols): Pending Reviews & Recent Discoveries */}
        <div className="lg:col-span-2 space-y-6">
          <PendingReviewsCard applications={pendingReviews} />
          <RecentJobsCard jobs={recentJobs} />
        </div>

        {/* Right Column (1 col): Automation & Audit Activity */}
        <div className="space-y-6">
          <AutomationStatusCard automation={automation} />
          <RecentActivityCard activity={recentActivity} />
        </div>
      </div>
    </div>
  );
}
