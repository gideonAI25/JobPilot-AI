import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50/60 dark:bg-zinc-950 flex font-sans">
      {/* Sidebar skeleton placeholder */}
      <div className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hidden md:block p-4 space-y-4">
        <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="space-y-2 pt-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-7 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between">
          <div className="w-32 h-5 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-28 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
