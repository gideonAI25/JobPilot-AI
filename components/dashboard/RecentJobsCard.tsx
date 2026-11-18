import React from 'react';
import Link from 'next/link';
import { RecentJobItem } from '@/services/server/dashboardService';
import { SearchIcon, ChevronRightIcon, ExternalLinkIcon } from '@/components/icons/Icons';

interface RecentJobsCardProps {
  jobs: RecentJobItem[];
}

export function RecentJobsCard({ jobs }: RecentJobsCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Recent Job Discoveries
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Latest postings ingested from configured job sources
          </p>
        </div>
        <Link
          href="/jobs"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
        >
          <span>View all</span>
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
        {jobs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center mx-auto mb-3">
              <SearchIcon className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              No jobs discovered yet
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
              Discovered remote jobs will appear here once the ingestion sources are scheduled or triggered.
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="py-3.5 flex items-center justify-between gap-4 first:pt-1 last:pb-1 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {job.title}
                  </h3>
                  {job.matchScore !== null && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        job.matchScore >= 80
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : job.matchScore >= 60
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {job.matchScore}% Match
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {job.company}
                  </span>
                  <span>•</span>
                  <span>{job.location}</span>
                  {job.salary && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {job.salary}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-mono">
                    {job.sourceName}
                  </span>
                </div>
              </div>

              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                  title="Open job posting"
                >
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
