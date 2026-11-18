import React, { useRef } from 'react';
import { CandidateProfile } from '@/types/profile';
import { Button } from './common/FormControls';
import {
  SparklesIcon,
  DownloadIcon,
  UploadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FileTextIcon,
} from '@/components/icons/Icons';
import { exportProfileJson } from '@/services/profileService';

interface ProfileHeaderProps {
  profile: CandidateProfile;
  statusMessage: {
    type: 'success' | 'error' | 'info';
    text: string;
  } | null;
  onImport: (jsonStr: string) => void;
  onReset: () => void;
  onOpenUploadCV?: () => void;
}

export function ProfileHeader({
  profile,
  statusMessage,
  onImport,
  onReset,
  onOpenUploadCV,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const jsonStr = exportProfileJson(profile);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobpilot_profile_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onImport(text);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetConfirm = () => {
    if (
      window.confirm(
        'Are you sure you want to reset your profile to empty state? This action will remove all saved inputs.'
      )
    ) {
      onReset();
    }
  };

  const hasName = Boolean(profile.personalInfo.fullName?.trim());

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 backdrop-blur-xs sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Brand & Candidate Profile Summary */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-lg tracking-wider">
              JP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {hasName ? profile.personalInfo.fullName : 'JobPilot AI — Candidate Profile'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <SparklesIcon className="w-3 h-3 text-indigo-500" />
                  Truth Source
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {profile.summary.headline ||
                  'Structured professional profile & employment preferences for AI job evaluation'}
              </p>
            </div>
          </div>

          {/* Quick Actions (Upload CV / Export / Import / Reset) */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {onOpenUploadCV && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<FileTextIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                onClick={onOpenUploadCV}
                title="Upload existing CV document (PDF or DOCX)"
              >
                Upload CV
              </Button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<UploadIcon className="w-3.5 h-3.5" />}
              onClick={() => fileInputRef.current?.click()}
              title="Import verified profile JSON"
            >
              Import
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<DownloadIcon className="w-3.5 h-3.5" />}
              onClick={handleExport}
              title="Export profile JSON"
            >
              Export
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetConfirm}
              className="text-zinc-400 hover:text-rose-600"
              title="Reset profile to empty state"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Global Notification Toast / Status Banner */}
        {statusMessage && (
          <div
            className={`mt-3 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>
    </header>
  );
}
