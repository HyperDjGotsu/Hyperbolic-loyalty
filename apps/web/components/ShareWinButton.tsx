'use client';

import { useState } from 'react';
import { Share2, X } from 'lucide-react';
import { Avatar } from '@/components/ui';

// `id` is the public player code (HYP-…); `odid` is the internal id the server needs
type Friend = { id: string; odid: string; name: string; avatar: any };

// Share one of your own wins (a row from your activity) with a friend. No text, no points move:
// the friend just sees a card saying what you earned.
export default function ShareWinButton({ ledgerId, className = '' }: { ledgerId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const openSheet = () => {
    setOpen(true);
    setStatus('');
    if (friends === null) {
      fetch('/api/community/friends')
        .then(r => (r.ok ? r.json() : { friends: [] }))
        .then(d => setFriends(d.friends || []))
        .catch(() => setFriends([]));
    }
  };

  const send = async (f: Friend) => {
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch('/api/friend-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ledger_id: ledgerId, friend_id: f.odid }),
      });
      const d = await res.json().catch(() => ({}));
      setStatus(res.ok ? `Sent to ${f.name}` : d.error || 'Could not share');
    } catch { setStatus('Could not share'); } finally { setBusy(false); }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openSheet(); }}
        aria-label="Share with a friend"
        className={`pp-press grid h-8 w-8 shrink-0 place-items-center rounded-full text-tertiary hover:text-accent ${className}`}
      >
        <Share2 size={15} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label="Share with a friend" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[70vh] flex-col rounded-t-3xl border border-border-token bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-2xl lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:bottom-auto lg:w-[380px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Share with a friend</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-secondary hover:text-primary"><X size={18} /></button>
            </div>
            {friends === null ? (
              <div className="py-8 text-center text-sm text-tertiary">Loading…</div>
            ) : friends.length === 0 ? (
              <div className="py-8 text-center text-sm text-tertiary">No friends yet. Find players in Community.</div>
            ) : (
              <ul className="flex-1 space-y-1 overflow-y-auto">
                {friends.map(f => (
                  <li key={f.odid}>
                    <button type="button" disabled={busy} onClick={() => send(f)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-elevated disabled:opacity-50">
                      <div className="shrink-0 scale-75 origin-left -mr-2.5"><Avatar avatar={f.avatar} size="sm" /></div>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">{f.name}</span>
                      <span className="text-xs font-semibold text-accent">Send</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {status && <p className="mt-3 text-center text-sm font-semibold text-secondary" aria-live="polite">{status}</p>}
          </div>
        </div>
      )}
    </>
  );
}
