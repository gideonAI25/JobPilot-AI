'use client';

import React from 'react';
import { ApplicationOverviewMetrics, ApplicationStatus } from '@/types/application';
import {
  SendIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  ArchiveIcon,
  SparklesIcon,
} from '@/components/icons/Icons';

interface ApplicationsOverviewCardsProps {
  metrics: ApplicationOverviewMetrics;
  activeStatus: ApplicationStatus | 'ALL';
  onSelectStatus: (status: ApplicationStatus | 'ALL') => void;
}

export function ApplicationsOverviewCards({
  metrics,
  activeStatus,
  onSelectStatus,
}: ApplicationsOverviewCardsProps) {
  const actionableCount = metrics.pendingReview + metrics.needsReview;
  const readyCount = metrics.approved + metrics.readyToSubmit;
  const inactiveCount = metrics.rejected + metrics.archived + metrics.expired;

  return (
    <div className="space-y-4">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Applications */}
        <div
          onClick={() => onSelectStatus('ALL')}
          className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 cursor-pointer transition-all ${
            activeStatus === 'ALL'
              ? 'border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span className="font-medium">Total Opportunities</span>
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <SendIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {metrics.total}
            </span>
            <span className="text-[11px] text-zinc-400">tracked</span>
          </div>
        </div>

        {/* Actionable / Pending Review */}
        <div
          onClick={() => onSelectStatus('PENDING_REVIEW')}
          className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 cursor-pointer transition-all ${
            activeStatus === 'PENDING_REVIEW'
              ? 'border-purple-600 dark:border-purple-400 ring-1 ring-purple-600 dark:ring-purple-400 shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span className="font-medium text-purple-700 dark:text-purple-300">
              Pending Review
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {actionableCount}
            </span>
            <span className="text-[11px] text-zinc-400">needs review</span>
          </div>
        </div>

        {/* Ready to Submit / Approved */}
        <div
          onClick={() => onSelectStatus('READY_TO_SUBMIT')}
          className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 cursor-pointer transition-all ${
            activeStatus === 'READY_TO_SUBMIT' || activeStatus === 'APPROVED'
              ? 'border-teal-600 dark:border-teal-400 ring-1 ring-teal-600 dark:ring-teal-400 shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span className="font-medium text-teal-700 dark:text-teal-300">
              Ready to Submit
            </span>
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <SparklesIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {readyCount}
            </span>
            <span className="text-[11px] text-zinc-400">approved</span>
          </div>
        </div>

        {/* Applied */}
        <div
          onClick={() => onSelectStatus('APPLIED')}
          className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 cursor-pointer transition-all ${
            activeStatus === 'APPLIED'
              ? 'border-emerald-600 dark:border-emerald-400 ring-1 ring-emerald-600 dark:ring-emerald-400 shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span className="font-medium text-emerald-700 dark:text-emerald-300">
              Submitted
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {metrics.applied}
            </span>
            <span className="text-[11px] text-zinc-400">manually applied</span>
          </div>
        </div>
      </div>

      {/* Filter Status Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { label: 'All', value: 'ALL', count: metrics.total },
          { label: 'Pending Review', value: 'PENDING_REVIEW', count: metrics.pendingReview },
          { label: 'Approved', value: 'APPROVED', count: metrics.approved },
          { label: 'Ready to Submit', value: 'READY_TO_SUBMIT', count: metrics.readyToSubmit },
          { label: 'Applied', value: 'APPLIED', count: metrics.applied },
          { label: 'Needs Review', value: 'NEEDS_REVIEW', count: metrics.needsReview },
          { label: 'Preparing', value: 'PREPARING', count: metrics.preparing },
          { label: 'Discovered', value: 'DISCOVERED', count: metrics.discovered },
          { label: 'Rejected', value: 'REJECTED', count: metrics.rejected },
          { label: 'Archived', value: 'ARCHIVED', count: metrics.archived },
        ].map((tab) => {
          const isActive = activeStatus === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onSelectStatus(tab.value as ApplicationStatus | 'ALL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
