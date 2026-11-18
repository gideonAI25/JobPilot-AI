'use client';

import React from 'react';
import { ApplicationFilterParams } from '@/types/application';
import { SearchIcon, XIcon } from '@/components/icons/Icons';

interface ApplicationFilterBarProps {
  filters: ApplicationFilterParams;
  onChange: (filters: ApplicationFilterParams) => void;
  onReset: () => void;
  totalCount: number;
}

export function ApplicationFilterBar({
  filters,
  onChange,
  onReset,
  totalCount,
}: ApplicationFilterBarProps) {
  const isFiltered = Boolean(
    filters.search ||
      (filters.status && filters.status !== 'ALL') ||
      (filters.eligibility && filters.eligibility !== 'all') ||
      (filters.minScore && filters.minScore > 0)
  );

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search applications by company, job title, or notes..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Eligibility Filter */}
        <div className="w-full sm:w-44">
          <select
            value={filters.eligibility || 'all'}
            onChange={(e) => onChange({ ...filters, eligibility: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Eligibility</option>
            <option value="ELIGIBLE">Eligible Only</option>
            <option value="BORDERLINE">Borderline</option>
            <option value="INELIGIBLE">Ineligible</option>
          </select>
        </div>

        {/* Reset button */}
        {isFiltered && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <XIcon className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
