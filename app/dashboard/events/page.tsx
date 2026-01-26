'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports - only loads the version needed
const MobileEvents = dynamic(() => import('./MobileEvents'), {
  loading: () => <EventsLoadingSkeleton />,
  ssr: false,
});

const DesktopEvents = dynamic(() => import('./DesktopEvents'), {
  loading: () => <EventsLoadingSkeleton />,
  ssr: false,
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
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    // Initial check
    checkScreenSize();
    
    // Listen for resize
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Show loading while detecting screen size
  if (isDesktop === null) {
    return <EventsLoadingSkeleton />;
  }

  // Only render ONE component based on screen size
  return isDesktop ? <DesktopEvents /> : <MobileEvents />;
}
