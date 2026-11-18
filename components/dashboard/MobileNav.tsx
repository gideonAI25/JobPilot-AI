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
  XIcon,
} from '@/components/icons/Icons';
import { CandidateProfileHeaderSummary, DashboardStats } from '@/services/server/dashboardService';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: CandidateProfileHeaderSummary;
  stats?: DashboardStats;
}

export function MobileNav({ isOpen, onClose, profile, stats }: MobileNavProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  const navItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboardIcon },
    {
      name: 'Find Jobs',
      href: '/jobs',
      icon: SearchIcon,
      badge: stats?.totalJobsDiscovered || undefined,
    },
    {
      name: 'Applications',
      href: '/applications',
      icon: SendIcon,
      badge: stats?.pendingReviews || undefined,
    },
    {
      name: 'My Profile',
      href: '/profile',
      icon: UserIcon,
      badge: profile?.completionPercentage ? `${profile.completionPercentage}%` : undefined,
    },
    { name: 'Documents', href: '/documents', icon: FileTextIcon },
    { name: 'Automation', href: '/automation', icon: ZapIcon },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-72 max-w-[80vw] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between z-10 shadow-xl">
        <div>
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center">
                JP
              </div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                JobPilot AI
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
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
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center">
              JP
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {profile?.fullName || 'Candidate Profile'}
              </p>
              <p className="text-[10px] text-zinc-500">
                {profile?.completionPercentage || 0}% verified
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
