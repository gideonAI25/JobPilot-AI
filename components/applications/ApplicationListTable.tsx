'use client';

import React from 'react';
import Link from 'next/link';
import { ApplicationListItem } from '@/types/application';
import { StatusBadge } from '@/components/applications/StatusBadge';
import {
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveIcon,
  ExternalLinkIcon,
  SparklesIcon,
  AlertCircleIcon,
  ChevronRightIcon,
} from '@/components/icons/Icons';

interface ApplicationListTableProps {
  applications: ApplicationListItem[];
  onOpenApplyModal: (app: ApplicationListItem) => void;
  onOpenRejectModal: (app: ApplicationListItem) => void;
  onApprove: (app: ApplicationListItem) => void;
  onArchive: (app: ApplicationListItem) => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

export function ApplicationListTable({
  applications,
  onOpenApplyModal,
  onOpenRejectModal,
  onApprove,
  onArchive,
  onResetFilters,
  isFiltered,
}: ApplicationListTableProps) {
  if (applications.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center mx-auto mb-3">
          <FileTextIcon className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {isFiltered ? 'No applications match your filter' : 'No applications prepared yet'}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
          {isFiltered
            ? 'Try adjusting your search query or selecting a different status filter to view other applications.'
            : 'Opportunities that match your candidate profile or that you manually track will appear here with tailored materials ready for your review and submission.'}
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
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Explore Discovered Jobs</span>
            </Link>
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
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 hidden md:table-cell">
                Match & Fit
              </th>
              <th scope="col" className="px-4 py-3 hidden sm:table-cell">
                Timeline / Deadline
              </th>
              <th scope="col" className="px-4 py-3 hidden lg:table-cell text-center">
                Materials
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {applications.map((app) => {
              const isPending =
                app.status === 'PENDING_REVIEW' || app.status === 'NEEDS_REVIEW';
              const isApproved =
                app.status === 'APPROVED' || app.status === 'READY_TO_SUBMIT';
              const isApplied = app.status === 'APPLIED';
              const isArchived = app.status === 'ARCHIVED';

              return (
                <tr
                  key={app.id}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  {/* Job Title & Company */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col min-w-0 pr-2">
                      <Link
                        href={`/applications/${app.id}`}
                        className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-xs line-clamp-1"
                      >
                        {app.jobTitle}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {app.company}
                        </span>
                        <span>•</span>
                        <span>{app.location}</span>
                        {app.salary && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                              {app.salary}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Current Status */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <StatusBadge status={app.status} />
                  </td>

                  {/* Match & Fit */}
                  <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                    {app.matchScore !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            app.matchScore >= 80
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {app.matchScore}%
                        </span>
                        {app.eligibility && (
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                            {app.eligibility}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic text-[11px]">
                        No score yet
                      </span>
                    )}
                  </td>

                  {/* Timeline & Deadline */}
                  <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell text-zinc-500 text-[11px]">
                    {app.submissionDate ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Applied {new Date(app.submissionDate).toLocaleDateString()}
                        </span>
                      </div>
                    ) : app.deadline ? (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                        <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Deadline {new Date(app.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    ) : app.preparationDate ? (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Prep {new Date(app.preparationDate).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </td>

                  {/* Materials Count */}
                  <td className="px-4 py-4 whitespace-nowrap hidden lg:table-cell text-center">
                    <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                      <FileTextIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{app.documentsCount}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Approve button for pending */}
                      {isPending && (
                        <button
                          onClick={() => onApprove(app)}
                          title="Approve Application Materials"
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-md border border-emerald-200 dark:border-emerald-800 transition-colors"
                        >
                          Approve
                        </button>
                      )}

                      {/* Confirm Applied button for approved / ready */}
                      {isApproved && (
                        <button
                          onClick={() => onOpenApplyModal(app)}
                          title="Mark as Applied"
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-xs"
                        >
                          Confirm Applied
                        </button>
                      )}

                      {/* Detail Inspection Link */}
                      <Link
                        href={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        <span>Inspect</span>
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </Link>

                      {/* Reject button */}
                      {!isApplied && !isArchived && app.status !== 'REJECTED' && (
                        <button
                          onClick={() => onOpenRejectModal(app)}
                          title="Reject Application"
                          className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                        >
                          <AlertCircleIcon className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Archive button */}
                      {!isArchived && (
                        <button
                          onClick={() => onArchive(app)}
                          title="Archive Opportunity"
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                        >
                          <ArchiveIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
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
