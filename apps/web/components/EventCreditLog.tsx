'use client';

import { useEffect, useState } from 'react';
import { pacificMonthKey } from '@/lib/event-credit';

interface Row { id: string; redeemedAt: string; amountCents: number; name: string; playerId: string; eventName: string | null; confirmedAt?: string | null; confirmedBy?: string | null }

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Read-only record of the Diamond Event Credits used at this store, so staff can match them to the discounts rung up in Square
export default function EventCreditLog({ storeId }: { storeId: string | null }) {
  const currentKey = pacificMonthKey();
  const [month, setMonth] = useState(currentKey);
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [totalCents, setTotalCents] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');


  // Credits waiting for staff arrive while this is open, so refresh quietly every 15 seconds
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  async function act(id: string, action: 'confirm' | 'decline') {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch('/api/hq/event-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok && res.status !== 409) throw new Error();
      setTick(n => n + 1);
    } catch {
      setActionError('That did not go through. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    fetch(`/api/hq/event-credits?storeId=${encodeURIComponent(storeId)}&month=${month}`)
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (cancelled) return; setRows(d.redemptions || []); setPending(d.pending || []); setTotalCents(d.totalCents || 0); setState('ready'); })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [storeId, month, tick]);

  const waiting = pending.length > 0 && (
    <div className="bg-surface rounded-xl border border-accent/40 overflow-hidden">
      <div className="px-5 py-3 border-b border-border-token">
        <p className="text-sm font-semibold text-primary">Event Credits waiting · {pending.length}</p>
        <p className="text-xs text-tertiary">Take $15 off in Square, then tap Confirm. Decline gives the player their credit back.</p>
        {actionError && <p className="text-xs text-red-400 mt-1">{actionError}</p>}
      </div>
      <div className="divide-y divide-border-token">
        {pending.map(r => (
          <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary truncate">{r.name}{r.eventName ? ` · ${r.eventName}` : ''}</p>
              <p className="text-xs text-tertiary">{r.playerId} · {new Date(r.redeemedAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" disabled={busyId === r.id} onClick={() => void act(r.id, 'decline')} className="pp-press px-3 py-2 rounded-lg border border-border-token text-secondary text-sm font-semibold disabled:opacity-50">Decline</button>
              <button type="button" disabled={busyId === r.id} onClick={() => void act(r.id, 'confirm')} className="pp-press px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-bold disabled:opacity-50">Confirm</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
    {waiting}
    <div className="bg-surface rounded-xl border border-border-token overflow-hidden">
      <div className="px-5 py-3 border-b border-border-token flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Event Credits confirmed</p>
          <p className="text-xs text-tertiary">Diamond members&apos; $15 monthly credit. Each shows a ticket on the player&apos;s phone.</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" aria-label="Previous month" onClick={() => { setState('loading'); setMonth(shiftMonth(month, -1)); }} className="pp-press h-8 w-8 rounded-lg bg-elevated text-primary">‹</button>
          <span className="min-w-[110px] text-center text-xs font-semibold text-primary">{monthLabel(month)}</span>
          <button type="button" aria-label="Next month" disabled={month >= currentKey} onClick={() => { setState('loading'); setMonth(shiftMonth(month, 1)); }} className="pp-press h-8 w-8 rounded-lg bg-elevated text-primary disabled:opacity-40">›</button>
        </div>
      </div>
      {state === 'loading' ? (
        <div className="px-5 py-8 text-center text-tertiary text-sm">Loading…</div>
      ) : state === 'error' ? (
        <div className="px-5 py-8 text-center text-tertiary text-sm">Could not load Event Credits. Try again in a moment.</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-tertiary text-sm">No Event Credits used in {monthLabel(month)}</div>
      ) : (
        <>
          <div className="px-5 py-2.5 bg-elevated/50 text-xs text-secondary border-b border-border-token">
            {rows.length} used · {money(totalCents)} in discounts
          </div>
          <div className="divide-y divide-border-token">
            {rows.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{r.name}</p>
                  <p className="text-xs text-tertiary">{r.playerId} · {new Date(r.confirmedAt ?? r.redeemedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}{r.eventName ? ` · ${r.eventName}` : ''}{r.confirmedBy ? ` · confirmed by ${r.confirmedBy}` : ''}</p>
                </div>
                <span className="text-sm font-semibold text-accent shrink-0">{money(r.amountCents)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </>
  );
}
