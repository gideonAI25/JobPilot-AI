import React from 'react';
import { StatusBadge, Button } from './FormControls';
import { SaveIcon, XIcon, AlertCircleIcon } from '@/components/icons/Icons';
import { SectionStatus } from '@/types/profile';

interface SectionCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  status: SectionStatus;
  isDirty?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  icon,
  status,
  isDirty = false,
  onSave,
  onCancel,
  children,
  headerAction,
}: SectionCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/40">
        <div className="flex items-start gap-3.5">
          {icon && (
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
              <StatusBadge isComplete={status.isComplete} itemCount={status.itemCount} />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
          </div>
        </div>

        {/* Optional Header Action (e.g. "Add Record" button) */}
        {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
      </div>

      {/* Incomplete Missing Fields Warning */}
      {!status.isComplete && status.missingFields.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong className="font-medium">Missing verified info:</strong>{' '}
            {status.missingFields.join(' • ')}
          </span>
        </div>
      )}

      {/* Main Content Form */}
      <div className="p-6">{children}</div>

      {/* Save & Cancel Action Bar (Shown when section supports onSave/onCancel) */}
      {(onSave || onCancel) && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-zinc-50 dark:bg-zinc-950/50 flex items-center justify-between">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {isDirty ? (
              <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                You have unsaved changes in this section
              </span>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500">All changes saved</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<XIcon className="w-3.5 h-3.5" />}
                onClick={onCancel}
                disabled={!isDirty}
              >
                Cancel
              </Button>
            )}
            {onSave && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<SaveIcon className="w-3.5 h-3.5" />}
                onClick={onSave}
                disabled={!isDirty}
              >
                Save Changes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
