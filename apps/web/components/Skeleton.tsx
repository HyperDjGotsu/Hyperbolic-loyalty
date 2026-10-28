import React from 'react';

// Placeholder block. Pages draw their shape out of these while data loads.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-elevated ${className}`} aria-hidden="true" />;
}

// Same shape as the redesigned mobile Home: title, hero card, a rail of tiles.
export function HomeSkeleton() {
  return (
    <div className="px-4 pt-5 pb-4" role="status" aria-label="Loading">
      <Skeleton className="h-11 w-36 rounded-xl" />
      <Skeleton className="mt-3 h-8 w-52 rounded-full" />
      <div className="mt-5 rounded-[30px] border border-border-token bg-surface p-5">
        <div className="flex items-center gap-5">
          <Skeleton className="h-28 w-28 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-8 w-28 rounded" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Skeleton className="h-[50px] rounded-2xl" />
          <Skeleton className="h-[50px] rounded-2xl" />
        </div>
      </div>
      <Skeleton className="mt-8 h-7 w-28 rounded" />
      <div className="mt-3 flex gap-3 overflow-hidden">
        <Skeleton className="h-28 w-[250px] flex-none rounded-[26px]" />
        <Skeleton className="h-28 w-[250px] flex-none rounded-[26px]" />
      </div>
    </div>
  );
}

// Same shape as the mobile Profile: avatar, name, three stats, then list cards.
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-base px-4 pt-8 pb-28" role="status" aria-label="Loading">
      <div className="flex flex-col items-center">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-4 h-7 w-48 rounded" />
        <Skeleton className="mt-2 h-4 w-32 rounded" />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  );
}
