import React from 'react';
import { RecentActivityItem } from '@/services/server/dashboardService';
import { ClockIcon } from '@/components/icons/Icons';

interface RecentActivityCardProps {
  activity: RecentActivityItem[];
}

export function RecentActivityCard({ activity }: RecentActivityCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
      <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Recent System Activity
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Audit events across evaluations, applications, and updates
        </p>
      </div>

      <div className="mt-4">
        {activity.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-2">
              <ClockIcon className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              No recent activity recorded
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    item.level === 'ERROR'
                      ? 'bg-rose-500'
                      : item.level === 'WARN'
                      ? 'bg-amber-500'
                      : 'bg-zinc-400 dark:bg-zinc-600'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-[11px]">
                      {item.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {item.details && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {item.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
