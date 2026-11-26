'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ApplicationDetail,
  ApplicationStatus,
  DocumentType,
  GeneratedDocumentItem,
} from '@/types/application';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { SubmissionConfirmModal } from '@/components/applications/SubmissionConfirmModal';
import { RejectConfirmModal } from '@/components/applications/RejectConfirmModal';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  FileTextIcon,
  ExternalLinkIcon,
  SparklesIcon,
  ClockIcon,
  AlertCircleIcon,
  ArchiveIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  HistoryIcon,
  EyeIcon,
  DownloadIcon,
} from '@/components/icons/Icons';

interface ApplicationDetailViewProps {
  initialApplication: ApplicationDetail;
}

export function ApplicationDetailView({
  initialApplication,
}: ApplicationDetailViewProps) {
  const router = useRouter();
  const [app, setApp] = useState<ApplicationDetail>(initialApplication);
  const [activeTab, setActiveTab] = useState<'materials' | 'job' | 'history'>(
    'materials'
  );

  // Document Editing state
  const [activeDocType, setActiveDocType] = useState<DocumentType>(
    'TAILORED_RESUME'
  );
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [docFeedback, setDocFeedback] = useState<string | null>(null);

  // Application Notes state
  const [notes, setNotes] = useState(app.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Document Generation & Versioning state
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [previewModalDoc, setPreviewModalDoc] =
    useState<GeneratedDocumentItem | null>(null);

  const portalUrl = app.applicationUrl || app.jobUrl;

  // Documents matching the active type, sorted newest version first
  const matchingDocs = app.generatedDocuments
    .filter((d) => d.documentType === activeDocType)
    .sort((a, b) => b.version - a.version);

  // Selected document (explicitly chosen docId or latest version)
  const currentDoc =
    matchingDocs.find((d) => d.id === selectedDocId) ||
    matchingDocs[0] ||
    null;

  // Generate or Regenerate tailored CV or Cover Letter
  const handleGenerateDocument = async () => {
    setIsGeneratingDoc(true);
    setGenerateError(null);
    setDocFeedback(null);
    try {
      const endpoint =
        activeDocType === 'COVER_LETTER'
          ? `/api/applications/${app.id}/documents/cover-letter/generate`
          : `/api/applications/${app.id}/documents/generate`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customInstructions: customInstructions.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            `Failed to generate ${activeDocType.replace(/_/g, ' ').toLowerCase()}.`
        );
      }

      // Refresh application details
      const refreshRes = await fetch(`/api/applications/${app.id}`);
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.application) {
        setApp(refreshData.application);
        if (data.documentId) {
          setSelectedDocId(data.documentId);
        }
      }

      setShowCustomInstructions(false);
      setCustomInstructions('');
      const docLabel =
        activeDocType === 'COVER_LETTER' ? 'Cover Letter' : 'Tailored CV';
      setDocFeedback(`${docLabel} v${data.version} generated successfully!`);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Error generating document.'
      );
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // Start editing document
  const handleStartEditDoc = () => {
    setEditedContent(currentDoc?.content || '');
    setIsEditingDoc(true);
    setDocFeedback(null);
  };

  // Save document changes
  const handleSaveDoc = async () => {
    setIsSavingDoc(true);
    setDocFeedback(null);
    try {
      const res = await fetch(`/api/applications/${app.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDoc?.id,
          documentType: activeDocType,
          originalFilename:
            currentDoc?.originalFilename ||
            `${activeDocType.toLowerCase()}_${app.company.replace(/\s+/g, '_')}.md`,
          content: editedContent,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save document.');
      }

      // Refresh application details
      const refreshRes = await fetch(`/api/applications/${app.id}`);
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.application) {
        setApp(refreshData.application);
      }

      setIsEditingDoc(false);
      setDocFeedback('Document saved successfully.');
    } catch (err) {
      setDocFeedback(
        err instanceof Error ? err.message : 'Error saving document.'
      );
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Save application notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus: app.status,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save notes.');
      }
      setIsEditingNotes(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Transition status
  const handleTransitionStatus = async (
    targetStatus: ApplicationStatus,
    customPayload: Record<string, any> = {}
  ) => {
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          ...customPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to transition to ${targetStatus}`);
      }

      // Reload full detail with updated activity history
      const detailRes = await fetch(`/api/applications/${app.id}`);
      const detailData = await detailRes.json();
      if (detailData.success && detailData.application) {
        setApp(detailData.application);
      }
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Error updating application status.'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button link */}
      <div>
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Back to Applications</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={app.status} size="md" />
              {app.matchScore !== null && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                    app.matchScore >= 80
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  {app.matchScore}% Match
                </span>
              )}
              {app.eligibility && (
                <span className="text-[11px] uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {app.eligibility}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {app.jobTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium pt-0.5">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {app.company}
              </span>
              <span>•</span>
              <span>{app.location}</span>
              <span>•</span>
              <span className="capitalize">{app.workArrangement}</span>
              {app.salary && (
                <>
                  <span>•</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                    {app.salary}
                  </span>
                </>
              )}
              {app.preparationDate && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <ClockIcon className="w-3.5 h-3.5" />
                    Prepared {new Date(app.preparationDate).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* External Links */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {app.jobUrl && (
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span>Job Posting</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            )}
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
              >
                <span>Employer Portal</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Workflow Action Command Strip */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-medium">Workflow Actions:</span>
            {app.status === 'APPLIED' ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <CheckCircleIcon className="w-4 h-4" />
                Submitted on{' '}
                {app.submissionDate
                  ? new Date(app.submissionDate).toLocaleDateString()
                  : 'file'}
              </span>
            ) : app.status === 'REJECTED' ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                Rejected: {app.rejectionReason || 'Declined opportunity'}
              </span>
            ) : app.status === 'ARCHIVED' ? (
              <span className="text-zinc-500 font-semibold">Archived</span>
            ) : (
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                Stage: {app.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Approve Button (when PENDING_REVIEW or NEEDS_REVIEW) */}
            {(app.status === 'PENDING_REVIEW' ||
              app.status === 'NEEDS_REVIEW' ||
              app.status === 'PREPARING') && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleTransitionStatus('APPROVED')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>Approve Materials</span>
              </button>
            )}

            {/* Ready to Submit Button (when APPROVED) */}
            {app.status === 'APPROVED' && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleTransitionStatus('READY_TO_SUBMIT')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Ready to Submit</span>
              </button>
            )}

            {/* Confirm Manual Submission (Active for APPROVED or READY_TO_SUBMIT or PENDING_REVIEW) */}
            {app.status !== 'APPLIED' && (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>Confirm Applied</span>
              </button>
            )}

            {/* Reject Button */}
            {app.status !== 'REJECTED' && app.status !== 'APPLIED' && (
              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors"
              >
                Reject
              </button>
            )}

            {/* Re-open Review (if Rejected or Archived) */}
            {(app.status === 'REJECTED' || app.status === 'ARCHIVED') && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleTransitionStatus('PENDING_REVIEW')}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                Re-open for Review
              </button>
            )}

            {/* Archive Button */}
            {app.status !== 'ARCHIVED' && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleTransitionStatus('ARCHIVED')}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Archive Application"
              >
                <ArchiveIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        <button
          onClick={() => setActiveTab('materials')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'materials'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <FileTextIcon className="w-4 h-4" />
          <span>Application Materials ({app.generatedDocuments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('job')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'job'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          <span>Job Details & AI Fit</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'history'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <HistoryIcon className="w-4 h-4" />
          <span>Activity Audit History ({app.activityHistory.length})</span>
        </button>
      </div>

      {/* TAB 1: APPLICATION MATERIALS & DOCUMENTS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            {/* Document sub-type selector header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { type: 'TAILORED_RESUME', label: 'Tailored Resume' },
                  { type: 'COVER_LETTER', label: 'Cover Letter' },
                  { type: 'APPLICATION_ANSWERS', label: 'Screening Answers' },
                ].map((item) => {
                  const isSelected = activeDocType === item.type;
                  const docExists = app.generatedDocuments.some(
                    (d) => d.documentType === item.type
                  );
                  return (
                    <button
                      key={item.type}
                      onClick={() => {
                        setActiveDocType(item.type as DocumentType);
                        setSelectedDocId(null);
                        setIsEditingDoc(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      <span>{item.label}</span>
                      {docExists && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}

                {/* Version switcher if multiple versions exist */}
                {matchingDocs.length > 1 && (
                  <div className="flex items-center gap-1 pl-3 border-l border-zinc-200 dark:border-zinc-700 ml-1">
                    <span className="text-[11px] font-medium text-zinc-400">Ver:</span>
                    {matchingDocs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          setIsEditingDoc(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${
                          currentDoc?.id === doc.id
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                            : 'bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300'
                        }`}
                      >
                        v{doc.version}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons for Document */}
              <div className="flex flex-wrap items-center gap-2">
                {/* AI Tailoring Button for Resume or Cover Letter */}
                {(activeDocType === 'TAILORED_RESUME' ||
                  activeDocType === 'COVER_LETTER') &&
                  !isEditingDoc && (
                    <>
                      <button
                        onClick={() => setShowCustomInstructions(!showCustomInstructions)}
                        className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Add custom tailoring instructions for Gemini"
                      >
                        Instructions {showCustomInstructions ? '▲' : '▼'}
                      </button>

                      <button
                        onClick={handleGenerateDocument}
                        disabled={isGeneratingDoc}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                      >
                        <SparklesIcon className={`w-3.5 h-3.5 ${isGeneratingDoc ? 'animate-spin' : ''}`} />
                        <span>
                          {isGeneratingDoc
                            ? `Tailoring ${
                                activeDocType === 'COVER_LETTER' ? 'Cover Letter' : 'CV'
                              } with Gemini...`
                            : matchingDocs.length > 0
                            ? `Regenerate ${
                                activeDocType === 'COVER_LETTER' ? 'Cover Letter' : 'CV'
                              }`
                            : `Generate ${
                                activeDocType === 'COVER_LETTER' ? 'Cover Letter' : 'Tailored CV'
                              }`}
                        </span>
                      </button>
                    </>
                  )}

                {/* PDF Preview and Download Buttons */}
                {currentDoc && !isEditingDoc && (
                  <>
                    <button
                      onClick={() => setPreviewModalDoc(currentDoc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold rounded-lg transition-colors"
                      title="Preview ATS-Compliant PDF"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>Preview PDF</span>
                    </button>

                    <a
                      href={`/api/applications/${app.id}/documents/${currentDoc.id}/download`}
                      download={currentDoc.originalFilename}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold rounded-lg transition-colors"
                      title="Download Vector PDF"
                    >
                      <DownloadIcon className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </>
                )}

                {isEditingDoc ? (
                  <>
                    <button
                      onClick={() => setIsEditingDoc(false)}
                      disabled={isSavingDoc}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveDoc}
                      disabled={isSavingDoc}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
                    >
                      <SaveIcon className="w-3.5 h-3.5" />
                      <span>{isSavingDoc ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartEditDoc}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                    <span>{currentDoc ? 'Edit Content' : 'Draft Material'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Instructions Collapsible Panel */}
            {showCustomInstructions && (
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
                <label className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center justify-between">
                  <span>Custom Tailoring Guidance for Gemini (Optional)</span>
                  <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">Strictly grounded in verified profile</span>
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Emphasize my experience with Next.js and LLM orchestration; prioritize backend architecture projects..."
                  className="w-full p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Document Body */}
            <div className="p-6">
              {docFeedback && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  {docFeedback}
                </div>
              )}

              {generateError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 font-medium">
                  {generateError}
                </div>
              )}

              {/* Alert for Flagged Information Gaps */}
              {currentDoc?.content?.includes('Flagged Information Gaps') && (
                <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                    <AlertCircleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>⚠️ Flagged Information Gaps (Manual Confirmation Required)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed pl-6">
                    Certain qualifications in this job description are unverified in your candidate profile. In accordance with JobPilot AI&apos;s anti-hallucination contract, these skills were NOT fabricated. Review them below before submitting.
                  </p>
                </div>
              )}

              {isEditingDoc ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Editing {activeDocType.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-[11px]">
                      Markdown supported • PDF auto-synchronizes on save
                    </span>
                  </div>
                  <textarea
                    rows={18}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder={`Write or paste tailored ${activeDocType.replace(
                      /_/g,
                      ' '
                    )} content...`}
                    className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 leading-relaxed"
                  />
                </div>
              ) : currentDoc?.content ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {currentDoc.originalFilename}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">
                        v{currentDoc.version}
                      </span>
                      {currentDoc.mimeType === 'application/pdf' && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono text-[10px]">
                          PDF Ready
                        </span>
                      )}
                    </div>
                    <span>
                      Updated {new Date(currentDoc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-50/40 dark:bg-zinc-800/20 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {currentDoc.content}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileTextIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    No {activeDocType.replace(/_/g, ' ')} drafted yet
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1.5 mb-5 leading-relaxed">
                    {activeDocType === 'TAILORED_RESUME'
                      ? 'Generate an ATS-compliant, tailored vector PDF resume customized to this job description using Gemini with 100% factual accuracy.'
                      : activeDocType === 'COVER_LETTER'
                      ? 'Generate an authentic, tailored, job-specific cover letter connecting your genuine achievements to this role with zero AI clichés.'
                      : 'Draft and customize application materials manually or tailor them for review.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {(activeDocType === 'TAILORED_RESUME' ||
                      activeDocType === 'COVER_LETTER') && (
                      <button
                        onClick={handleGenerateDocument}
                        disabled={isGeneratingDoc}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                      >
                        <SparklesIcon className={`w-4 h-4 ${isGeneratingDoc ? 'animate-spin' : ''}`} />
                        <span>
                          {isGeneratingDoc
                            ? `Tailoring ${
                                activeDocType === 'COVER_LETTER' ? 'Cover Letter' : 'CV'
                              } with Gemini...`
                            : `Generate ${
                                activeDocType === 'COVER_LETTER' ? 'Cover Letter' : 'Tailored CV'
                              } with AI`}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={handleStartEditDoc}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold transition-colors"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                      <span>Draft Manually</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Application Notes Box */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Application Notes & Tracking Context
              </h3>
              {isEditingNotes ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-md"
                  >
                    <SaveIcon className="w-3 h-3" />
                    <span>{isSavingNotes ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 font-semibold"
                >
                  <EditIcon className="w-3 h-3" />
                  <span>Edit Notes</span>
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any interview notes, recruiter contacts, or referral details..."
                className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            ) : (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                {app.notes || 'No notes added yet for this application.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: JOB DETAILS & MATCH ANALYSIS */}
      {activeTab === 'job' && (
        <div className="space-y-6">
          {/* AI Match Breakdown (if available) */}
          {app.evaluationSummary && (
            <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    AI Evaluation & Match Dimensions
                  </span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  {app.evaluationSummary.overallMatchScore}% Overall Fit
                </span>
              </div>

              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                {app.evaluationSummary.explanation}
              </p>

              {/* Strengths & Missing Qualifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {app.evaluationSummary.strengths.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">
                      Strengths Matched
                    </span>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                      {app.evaluationSummary.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {app.evaluationSummary.missingQualifications.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">
                      Missing Qualifications / Gaps
                    </span>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                      {app.evaluationSummary.missingQualifications.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Required Skills */}
          {app.jobSkills && app.jobSkills.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Target / Required Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {app.jobSkills.map((s, i) => (
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

          {/* Full Job Description */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Original Job Description
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans bg-zinc-50/50 dark:bg-zinc-800/20 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              {app.jobDescription || 'No description provided.'}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVITY AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Application Activity & Status Audit Trail
            </h3>
          </div>

          {app.activityHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-400">
              No activity logs recorded yet for this application.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {app.activityHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs"
                >
                  <div className="p-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] shrink-0 mt-0.5">
                    {item.action}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {typeof item.details === 'object' && item.details !== null
                        ? Object.entries(item.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ')
                        : String(item.details || 'Event logged')}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submission Confirmation Modal */}
      <SubmissionConfirmModal
        application={app}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onConfirm={async (submissionDate, notes) => {
          await handleTransitionStatus('APPLIED', {
            submissionConfirmation: true,
            submissionDate,
            notes,
          });
        }}
      />

      {/* Reject Confirmation Modal */}
      <RejectConfirmModal
        application={app}
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={async (reason, customNotes) => {
          await handleTransitionStatus('REJECTED', {
            rejectionReason: reason,
            notes: customNotes,
          });
        }}
      />

      {/* PDF Document Preview Modal */}
      {previewModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
              <div className="flex items-center gap-2">
                <FileTextIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {previewModalDoc.originalFilename} (v{previewModalDoc.version})
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  ATS-Friendly Vector PDF
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/applications/${app.id}/documents/${previewModalDoc.id}/download`}
                  download={previewModalDoc.originalFilename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setPreviewModalDoc(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-2 bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
              <iframe
                src={`/api/applications/${app.id}/documents/${previewModalDoc.id}/preview`}
                className="w-full h-[75vh] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white"
                title="PDF CV Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
