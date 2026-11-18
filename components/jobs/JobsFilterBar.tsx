'use client';

import React from 'react';
import { JobFilterParams } from '@/types/job';
import { SearchIcon, XIcon, SlidersIcon } from '@/components/icons/Icons';

interface JobsFilterBarProps {
  filters: JobFilterParams;
  onChange: (filters: JobFilterParams) => void;
  onReset: () => void;
  availableCompanies: string[];
  totalCount: number;
}

export function JobsFilterBar({
  filters,
  onChange,
  onReset,
  availableCompanies,
  totalCount,
}: JobsFilterBarProps) {
  const isFiltered = Boolean(
    filters.search ||
      (filters.company && filters.company !== 'all') ||
      (filters.workArrangement && filters.workArrangement !== 'all') ||
      (filters.employmentType && filters.employmentType !== 'all') ||
      (filters.experienceLevel && filters.experienceLevel !== 'all') ||
      (filters.minScore && filters.minScore > 0) ||
      (filters.eligibility && filters.eligibility !== 'all')
  );

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3">
      {/* Search Input Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search by job title, company, description, or skills..."
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

        {isFiltered && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <XIcon className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Filter Selects Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
        {/* Work Arrangement */}
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
            Work Arrangement
          </label>
          <select
            value={filters.workArrangement || 'all'}
            onChange={(e) =>
              onChange({ ...filters, workArrangement: e.target.value })
            }
            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Arrangements</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-Site</option>
          </select>
        </div>

        {/* Employment Type */}
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
            Employment Type
          </label>
          <select
            value={filters.employmentType || 'all'}
            onChange={(e) =>
              onChange({ ...filters, employmentType: e.target.value })
            }
            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="full-time">Full-Time</option>
            <option value="part-time">Part-Time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
        </div>

        {/* Experience Level / Seniority */}
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
            Seniority
          </label>
          <select
            value={filters.experienceLevel || 'all'}
            onChange={(e) =>
              onChange({ ...filters, experienceLevel: e.target.value })
            }
            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Levels</option>
            <option value="Junior">Junior</option>
            <option value="Mid-Level">Mid-Level</option>
            <option value="Senior">Senior</option>
            <option value="Lead">Lead</option>
            <option value="Staff">Staff</option>
          </select>
        </div>

        {/* Match Score */}
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
            Match Score
          </label>
          <select
            value={filters.minScore || 0}
            onChange={(e) =>
              onChange({
                ...filters,
                minScore: parseInt(e.target.value, 10) || 0,
              })
            }
            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="0">Any Score</option>
            <option value="80">80%+ Highly Recommended</option>
            <option value="70">70%+ Qualified</option>
            <option value="50">50%+ Evaluated</option>
          </select>
        </div>

        {/* Eligibility */}
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
            Eligibility
          </label>
          <select
            value={filters.eligibility || 'all'}
            onChange={(e) =>
              onChange({ ...filters, eligibility: e.target.value })
            }
            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="ELIGIBLE">Eligible</option>
            <option value="BORDERLINE">Borderline</option>
            <option value="INELIGIBLE">Ineligible</option>
          </select>
        </div>

        {/* Company Filter (if available) */}
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
            Company
          </label>
          <select
            value={filters.company || 'all'}
            onChange={(e) => onChange({ ...filters, company: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Companies</option>
            {availableCompanies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
