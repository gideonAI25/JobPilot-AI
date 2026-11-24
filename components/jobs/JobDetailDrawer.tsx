'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JobListItem } from '@/types/job';
import {
  XIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SparklesIcon,
  FileTextIcon,
  ClockIcon,
} from '@/components/icons/Icons';

interface JobDetailDrawerProps {
  job: JobListItem | null;
  onClose: () => void;
}

export function JobDetailDrawer({ job, onClose }: JobDetailDrawerProps) {
  const router = useRouter();
  const [isCreatingApp, setIsCreatingApp] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState(job?.evaluation || null);

  if (!job) return null;

  const evalSummary = currentEvaluation;
  const isIneligible = evalSummary?.eligibility === 'INELIGIBLE';

  const handleEvaluate = async (force = false) => {
    setIsEvaluating(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceReevaluate: force }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setCurrentEvaluation({
          id: data.evaluation.id || 'eval-1',
          overallMatchScore: data.evaluation.overallMatchScore,
          scoringDimensions: data.evaluation.scoringDimensions,
          eligibility: data.evaluation.eligibility,
          explanation: data.evaluation.explanation,
          missingQualifications: data.evaluation.missingQualifications || [],
          concerns: data.evaluation.potentialConcerns || [],
          strengths: data.evaluation.relevantQualifications || [],
          recommendation: data.evaluation.recommendation,
          evaluatedAt: new Date(data.evaluation.evaluatedAt).toISOString(),
        });
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to evaluate job:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleStartApplication = async () => {
    if (isIneligible) {
      alert('This job is classified as INELIGIBLE for your location/authorization and cannot proceed to application preparation.');
      return;
    }

    setIsCreatingApp(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (data.success && data.application) {
        router.push(`/applications/${data.application.id}`);
      } else {
        alert(data.error || 'Failed to start application.');
      }
    } catch (err) {
      console.error('Failed to create application:', err);
    } finally {
      setIsCreatingApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full z-10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                {job.sourceName}
              </span>
              <span className="text-xs text-zinc-400">
                Discovered {new Date(job.discoveredAt).toLocaleDateString()}
              </span>
            </div>

            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-2 leading-snug">
              {job.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 font-medium">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {job.company}
              </span>
              <span>•</span>
              <span>{job.location}</span>
              <span>•</span>
              <span className="capitalize">{job.workArrangement}</span>
              {job.employmentType && (
                <>
                  <span>•</span>
                  <span className="capitalize">{job.employmentType}</span>
                </>
              )}
              {job.salary && (
                <>
                  <span>•</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                    {job.salary}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action Links Bar */}
        <div className="px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isIneligible ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold text-xs">
                <AlertCircleIcon className="w-3.5 h-3.5" />
                <span>Ineligible for Application</span>
              </span>
            ) : job.applicationId ? (
              <Link
                href={`/applications/${job.applicationId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                <FileTextIcon className="w-3.5 h-3.5" />
                <span>View Application Record</span>
              </Link>
            ) : (
              <button
                onClick={handleStartApplication}
                disabled={isCreatingApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-xs"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{isCreatingApp ? 'Preparing...' : 'Start Application'}</span>
              </button>
            )}

            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <span>View Posting</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>

            {job.applicationUrl && (
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span>Portal</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {job.experienceLevel && (
            <span className="text-[11px] text-zinc-500 font-medium">
              Seniority: <strong className="text-zinc-800 dark:text-zinc-200">{job.experienceLevel}</strong>
            </span>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Match Evaluation Summary (if evaluated) */}
          {evalSummary ? (
            <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    AI Match Evaluation
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      evalSummary.overallMatchScore >= 80
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    }`}
                  >
                    {evalSummary.overallMatchScore}% Overall Score
                  </span>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {evalSummary.eligibility}
                  </span>
                </div>
              </div>

              {evalSummary.explanation && (
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                  {evalSummary.explanation}
                </p>
              )}

              {/* Scoring Dimensions */}
              {evalSummary.scoringDimensions &&
                Object.keys(evalSummary.scoringDimensions).length > 0 && (
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-2">
                      Scoring Dimensions
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(evalSummary.scoringDimensions).map(
                        ([key, val]) => (
                          <div
                            key={key}
                            className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center"
                          >
                            <span className="text-[10px] text-zinc-500 block capitalize">
                              {key.replace(/Match$/, '')}
                            </span>
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {val}%
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Strengths & Missing Qualifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {evalSummary.strengths.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">
                      Candidate Strengths
                    </span>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                      {evalSummary.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evalSummary.missingQualifications.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">
                      Missing Qualifications
                    </span>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                      {evalSummary.missingQualifications.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs flex items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">Not Evaluated Yet</span>
                <span className="text-zinc-500 text-[11px]">Compare actual requirements against your verified candidate profile.</span>
              </div>
              <button
                onClick={() => handleEvaluate(false)}
                disabled={isEvaluating}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0 disabled:opacity-50"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Fit'}</span>
              </button>
            </div>
          )}

          {/* Required Skills Tags */}
          {job.skills && job.skills.length > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-2">
                Target / Identified Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Job Description Text */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
              Full Job Description
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans bg-zinc-50/50 dark:bg-zinc-800/20 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              {job.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
