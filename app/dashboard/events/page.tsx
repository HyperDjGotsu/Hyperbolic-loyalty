'use client';

import dynamic from 'next/dynamic';

// Dynamic imports - only loads the version needed
const MobileEvents = dynamic(() => import('./MobileEvents'), {
  loading: () => <EventsLoadingSkeleton />,
});

const DesktopEvents = dynamic(() => import('./DesktopEvents'), {
  loading: () => <EventsLoadingSkeleton />,
});

// Simple loading skeleton
function EventsLoadingSkeleton() {
  return (
    <div className="flex-1 p-4">
      <div className="animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-48 mb-4"></div>
        <div className="h-10 bg-slate-800 rounded mb-4"></div>
        <div className="space-y-4">
          <div className="h-24 bg-slate-800 rounded-xl"></div>
          <div className="h-24 bg-slate-800 rounded-xl"></div>
          <div className="h-24 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <>
      {/* Mobile version - hidden on lg (1024px+) screens */}
      <div className="lg:hidden h-full">
        <MobileEvents />
      </div>
      
      {/* Desktop version - hidden below lg screens */}
      <div className="hidden lg:block h-full">
        <DesktopEvents />
      </div>
    </>
  );
}
