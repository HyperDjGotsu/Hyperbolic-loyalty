'use client';

import { useEffect, useState } from 'react';

// Small line showing which release this page is and when it was loaded. If the Home Screen app is reopened after a
// few minutes away, the loaded time changes by itself: that is how to see it is picking up new releases.
export default function VersionStamp() {
  const [loaded, setLoaded] = useState('');
  useEffect(() => {
    setLoaded(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
  }, []);
  return (
    <p className="text-center text-tertiary text-[11px] mt-4">
      Version {process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'} · loaded {loaded}
    </p>
  );
}
