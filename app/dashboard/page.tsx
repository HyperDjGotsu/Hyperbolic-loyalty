'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports - only loads the version needed
const MobileDashboard = dynamic(() => import('./MobileDashboard'), {
  loading: () => <DashboardLoadingSkeleton />,
  ssr: false,
});

const DesktopDashboard = dynamic(() => import('./DesktopDashboard'), {
  loading: () => <DashboardLoadingSkeleton />,
  ssr: false,
});

// Loading skeleton
function DashboardLoadingSkeleton() {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="text-center mb-6">
          <div className="h-8 bg-elevated rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-elevated rounded w-32 mx-auto"></div>
        </div>
        
        {/* Profile card skeleton */}
        <div className="h-40 bg-elevated rounded-2xl mb-4"></div>
        
        {/* Action buttons skeleton */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 h-14 bg-elevated rounded-xl"></div>
          <div className="flex-1 h-14 bg-elevated rounded-xl"></div>
        </div>
        
        {/* Banner skeleton */}
        <div className="h-32 bg-elevated rounded-2xl mb-4"></div>
        
        {/* Games section skeleton */}
        <div className="h-6 bg-elevated rounded w-32 mb-3"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-elevated rounded-xl"></div>
          <div className="h-24 bg-elevated rounded-xl"></div>
          <div className="h-24 bg-elevated rounded-xl"></div>
          <div className="h-24 bg-elevated rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
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
    return <DashboardLoadingSkeleton />;
  }

  // Only render ONE component based on screen size
  return isDesktop ? <DesktopDashboard /> : <MobileDashboard />;
}
