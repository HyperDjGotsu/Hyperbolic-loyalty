'use client';

import { useEffect } from 'react';

// A website saved to the iPhone Home Screen is frozen when you leave and comes back exactly as it was, with no reload
// and no pull-to-refresh, so it can keep showing an old version of the app. Coming back after a few minutes away
// reloads it, so people always see current data and the latest release. Skipped while someone is typing in a field.
const AWAY_MS = 5 * 60_000;

export default function ResumeRefresh() {
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) {
        const el = document.activeElement;
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
        if (!typing) window.location.reload();
      }
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return null;
}
