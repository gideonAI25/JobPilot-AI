'use client';

import React, { useState } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { MobileNav } from './MobileNav';
import {
  CandidateProfileHeaderSummary,
  DashboardStats,
  NotificationItem,
} from '@/services/server/dashboardService';

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  profile?: CandidateProfileHeaderSummary;
  stats?: DashboardStats;
  notifications?: {
    unreadCount: number;
    items: NotificationItem[];
  };
  children: React.ReactNode;
}

export function DashboardShell({
  title,
  subtitle,
  profile,
  stats,
  notifications,
  children,
}: DashboardShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex font-sans">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block">
        <DashboardSidebar profile={profile} stats={stats} />
      </div>

      {/* Mobile Slide-Over Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        profile={profile}
        stats={stats}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          profile={profile}
          notifications={notifications}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
