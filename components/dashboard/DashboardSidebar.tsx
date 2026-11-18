'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  SearchIcon,
  SendIcon,
  UserIcon,
  FileTextIcon,
  ZapIcon,
  SettingsIcon,
  CheckCircleIcon,
} from '@/components/icons/Icons';
import { CandidateProfileHeaderSummary, DashboardStats } from '@/services/server/dashboardService';

interface DashboardSidebarProps {
  profile?: CandidateProfileHeaderSummary;
  stats?: DashboardStats;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'neutral' | 'info' | 'warning';
}

export function DashboardSidebar({ profile, stats }: DashboardSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      name: 'Overview',
      href: '/',
      icon: LayoutDashboardIcon,
    },
    {
      name: 'Find Jobs',
      href: '/jobs',
      icon: SearchIcon,
      badge: stats?.totalJobsDiscovered ? stats.totalJobsDiscovered : undefined,
    },
    {
      name: 'Applications',
      href: '/applications',
      icon: SendIcon,
      badge: stats?.pendingReviews ? stats.pendingReviews : undefined,
      badgeVariant: stats?.pendingReviews ? 'warning' : 'neutral',
    },
    {
      name: 'My Profile',
      href: '/profile',
      icon: UserIcon,
      badge: profile?.completionPercentage ? `${profile.completionPercentage}%` : undefined,
      badgeVariant: profile?.isFullyComplete ? 'neutral' : 'info',
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: FileTextIcon,
    },
    {
      name: 'Automation',
      href: '/automation',
      icon: ZapIcon,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: SettingsIcon,
    },
  ];

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'JP';

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm flex items-center justify-center tracking-wider">
            JP
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              JobPilot AI
            </h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
              Assistant & Evaluator
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.badgeVariant === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : item.badgeVariant === 'info'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User / Profile Footer */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {profile?.fullName || 'Verified Profile'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${profile?.completionPercentage || 0}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">
                {profile?.completionPercentage || 0}%
              </span>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
