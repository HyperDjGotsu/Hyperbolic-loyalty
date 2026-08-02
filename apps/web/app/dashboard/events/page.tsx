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
    <div className="flex-1 overflow-auto p-4">
      <div className="animate-pulse">
        <div className="h-8 bg-elevated rounded w-48 mb-4"></div>
        <div className="h-10 bg-elevated rounded mb-4"></div>
        <div className="space-y-4">
          <div className="h-24 bg-elevated rounded-xl"></div>
          <div className="h-24 bg-elevated rounded-xl"></div>
          <div className="h-24 bg-elevated rounded-xl"></div>
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
  // No wrapper div - let the component control its own layout
  return isDesktop ? <DesktopEvents /> : <MobileEvents />;
}
