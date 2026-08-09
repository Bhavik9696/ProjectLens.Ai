import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

// Mirrors the shape of the app shell (navbar + dashboard cards) so the
// loading state doesn't jump/reflow once real data arrives.
export const AppShellSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[var(--bg)]">
    <div className="border-b border-[var(--border)] px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Skeleton className="w-40 h-8 rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-64 h-9 rounded-lg hidden sm:block" />
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-28 h-9 rounded-lg" />
        </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  </div>
);

export const RowSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full rounded-lg" />
    ))}
  </div>
);
