'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  ApplicationListItem,
  ApplicationOverviewMetrics,
  ApplicationFilterParams,
  ApplicationStatus,
} from '@/types/application';
import { ApplicationsOverviewCards } from '@/components/applications/ApplicationsOverviewCards';
import { ApplicationFilterBar } from '@/components/applications/ApplicationFilterBar';
import { ApplicationListTable } from '@/components/applications/ApplicationListTable';
import { SubmissionConfirmModal } from '@/components/applications/SubmissionConfirmModal';
import { RejectConfirmModal } from '@/components/applications/RejectConfirmModal';
import { CheckCircleIcon } from '@/components/icons/Icons';

interface ApplicationsWorkspaceProps {
  initialApplications: ApplicationListItem[];
  initialMetrics: ApplicationOverviewMetrics;
}

const defaultFilters: ApplicationFilterParams = {
  search: '',
  status: 'ALL',
  eligibility: 'all',
  minScore: 0,
};

export function ApplicationsWorkspace({
  initialApplications,
  initialMetrics,
}: ApplicationsWorkspaceProps) {
  const [applications, setApplications] = useState<ApplicationListItem[]>(
    initialApplications
  );
  const [metrics, setMetrics] = useState<ApplicationOverviewMetrics>(initialMetrics);
  const [filters, setFilters] = useState<ApplicationFilterParams>(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [applyModalApp, setApplyModalApp] = useState<ApplicationListItem | null>(
    null
  );
  const [rejectModalApp, setRejectModalApp] = useState<ApplicationListItem | null>(
    null
  );

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchApplications = useCallback(
    async (currentFilters: ApplicationFilterParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (currentFilters.search?.trim()) {
          params.set('search', currentFilters.search.trim());
        }
        if (currentFilters.status && currentFilters.status !== 'ALL') {
          params.set('status', currentFilters.status);
        }
        if (currentFilters.eligibility && currentFilters.eligibility !== 'all') {
          params.set('eligibility', currentFilters.eligibility);
        }
        if (currentFilters.minScore && currentFilters.minScore > 0) {
          params.set('minScore', currentFilters.minScore.toString());
        }

        const res = await fetch(`/api/applications?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.applications)) {
          setApplications(data.applications);
          if (data.metrics) {
            setMetrics(data.metrics);
          }
        } else {
          setError(data.error || 'Failed to load applications.');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Network error loading applications.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleFilterChange = (newFilters: ApplicationFilterParams) => {
    setFilters(newFilters);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (newFilters.search !== filters.search) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchApplications(newFilters);
      }, 300);
    } else {
      fetchApplications(newFilters);
    }
  };

  const handleSelectStatus = (status: ApplicationStatus | 'ALL') => {
    const updated = { ...filters, status };
    setFilters(updated);
    fetchApplications(updated);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    fetchApplications(defaultFilters);
  };

  // Status transitions
  const handleApprove = async (app: ApplicationListItem) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: 'APPROVED' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to approve application.');
        return;
      }
      fetchApplications(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error approving application.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async (app: ApplicationListItem) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: 'ARCHIVED' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to archive application.');
        return;
      }
      fetchApplications(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error archiving application.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmApplied = async (
    submissionDate: string,
    notes?: string
  ) => {
    if (!applyModalApp) return;
    const res = await fetch(`/api/applications/${applyModalApp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetStatus: 'APPLIED',
        submissionConfirmation: true, // explicit human confirmation
        submissionDate,
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to mark application as applied.');
    }
    fetchApplications(filters);
  };

  const handleConfirmReject = async (reason: string, notes?: string) => {
    if (!rejectModalApp) return;
    const res = await fetch(`/api/applications/${rejectModalApp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetStatus: 'REJECTED',
        rejectionReason: reason,
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to reject application.');
    }
    fetchApplications(filters);
  };

  const isFiltered = Boolean(
    filters.search ||
      (filters.status && filters.status !== 'ALL') ||
      (filters.eligibility && filters.eligibility !== 'all')
  );

  return (
    <div className="space-y-6">
      {/* Human-in-the-Loop Principle Banner */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 flex items-start gap-3">
        <div className="p-1 rounded-md bg-indigo-600 text-white shrink-0 mt-0.5">
          <CheckCircleIcon className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs">
          <p className="font-semibold text-indigo-950 dark:text-indigo-200">
            Strict Human-in-the-Loop Architecture
          </p>
          <p className="text-indigo-700 dark:text-indigo-400 mt-0.5 leading-relaxed">
            JobPilot AI prepares tailored application materials and structures your workflow, but <strong>NEVER</strong> automatically submits applications. You inspect, approve, and confirm every submission.
          </p>
        </div>
      </div>

      {/* Summary Pipeline Overview Cards */}
      <ApplicationsOverviewCards
        metrics={metrics}
        activeStatus={filters.status || 'ALL'}
        onSelectStatus={handleSelectStatus}
      />

      {/* Filter & Search Bar */}
      <ApplicationFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        totalCount={applications.length}
      />

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Applications Table */}
      <div className={isLoading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        <ApplicationListTable
          applications={applications}
          onOpenApplyModal={(app) => setApplyModalApp(app)}
          onOpenRejectModal={(app) => setRejectModalApp(app)}
          onApprove={handleApprove}
          onArchive={handleArchive}
          onResetFilters={handleResetFilters}
          isFiltered={isFiltered}
        />
      </div>

      {/* Submission Confirmation Modal */}
      <SubmissionConfirmModal
        application={applyModalApp}
        isOpen={Boolean(applyModalApp)}
        onClose={() => setApplyModalApp(null)}
        onConfirm={handleConfirmApplied}
      />

      {/* Rejection Modal */}
      <RejectConfirmModal
        application={rejectModalApp}
        isOpen={Boolean(rejectModalApp)}
        onClose={() => setRejectModalApp(null)}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}
