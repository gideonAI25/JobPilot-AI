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
    location: '',
    applicationUrl: '',
    workArrangement: 'remote',
    employmentType: 'full-time',
    experienceLevel: '',
    salary: '',
  });

  const [skillsRaw, setSkillsRaw] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Only Job URL is strictly mandatory
    if (!formData.url?.trim()) {
      setErrorMessage('Job URL is required.');
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
        url: formData.url.trim(),
        title: formData.title?.trim() || undefined,
        company: formData.company?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        applicationUrl: formData.applicationUrl?.trim() || undefined,
        salary: formData.salary?.trim() || undefined,
        experienceLevel: formData.experienceLevel?.trim() || undefined,
        skills: skills.length > 0 ? skills : undefined,
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

  const isLinkedInUrl = formData.url?.toLowerCase().includes('linkedin.com');
  const hasDescription = Boolean(formData.description?.trim());

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
              Paste a job link & description (including LinkedIn) into your pipeline
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
          {/* LinkedIn / Permitted Entry Informational Callout */}
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                LinkedIn & Manual Ingestion:
              </span>
              <span>
                Paste any job URL and its description. No LinkedIn login, credentials, or scraping is performed; we extract the canonical link, normalize the listing, and queue it into your evaluation pipeline.
              </span>
            </div>
          </div>

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
              placeholder="https://www.linkedin.com/jobs/view/1234567890 or https://company.com/careers/..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
            />
            {isLinkedInUrl && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                ✓ Detected LinkedIn URL — tracking parameters will be stripped and canonical ID extracted.
              </p>
            )}
          </div>

          {/* Pasted Job Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Job Description <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              {!hasDescription && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  Missing description flags job for review
                </span>
              )}
            </div>
            <textarea
              rows={5}
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Paste the full job description text or HTML copied from the listing...&#10;&#10;If omitted, the job will still be saved with incomplete status and flagged as 'Needs Review'."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono text-[11px]"
            />
          </div>

          {/* Optional Job Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Job Title <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Leave blank to infer from URL"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Company Name <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                placeholder="Leave blank to infer from URL"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
          </div>

          {/* Toggle Additional Information */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1.5"
            >
              <span>{showAdvanced ? '− Hide additional fields' : '+ Add additional job details (Location, Salary, Skills, etc.)'}</span>
            </button>
          </div>

          {/* Collapsible Additional Fields */}
          {showAdvanced && (
            <div className="p-3.5 bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
              {/* Location & Work Arrangement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. Remote (Worldwide) or New York, NY"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                    Work Arrangement
                  </label>
                  <select
                    value={formData.workArrangement || 'remote'}
                    onChange={(e) =>
                      setFormData({ ...formData, workArrangement: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
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
                    value={formData.employmentType || 'full-time'}
                    onChange={(e) =>
                      setFormData({ ...formData, employmentType: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
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
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="">Unspecified</option>
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
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
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
                    placeholder="https://company.applytojob.com/..."
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                  Skills / Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={skillsRaw}
                  onChange={(e) => setSkillsRaw(e.target.value)}
                  placeholder="Python, PyTorch, LangChain, TypeScript"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Pipeline Note */}
          <p className="text-[11px] text-zinc-400">
            {hasDescription
              ? 'This job will enter the evaluation pipeline immediately with status "Discovered".'
              : 'Saving without a description will mark this job as "Needs Review" so you can provide details before evaluation.'}
          </p>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving Opportunity...' : 'Save Job to Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
