import React from 'react';
import Link from 'next/link';
import { AutomationTelemetry } from '@/services/server/dashboardService';
import { ZapIcon, ClockIcon, ChevronRightIcon } from '@/components/icons/Icons';

interface AutomationStatusCardProps {
  automation: AutomationTelemetry;
}

export function AutomationStatusCard({ automation }: AutomationStatusCardProps) {
  const lastRun = automation.lastRun;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Automation Telemetry
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Background discovery and evaluation runs
          </p>
        </div>
        <Link
          href="/automation"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
        >
          <span>Logs</span>
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="mt-4">
        {!lastRun ? (
          <div className="py-8 text-center">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center mx-auto mb-2.5">
              <ZapIcon className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              No automation runs yet
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mt-0.5">
              Scheduled background jobs will display duration, discovered opportunities, and error telemetry here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    lastRun.status === 'COMPLETED'
                      ? 'bg-emerald-500'
                      : lastRun.status === 'RUNNING'
                      ? 'bg-indigo-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Latest Run: {lastRun.runType}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                    <ClockIcon className="w-3 h-3" />
                    <span>{new Date(lastRun.startTime).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  lastRun.status === 'COMPLETED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {lastRun.status}
              </span>
            </div>

            {/* Run Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Found
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {lastRun.discoveredJobs}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Evaluated
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {lastRun.evaluatedJobs}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Qualified
                </span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {lastRun.qualifiedJobs}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Prepared
                </span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {lastRun.preparedApplications}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
