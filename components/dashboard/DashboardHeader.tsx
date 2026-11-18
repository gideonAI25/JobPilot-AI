'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  BellIcon,
  MenuIcon,
  UserIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
} from '@/components/icons/Icons';
import {
  CandidateProfileHeaderSummary,
  NotificationItem,
} from '@/services/server/dashboardService';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  profile?: CandidateProfileHeaderSummary;
  notifications?: {
    unreadCount: number;
    items: NotificationItem[];
  };
  onOpenMobileNav?: () => void;
}

export function DashboardHeader({
  title,
  subtitle,
  profile,
  notifications,
  onOpenMobileNav,
}: DashboardHeaderProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'JP';

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Mobile Hamburger */}
      <div className="flex items-center gap-3">
        {onOpenMobileNav && (
          <button
            onClick={onOpenMobileNav}
            className="p-2 -ml-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 md:hidden rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Open navigation menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        )}

        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Action Area: Notifications & User Menu */}
      <div className="flex items-center gap-2">
        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors relative"
            title="Notifications"
          >
            <BellIcon className="w-4 h-4" />
            {Boolean(notifications?.unreadCount && notifications.unreadCount > 0) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-3 z-40 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Notifications
                </span>
                <span className="text-[10px] text-zinc-500">
                  {notifications?.unreadCount || 0} pending
                </span>
              </div>

              {!notifications?.items || notifications.items.length === 0 ? (
                <div className="py-6 text-center text-zinc-500">
                  <p className="font-medium text-zinc-600 dark:text-zinc-400">No new alerts</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Job matches and application updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">
                          {item.notificationType.replace(/_/g, ' ')}
                        </span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-zinc-800 dark:text-zinc-200 mt-1 font-medium leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User / Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center">
              {initials}
            </div>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 hidden sm:inline-block max-w-[120px] truncate">
              {profile?.fullName || 'Candidate'}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-3 z-40 text-xs">
              <div className="pb-2.5 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {profile?.fullName || 'Candidate Profile'}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {profile?.email || 'No email configured'}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">
                    Profile Strength
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {profile?.completionPercentage || 0}%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Link
                  href="/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Edit Candidate Profile</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  <SparklesIcon className="w-3.5 h-3.5 text-zinc-500" />
                  <span>System Settings</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
