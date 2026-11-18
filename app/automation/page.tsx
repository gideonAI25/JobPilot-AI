import { prisma } from '@/lib/prisma';
import { getDashboardOverviewData } from '@/services/server/dashboardService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ZapIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from '@/components/icons/Icons';

export const instant = false;

export default async function AutomationPage() {
  const [data, runs, activityLogs] = await Promise.all([
    getDashboardOverviewData(),
    prisma.automationRun.findMany({
      orderBy: { startTime: 'desc' },
      take: 10,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ]);

  return (
    <DashboardShell
      title="Automation"
      subtitle="Background ingestion schedules, pipeline runs, and operational telemetry"
      profile={data.profile}
      stats={data.stats}
      notifications={data.notifications}
    >
      <div className="space-y-8">
        {/* Runs History */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Automation Runs ({runs.length})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Independent execution runs tracking discovered jobs, evaluations, and errors
              </p>
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 text-center">
              <ZapIcon className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No automation runs recorded
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm mx-auto">
                Background discovery schedules and evaluation jobs will output run telemetry here.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Trigger</th>
                      <th className="px-4 py-3">Started</th>
                      <th className="px-4 py-3">Discovered</th>
                      <th className="px-4 py-3">Evaluated</th>
                      <th className="px-4 py-3">Qualified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                    {runs.map((run) => (
                      <tr key={run.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {run.runType}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              run.status === 'COMPLETED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{run.trigger}</td>
                        <td className="px-4 py-3 text-zinc-500">
                          {new Date(run.startTime).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-bold">
                          {run.discoveredJobs}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-bold">
                          {run.evaluatedJobs}
                        </td>
                        <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-bold">
                          {run.qualifiedJobs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Audit Activity Log */}
        <div>
          <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Audit Activity Log ({activityLogs.length})
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              System events and audit traces across all JobPilot operations
            </p>
          </div>

          {activityLogs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <ClockIcon className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No activity logs recorded
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {activityLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        log.level === 'ERROR'
                          ? 'bg-rose-100 text-rose-700'
                          : log.level === 'WARN'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {log.action}
                    </span>
                    {log.details && (
                      <span className="text-zinc-400 text-[11px] truncate hidden sm:inline">
                        — {log.details}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono shrink-0 ml-4">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
