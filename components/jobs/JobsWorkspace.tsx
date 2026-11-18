'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { JobListItem, JobFilterParams } from '@/types/job';
import { JobsFilterBar } from '@/components/jobs/JobsFilterBar';
import { JobsTable } from '@/components/jobs/JobsTable';
import { JobDetailDrawer } from '@/components/jobs/JobDetailDrawer';
import { AddJobModal } from '@/components/jobs/AddJobModal';
import { PlusIcon } from '@/components/icons/Icons';

interface JobsWorkspaceProps {
  initialJobs: JobListItem[];
  initialCompanies: string[];
}

const defaultFilters: JobFilterParams = {
  search: '',
  company: 'all',
  workArrangement: 'all',
  employmentType: 'all',
  experienceLevel: 'all',
  minScore: 0,
  eligibility: 'all',
};

export function JobsWorkspace({
  initialJobs,
  initialCompanies,
}: JobsWorkspaceProps) {
  const [jobs, setJobs] = useState<JobListItem[]>(initialJobs);
  const [companies, setCompanies] = useState<string[]>(initialCompanies);
  const [filters, setFilters] = useState<JobFilterParams>(defaultFilters);
  const [selectedJob, setSelectedJob] = useState<JobListItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInitialMount = useRef(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFilteredJobs = useCallback(async (currentFilters: JobFilterParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFilters.search?.trim()) {
        params.set('search', currentFilters.search.trim());
      }
      if (currentFilters.company && currentFilters.company !== 'all') {
        params.set('company', currentFilters.company);
      }
      if (
        currentFilters.workArrangement &&
        currentFilters.workArrangement !== 'all'
      ) {
        params.set('workArrangement', currentFilters.workArrangement);
      }
      if (
        currentFilters.employmentType &&
        currentFilters.employmentType !== 'all'
      ) {
        params.set('employmentType', currentFilters.employmentType);
      }
      if (
        currentFilters.experienceLevel &&
        currentFilters.experienceLevel !== 'all'
      ) {
        params.set('experienceLevel', currentFilters.experienceLevel);
      }
      if (currentFilters.minScore && currentFilters.minScore > 0) {
        params.set('minScore', currentFilters.minScore.toString());
      }
      if (currentFilters.eligibility && currentFilters.eligibility !== 'all') {
        params.set('eligibility', currentFilters.eligibility);
      }

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      } else {
        setError(data.error || 'Failed to load jobs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle filter changes with debounce for search
  const handleFilterChange = (newFilters: JobFilterParams) => {
    setFilters(newFilters);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search text changed, debounce by 300ms, else immediately fetch
    if (newFilters.search !== filters.search) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchFilteredJobs(newFilters);
      }, 300);
    } else {
      fetchFilteredJobs(newFilters);
    }
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    fetchFilteredJobs(defaultFilters);
  };

  const handleJobCreated = (newJob: JobListItem) => {
    setJobs((prev) => [newJob, ...prev]);
    if (newJob.company && !companies.includes(newJob.company)) {
      setCompanies((prev) => [...prev, newJob.company].sort());
    }
    // Automatically select the new job to inspect it
    setSelectedJob(newJob);
  };

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
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Discovered Opportunities
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold">
              {jobs.length}
            </span>
            {isLoading && (
              <span className="text-xs text-zinc-400 animate-pulse font-medium">
                Updating...
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Browse, filter, inspect and manually track job postings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add a Job</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <JobsFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        availableCompanies={companies}
        totalCount={jobs.length}
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Main Jobs Table / List View */}
      <div className={isLoading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        <JobsTable
          jobs={jobs}
          onSelectJob={(job) => setSelectedJob(job)}
          onOpenAddJob={() => setIsAddModalOpen(true)}
          onResetFilters={handleResetFilters}
          isFiltered={isFiltered}
        />
      </div>

      {/* Slide-over Detail Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />

      {/* Add Job Modal */}
      <AddJobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleJobCreated}
      />
    </div>
  );
}
