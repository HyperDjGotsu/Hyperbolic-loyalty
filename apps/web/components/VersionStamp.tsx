'use client';

import { useEffect, useState } from 'react';

// Small line showing which release this page is and when it was loaded. If the Home Screen app is reopened after a
// few minutes away, the loaded time changes by itself: that is how to see it is picking up new releases.
// The second line (worker version and last notification tap) is a temporary aid for fixing notification links.
export default function VersionStamp() {
  const [loaded, setLoaded] = useState('');
  const [worker, setWorker] = useState('checking');
  const [tap, setTap] = useState('none');

  useEffect(() => {
    setLoaded(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }));

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'pp-version') setWorker(String(e.data.v));
    };
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', onMessage);
        navigator.serviceWorker.getRegistration().then((reg) => {
          const w = reg?.active;
          if (w) w.postMessage({ type: 'pp-version' });
          else setWorker('no worker');
        }).catch(() => setWorker('error'));
      } else setWorker('unsupported');
      if ('caches' in window) {
        caches.open('pp-nav').then((c) => c.match('/pp-last-tap')).then(async (r) => {
          if (!r) return;
          const t = await r.json();
          setTap(`${new Date(t.at).toLocaleTimeString()} to ${t.url} (${t.windows} window${t.windows === 1 ? '' : 's'}, worker ${t.v})`);
        }).catch(() => {});
      }
    } catch { /* diagnostics only */ }
    return () => { try { navigator.serviceWorker?.removeEventListener('message', onMessage); } catch { /* ignore */ } };
  }, []);

  return (
    <div className="text-center text-tertiary text-[11px] mt-4 space-y-0.5">
      <p>Version {process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'} · loaded {loaded}</p>
      <p>Notification worker {worker} · last banner tap {tap}</p>
    </div>
  );
}
