'use client';

import React from 'react';
import { JobListItem } from '@/types/job';
import {
  ExternalLinkIcon,
  SearchIcon,
  PlusIcon,
  SparklesIcon,
  ClockIcon,
} from '@/components/icons/Icons';

interface JobsTableProps {
  jobs: JobListItem[];
  onSelectJob: (job: JobListItem) => void;
  onOpenAddJob: () => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

export function JobsTable({
  jobs,
  onSelectJob,
  onOpenAddJob,
  onResetFilters,
  isFiltered,
}: JobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center mx-auto mb-3">
          <SearchIcon className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {isFiltered ? 'No matching jobs found' : 'No jobs in database'}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
          {isFiltered
            ? 'Try adjusting your search terms or clearing one or more filters to view more opportunities.'
            : 'No job opportunities have been discovered or manually entered yet. Add your first job posting to begin evaluating it against your profile.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {isFiltered && onResetFilters ? (
            <button
              onClick={onResetFilters}
              className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={onOpenAddJob}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add a Job</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
              <th scope="col" className="px-5 py-3">
                Job & Company
              </th>
              <th scope="col" className="px-4 py-3 hidden md:table-cell">
                Location & Type
              </th>
              <th scope="col" className="px-4 py-3 hidden lg:table-cell">
                Seniority
              </th>
              <th scope="col" className="px-4 py-3">
                Match & Eligibility
              </th>
              <th scope="col" className="px-4 py-3 hidden sm:table-cell">
                Discovered
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {jobs.map((job) => {
              const evalSummary = job.evaluation;

              return (
                <tr
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                >
                  {/* Job Title & Company */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-xs line-clamp-1">
                        {job.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {job.company}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{job.workArrangement}</span>
                        {job.sourceName && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-mono text-zinc-600 dark:text-zinc-400">
                              {job.sourceName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Location & Employment Type */}
                  <td className="px-4 py-3.5 hidden md:table-cell whitespace-nowrap">
                    <div className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {job.location}
                    </div>
                    <div className="text-[11px] text-zinc-400 capitalize">
                      {job.employmentType || 'Not specified'}
                    </div>
                  </td>

                  {/* Seniority */}
                  <td className="px-4 py-3.5 hidden lg:table-cell whitespace-nowrap">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {job.experienceLevel || '—'}
                    </span>
                  </td>

                  {/* Match & Eligibility */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {evalSummary ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            evalSummary.overallMatchScore >= 80
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {evalSummary.overallMatchScore}% Match
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            evalSummary.eligibility === 'ELIGIBLE'
                              ? 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : evalSummary.eligibility === 'BORDERLINE'
                              ? 'bg-amber-100/70 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-rose-100/70 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {evalSummary.eligibility}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic text-[11px] flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                        Not evaluated
                      </span>
                    )}
                  </td>

                  {/* Discovered Date */}
                  <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap text-zinc-400 text-[11px]">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{new Date(job.discoveredAt).toLocaleDateString()}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onSelectJob(job)}
                        className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        Details
                      </button>

                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                        title="View Original Posting"
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
