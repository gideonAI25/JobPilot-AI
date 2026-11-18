import { prisma } from '@/lib/prisma';
import { getDashboardOverviewData } from '@/services/server/dashboardService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { CheckCircleIcon, AlertCircleIcon, SettingsIcon } from '@/components/icons/Icons';
import Link from 'next/link';

export const instant = false;

export default async function SettingsPage() {
  const data = await getDashboardOverviewData();

  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  const isTelegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());

  return (
    <DashboardShell
      title="Settings"
      subtitle="System status, database health, and integration configuration"
      profile={data.profile}
      stats={data.stats}
      notifications={data.notifications}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Section 1: System & Database Health */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Database & Persistence Status
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            SQLite database connection and Prisma ORM configuration
          </p>

          <div className="space-y-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Database Engine
                </span>
                <p className="text-[11px] text-zinc-500">Local embedded SQLite (dev.db)</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircleIcon className="w-3 h-3" />
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Prisma ORM Client
                </span>
                <p className="text-[11px] text-zinc-500">v6.19.3 — Server-only singleton</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircleIcon className="w-3 h-3" />
                Active
              </span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Candidate Profile
                </span>
                <p className="text-[11px] text-zinc-500">
                  {data.profile.fullName} ({data.profile.completionPercentage}% verified)
                </p>
              </div>
              <Link
                href="/profile"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Section 2: Integration Status */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            API & External Services
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Configuration status for AI evaluation and Telegram alerts
          </p>

          <div className="space-y-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Google Gemini API
                </span>
                <p className="text-[11px] text-zinc-500">
                  Environment variable: GEMINI_API_KEY
                </p>
              </div>
              {isGeminiConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircleIcon className="w-3 h-3" />
                  Key Present
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Not configured yet (.env)
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Telegram Bot API
                </span>
                <p className="text-[11px] text-zinc-500">
                  Environment variable: TELEGRAM_BOT_TOKEN
                </p>
              </div>
              {isTelegramConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircleIcon className="w-3 h-3" />
                  Token Present
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Not configured yet (.env)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
