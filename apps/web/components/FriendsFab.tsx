'use client';

import { useEffect, useState } from 'react';
import { Users, X } from 'lucide-react';
import { FriendsMini } from '@/components/FriendsMini';

// Floating button on every player page: tap to pull up what friends are doing, and who they are.
export default function FriendsFab() {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<any[] | null>(null);

  // Fresh activity each time the sheet opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/friends-activity', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { activity: [] }))
      .then(d => { if (!cancelled) setActivity(d.activity || []); })
      .catch(() => { if (!cancelled) setActivity([]); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Friends"
        className="pp-press fixed right-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-accent text-white shadow-[0_10px_30px_rgba(0,0,0,0.4)] bottom-[calc(96px+env(safe-area-inset-bottom,0px))] lg:bottom-6 lg:right-6"
      >
        <Users size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Friends">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[75vh] min-h-[320px] flex-col rounded-t-3xl border border-border-token bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-2xl lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[380px] lg:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Friends</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-secondary hover:text-primary">
                <X size={18} />
              </button>
            </div>
            {activity === null ? (
              <div className="grid flex-1 place-items-center text-sm text-tertiary">Loading…</div>
            ) : (
              <FriendsMini activity={activity} limit={6} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
