'use client';

import React, { useState } from 'react';
import { ManualJobInput, JobListItem } from '@/types/job';
import { XIcon, PlusIcon, AlertCircleIcon } from '@/components/icons/Icons';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (job: JobListItem) => void;
}

export function AddJobModal({ isOpen, onClose, onSuccess }: AddJobModalProps) {
  const [formData, setFormData] = useState<ManualJobInput>({
    url: '',
    title: '',
    company: '',
    description: '',
    location: 'Remote',
    applicationUrl: '',
    workArrangement: 'remote',
    employmentType: 'full-time',
    experienceLevel: 'Senior',
    salary: '',
  });

  const [skillsRaw, setSkillsRaw] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic frontend checks
    if (!formData.url.trim()) {
      setErrorMessage('Job URL is required.');
      return;
    }
    if (!formData.title.trim()) {
      setErrorMessage('Job title is required.');
      return;
    }
    if (!formData.company.trim()) {
      setErrorMessage('Company name is required.');
      return;
    }
    if (!formData.description.trim()) {
      setErrorMessage('Job description is required.');
      return;
    }

    const skills = skillsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const payload: ManualJobInput = {
        ...formData,
        skills,
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to add job.');
        return;
      }

      onSuccess(data.job);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Network error while adding job.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Add a Job Opportunity
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manually add a job posting to your tracking database
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Job URL (Required) */}
          <div>
            <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
              Job Posting URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://company.com/careers/senior-engineer"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Unique web URL of the job listing. Prevents duplicates in database.
            </p>
          </div>

          {/* Job Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Senior Full Stack Engineer"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                placeholder="Acme Innovations"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
          </div>

          {/* Location & Work Arrangement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Remote (Worldwide) or City, Country"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Work Arrangement
              </label>
              <select
                value={formData.workArrangement}
                onChange={(e) =>
                  setFormData({ ...formData, workArrangement: e.target.value })
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-Site</option>
              </select>
            </div>
          </div>

          {/* Employment Type & Seniority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Employment Type
              </label>
              <select
                value={formData.employmentType || ''}
                onChange={(e) =>
                  setFormData({ ...formData, employmentType: e.target.value })
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="full-time">Full-Time</option>
                <option value="contract">Contract</option>
                <option value="part-time">Part-Time</option>
                <option value="freelance">Freelance</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Experience Level
              </label>
              <select
                value={formData.experienceLevel || ''}
                onChange={(e) =>
                  setFormData({ ...formData, experienceLevel: e.target.value })
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="Junior">Junior</option>
                <option value="Mid-Level">Mid-Level</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
          </div>

          {/* Salary & Application URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Salary / Compensation
              </label>
              <input
                type="text"
                value={formData.salary || ''}
                onChange={(e) =>
                  setFormData({ ...formData, salary: e.target.value })
                }
                placeholder="e.g. $130,000 - $160,000 USD"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Direct Application Portal URL
              </label>
              <input
                type="url"
                value={formData.applicationUrl || ''}
                onChange={(e) =>
                  setFormData({ ...formData, applicationUrl: e.target.value })
                }
                placeholder="https://lever.co/acme/apply..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
          </div>

          {/* Skills (comma separated) */}
          <div>
            <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
              Skills / Technologies (comma separated)
            </label>
            <input
              type="text"
              value={skillsRaw}
              onChange={(e) => setSkillsRaw(e.target.value)}
              placeholder="TypeScript, Next.js, Node.js, SQLite"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Full Job Description (Required) */}
          <div>
            <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
              Full Job Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={6}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Paste the full job description text here..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono text-[11px]"
            />
          </div>

          {/* Footer Submit */}
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 shadow-xs"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving to Database...' : 'Save Job to Database'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
