'use client';

import { useEffect, useState } from 'react';
import { Users, X } from 'lucide-react';
import { FriendsMini } from '@/components/FriendsMini';

// Floating button on every player page: tap to pull up what friends are doing, and who they are.
export default function FriendsFab() {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<any[] | null>(null);
  const [shares, setShares] = useState<Array<{ id: string; kind: string; amount: number | null; label: string | null; seen: boolean; from: { name: string } }>>([]);
  const [unseen, setUnseen] = useState(0);

  // Dot on the button when a friend has shared something new
  useEffect(() => {
    fetch('/api/friend-shares', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setShares(d.shares || []); setUnseen(d.unseen || 0); } })
      .catch(() => {});
  }, []);

  // Fresh activity each time the sheet opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/friends-activity', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { activity: [] }))
      .then(d => { if (!cancelled) setActivity(d.activity || []); })
      .catch(() => { if (!cancelled) setActivity([]); });
    // Opening the sheet counts as seeing them; the cards stay in the list for this visit
    if (unseen > 0) {
      fetch('/api/friend-shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seen' }) })
        .then(() => setUnseen(0))
        .catch(() => {});
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {unseen > 0 && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-base bg-danger" />}
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
            {shares.length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-tertiary">From friends</div>
                {shares.slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2 text-sm">
                    <span>{s.kind === 'gacha' ? '🎰' : '🎉'}</span>
                    <span className="min-w-0 flex-1 truncate text-primary">
                      <b>{s.from.name}</b> earned <b className="text-accent">+{s.amount}</b> from {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
