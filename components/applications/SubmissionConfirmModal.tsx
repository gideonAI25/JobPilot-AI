'use client';

import React, { useState } from 'react';
import { ApplicationListItem } from '@/types/application';
import {
  XIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
} from '@/components/icons/Icons';

interface SubmissionConfirmModalProps {
  application: ApplicationListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (submissionDate: string, notes?: string) => Promise<void>;
}

export function SubmissionConfirmModal({
  application,
  isOpen,
  onClose,
  onConfirm,
}: SubmissionConfirmModalProps) {
  const [submissionDate, setSubmissionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasConfirmedCheckbox) {
      setError('You must confirm that you manually submitted this application.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(submissionDate, notes.trim() || undefined);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to confirm application submission.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const portalUrl = application.applicationUrl || application.jobUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Confirm Manual Submission
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Mark application as officially applied
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Confirmation Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Job Reference */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
              Position
            </span>
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              {application.jobTitle}
            </div>
            <div className="text-zinc-600 dark:text-zinc-400 mt-0.5 font-medium">
              {application.company} • {application.location}
            </div>
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>Open Application Portal</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Human-in-the-loop Guard Notice */}
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong className="block font-semibold mb-0.5">
              Human Submission Guard:
            </strong>
            JobPilot AI never auto-submits applications. Please ensure you have visited the company's hiring portal and submitted your application yourself before confirming.
          </div>

          {/* Submission Date */}
          <div>
            <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
              Date Submitted <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Submission Notes / Confirmation Number */}
          <div>
            <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
              Submission Notes / Confirmation ID (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Applied via Workday. Confirmation #WD-948271. Recruiter: Jane Doe."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono text-[11px]"
            />
          </div>

          {/* Explicit Human Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasConfirmedCheckbox}
                onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
                I explicitly confirm that I personally reviewed the application materials and submitted this application directly to {application.company}.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasConfirmedCheckbox || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-xs"
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Confirming...' : 'Mark as Applied'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
