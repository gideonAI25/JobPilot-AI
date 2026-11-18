import React from 'react';
import Link from 'next/link';
import { PendingReviewItem } from '@/services/server/dashboardService';
import { SendIcon, FileTextIcon, ChevronRightIcon } from '@/components/icons/Icons';

interface PendingReviewsCardProps {
  applications: PendingReviewItem[];
}

export function PendingReviewsCard({ applications }: PendingReviewsCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Pending Application Reviews
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Applications prepared for your manual review and approval
          </p>
        </div>
        <Link
          href="/applications"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
        >
          <span>View all</span>
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
        {applications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center mx-auto mb-3">
              <SendIcon className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              No pending applications
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
              When high-match opportunities are discovered, tailored application materials will be prepared here for your final sign-off.
            </p>
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app.id}
              className="py-3.5 flex items-center justify-between gap-4 first:pt-1 last:pb-1"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {app.jobTitle}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    {app.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {app.company}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <FileTextIcon className="w-3 h-3 text-zinc-400" />
                    {app.documentsCount} document{app.documentsCount === 1 ? '' : 's'}
                  </span>
                  {app.matchScore !== null && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {app.matchScore}% Match
                      </span>
                    </>
                  )}
                </div>
              </div>

              <Link
                href="/applications"
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                Review
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
