'use client';

import React from 'react';
import { ApplicationStatus } from '@/types/application';

interface StatusBadgeProps {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const normStatus = (status || 'PENDING_REVIEW').toUpperCase() as ApplicationStatus;

  let label = normStatus.replace(/_/g, ' ');
  let colorClasses =
    'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';

  switch (normStatus) {
    case 'DISCOVERED':
      label = 'Discovered';
      colorClasses =
        'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
      break;
    case 'EVALUATING':
      label = 'Evaluating';
      colorClasses =
        'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      break;
    case 'NEEDS_REVIEW':
      label = 'Needs Review';
      colorClasses =
        'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      break;
    case 'PREPARING':
      label = 'Preparing';
      colorClasses =
        'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      break;
    case 'PENDING_REVIEW':
      label = 'Pending Review';
      colorClasses =
        'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      break;
    case 'APPROVED':
      label = 'Approved';
      colorClasses =
        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      break;
    case 'READY_TO_SUBMIT':
      label = 'Ready to Submit';
      colorClasses =
        'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      break;
    case 'APPLIED':
      label = 'Applied';
      colorClasses =
        'bg-emerald-600 dark:bg-emerald-500 text-white border-transparent font-bold';
      break;
    case 'REJECTED':
      label = 'Rejected';
      colorClasses =
        'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      break;
    case 'EXPIRED':
      label = 'Expired';
      colorClasses =
        'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 line-through';
      break;
    case 'ARCHIVED':
      label = 'Archived';
      colorClasses =
        'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700';
      break;
    default:
      label = String(status || 'PENDING_REVIEW').replace(/_/g, ' ');
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 tracking-wide'
      : 'text-xs px-2.5 py-1 tracking-normal';

  return (
    <span
      className={`inline-flex items-center font-semibold uppercase rounded-md border shrink-0 ${sizeClasses} ${colorClasses}`}
    >
      {label}
    </span>
  );
}

