import React from 'react';
import {
  ProfileSectionId,
  ProfileCompletionSummary,
} from '@/types/profile';
import {
  UserIcon,
  FileTextIcon,
  GraduationCapIcon,
  BriefcaseIcon,
  CodeIcon,
  FolderGitIcon,
  AwardIcon,
  SlidersIcon,
  MessageSquareIcon,
  UploadIcon,
  CheckCircleIcon,
  CircleDotIcon,
} from '@/components/icons/Icons';

interface ProfileSidebarProps {
  activeSection: ProfileSectionId;
  onSelectSection: (section: ProfileSectionId) => void;
  completion: ProfileCompletionSummary;
  isDirty: boolean;
}

interface NavItem {
  id: ProfileSectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'personal', title: 'Personal Information', icon: UserIcon },
  { id: 'summary', title: 'Professional Summary', icon: FileTextIcon },
  { id: 'education', title: 'Education', icon: GraduationCapIcon },
  { id: 'experience', title: 'Work Experience', icon: BriefcaseIcon },
  { id: 'skills', title: 'Technical Skills', icon: CodeIcon },
  { id: 'projects', title: 'Projects', icon: FolderGitIcon },
  { id: 'certifications', title: 'Certifications', icon: AwardIcon },
  { id: 'preferences', title: 'Employment Preferences', icon: SlidersIcon },
  { id: 'standard-answers', title: 'Standard Answers', icon: MessageSquareIcon },
  { id: 'cv-documents', title: 'CV Documents', icon: UploadIcon },
];

export function ProfileSidebar({
  activeSection,
  onSelectSection,
  completion,
  isDirty,
}: ProfileSidebarProps) {
  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-4">
      {/* Profile Completion Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Profile Strength
          </span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {completion.completionPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              completion.completionPercentage === 100
                ? 'bg-emerald-500'
                : completion.completionPercentage > 50
                ? 'bg-indigo-600'
                : 'bg-amber-500'
            }`}
            style={{ width: `${completion.completionPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            {completion.completedSections} of {completion.totalSections} sections verified
          </span>
          {completion.isFullyComplete ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready for AI</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">In Progress</span>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 shadow-xs space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const status = completion.sections[item.id];
          const isComplete = status?.isComplete;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-xs font-medium cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                />
                <span className="truncate">{item.title}</span>
                {isActive && isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved edits" />
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {status?.itemCount !== undefined && status.itemCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-indigo-200/60 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {status.itemCount}
                  </span>
                )}
                {isComplete ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CircleDotIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
