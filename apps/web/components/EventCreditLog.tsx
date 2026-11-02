'use client';

import { useEffect, useState } from 'react';
import { pacificMonthKey } from '@/lib/event-credit';

interface Row { id: string; redeemedAt: string; amountCents: number; name: string; playerId: string }

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
  const [totalCents, setTotalCents] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setState('loading');
    fetch(`/api/hq/event-credits?storeId=${encodeURIComponent(storeId)}&month=${month}`)
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (cancelled) return; setRows(d.redemptions || []); setTotalCents(d.totalCents || 0); setState('ready'); })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [storeId, month]);

  return (
    <div className="bg-surface rounded-xl border border-border-token overflow-hidden">
      <div className="px-5 py-3 border-b border-border-token flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Event Credits used</p>
          <p className="text-xs text-tertiary">Diamond members&apos; $15 monthly credit. Each shows a ticket on the player&apos;s phone.</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} className="pp-press h-8 w-8 rounded-lg bg-elevated text-primary">‹</button>
          <span className="min-w-[110px] text-center text-xs font-semibold text-primary">{monthLabel(month)}</span>
          <button type="button" aria-label="Next month" disabled={month >= currentKey} onClick={() => setMonth(shiftMonth(month, 1))} className="pp-press h-8 w-8 rounded-lg bg-elevated text-primary disabled:opacity-40">›</button>
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
                  <p className="text-xs text-tertiary">{r.playerId} · {new Date(r.redeemedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <span className="text-sm font-semibold text-accent shrink-0">{money(r.amountCents)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
