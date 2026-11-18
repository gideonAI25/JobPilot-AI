'use client';

import React, { useState } from 'react';
import { SectionStatus, CVDocRecord } from '@/types/profile';
import {
  FileTextIcon,
  TrashIcon,
  UploadIcon,
  CheckCircleIcon,
  CircleDotIcon,
} from '@/components/icons/Icons';
import { deleteCVDocument } from '@/services/profileService';

interface CVDocumentsSectionProps {
  documents: CVDocRecord[];
  status: SectionStatus;
  onOpenUpload: () => void;
  onRefresh: () => void;
}

export function CVDocumentsSection({
  documents,
  status,
  onOpenUpload,
  onRefresh,
}: CVDocumentsSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from your uploaded CV records?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const ok = await deleteCVDocument(id);
      if (ok) {
        onRefresh();
      } else {
        alert('Failed to delete CV document.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string): string => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Uploaded CV Documents
            </h2>
            {status.isComplete ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                {documents.length} Uploaded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <CircleDotIcon className="w-3.5 h-3.5" />
                No Documents
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Persisted CV and resume source documents stored locally in SQLite database.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <UploadIcon className="w-4 h-4" />
          Upload CV Document
        </button>
      </div>

      {/* Documents List */}
      <div className="mt-6 space-y-3">
        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <FileTextIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No CV documents uploaded yet
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
              Upload your PDF or DOCX resume so JobPilot AI can extract your information and maintain your verified profile.
            </p>
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <UploadIcon className="w-4 h-4" />
              Upload CV Document
            </button>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FileTextIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {doc.originalFilename}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">
                      {doc.mimeType.includes('pdf') ? 'PDF' : 'DOCX'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={() => handleDelete(doc.id, doc.originalFilename)}
                  disabled={deletingId === doc.id}
                  className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-50"
                  title="Remove CV record"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
