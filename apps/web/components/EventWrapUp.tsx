'use client';

import { useCallback, useEffect, useState } from 'react';

interface Attendee {
  id: string;
  name: string;
  playerCode: string;
  multiplier: number;
  result: { roundsWon: number; undefeated: boolean; tiles: string[]; placement: number | null; xp: number; prizePoints: number } | null;
}
interface WrapUpData {
  event: { id: string; name: string; status: string };
  attendees: Attendee[];
  tiles: { label: string; xp: number }[];
  winXp: number;
  winPrizePoints: number;
  undefeatedXp: number;
  maxWins: number;
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// After an event ends: everyone who checked in, one row each. Tap a row to enter their results with the same
// buttons as the Players page, plus the placement from the tournament software.
export function EventWrapUp({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [data, setData] = useState<WrapUpData | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hq/events/${eventId}/results`, { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Could not load this event'); return; }
      setData(d);
    } catch { setError('Could not load this event'); }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  const saved = data?.attendees.filter(a => a.result).length ?? 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Event wrap-up">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl border border-border-token bg-surface sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border-token p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-primary">Wrap up: {data?.event.name ?? 'Event'}</h2>
            <p className="text-xs text-secondary">
              The event is closed. Tap a player to give them their results.
              {data && ` ${saved} of ${data.attendees.length} done.`}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-secondary hover:bg-elevated">Close</button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          {!data && !error && <p className="py-8 text-center text-sm text-tertiary">Loading players…</p>}
          {data && data.attendees.length === 0 && <p className="py-8 text-center text-sm text-tertiary">Nobody checked in to this event.</p>}
          {data?.attendees.map(a => (
            <div key={a.id} className="rounded-xl border border-border-token bg-elevated">
              <button type="button" onClick={() => setOpenId(openId === a.id ? null : a.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-primary">{a.name}</div>
                  <div className="text-xs text-tertiary">{a.playerCode}</div>
                </div>
                {a.result ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    +{a.result.xp} XP · +{a.result.prizePoints} PP{a.result.placement ? ` · ${ordinal(a.result.placement)}` : ''}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-tertiary">Not done</span>
                )}
              </button>
              {openId === a.id && data && (
                <PlayerEditor
                  eventId={eventId}
                  attendee={a}
                  config={data}
                  onSaved={() => { setOpenId(null); load(); }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerEditor({ eventId, attendee, config, onSaved }: { eventId: string; attendee: Attendee; config: WrapUpData; onSaved: () => void }) {
  const prev = attendee.result;
  const [wins, setWins] = useState(prev?.roundsWon ?? 0);
  const [undefeated, setUndefeated] = useState(prev?.undefeated ?? false);
  const [tiles, setTiles] = useState<string[]>(prev?.tiles ?? []);
  const [placement, setPlacement] = useState<number | null>(prev?.placement ?? null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const xp = wins * config.winXp + (undefeated ? config.undefeatedXp : 0) + tiles.reduce((s, t) => s + (config.tiles.find(x => x.label === t)?.xp ?? 0), 0);
  const pp = Math.round(wins * config.winPrizePoints * attendee.multiplier);
  const editing = !!prev;

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/hq/events/${eventId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: attendee.id, roundsWon: wins, undefeated, tiles, placement, pin: editing ? pin : undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || 'Could not save'); return; }
      onSaved();
    } catch { setErr('Could not save'); } finally { setBusy(false); }
  };

  const chip = (on: boolean) => `rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${on ? 'border-accent bg-accent/15 text-primary' : 'border-border-token bg-surface text-secondary hover:border-accent'}`;

  return (
    <div className="space-y-4 border-t border-border-token p-3">
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-green-400">Match wins</div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border-2 border-border-token bg-surface px-3 py-2">
            <button type="button" onClick={() => setWins(w => Math.max(0, w - 1))} disabled={wins === 0} className="h-8 w-8 rounded-lg bg-green-500/10 text-lg font-bold text-green-400 disabled:opacity-30">−</button>
            <div className="w-12 text-center"><div className="text-lg font-bold leading-none text-primary">{wins}</div><div className="text-[10px] text-green-400">{wins === 1 ? 'win' : 'wins'}</div></div>
            <button type="button" onClick={() => setWins(w => Math.min(config.maxWins, w + 1))} className="h-8 rounded-lg border border-green-500/40 bg-green-500/20 px-3 text-sm font-bold text-green-400">+ Win</button>
          </div>
          <button type="button" onClick={() => setUndefeated(u => !u)} className={chip(undefeated)}>Undefeated <span className="text-xs text-green-400">+{config.undefeatedXp} XP</span></button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-orange-400">Community</div>
        <div className="flex flex-wrap gap-2">
          {config.tiles.map(t => (
            <button key={t.label} type="button" onClick={() => setTiles(prev => (prev.includes(t.label) ? prev.filter(x => x !== t.label) : [...prev, t.label]))} className={chip(tiles.includes(t.label))}>
              {t.label} <span className="text-xs text-orange-400">+{t.xp} XP</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-secondary">Outcome (from the tournament software)</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Place, like 1 or 4 (leave empty for none)"
          value={placement ?? ''}
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
            setPlacement(digits ? Math.min(64, Number(digits)) || null : null);
          }}
          className="w-full rounded-lg border border-border-token bg-surface px-3 py-2.5 text-sm text-primary"
        />
      </div>

      <div className="rounded-lg bg-surface px-3 py-2 text-sm text-secondary">
        {editing ? 'New total' : 'Will award'}: <b className="text-accent">+{xp} XP</b> · <b className="text-accent">+{pp} Prize Points</b>
        {editing && prev && (xp !== prev.xp || pp !== prev.prizePoints) && (
          <span className="block text-xs text-tertiary">Currently saved: +{prev.xp} XP · +{prev.prizePoints} PP. Only the difference is added or taken back.</span>
        )}
      </div>

      {editing && (
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-secondary">Your staff PIN, to change a saved result</label>
          <input
            inputMode="numeric" type="password" autoComplete="off" maxLength={6} value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-border-token bg-surface px-3 py-2.5 text-center text-lg tracking-[0.4em] text-primary"
          />
        </div>
      )}

      {err && <p className="text-sm text-danger">{err}</p>}
      <button
        type="button" onClick={save} disabled={busy || (editing && pin.length < 4)}
        className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Saving…' : editing ? 'Save change' : 'Save and award'}
      </button>
    </div>
  );
}

// Recently ended events at this store, so a wrap-up can be finished or checked after the pop-up is closed
export function RecentWrapUps({ storeId, refreshKey, onOpen }: { storeId: string | null; refreshKey: number; onOpen: (id: string) => void }) {
  const [events, setEvents] = useState<Array<{ id: string; name: string; scheduledAt: string; checkedIn: number; saved: number }>>([]);

  useEffect(() => {
    if (!storeId) { setEvents([]); return; }
    let cancelled = false;
    fetch(`/api/hq/events/wrapups?store_id=${encodeURIComponent(storeId)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { events: [] }))
      .then(d => { if (!cancelled) setEvents(d.events || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeId, refreshKey]);

  if (events.length === 0) return null;
  return (
    <div className="rounded-xl border border-border-token bg-surface p-6">
      <h2 className="mb-1 text-lg font-bold">Wrap up recent events</h2>
      <p className="mb-3 text-xs text-tertiary">Give players their results after the event. Open any ended event from the last 3 days.</p>
      <div className="space-y-2">
        {events.map(e => (
          <button key={e.id} type="button" onClick={() => onOpen(e.id)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-elevated px-3 py-3 text-left hover:bg-elevated/70">
            <span className="min-w-0 truncate text-sm font-semibold text-primary">{e.name}</span>
            <span className={`shrink-0 text-xs font-semibold ${e.saved >= e.checkedIn ? 'text-emerald-400' : 'text-accent'}`}>{e.saved} of {e.checkedIn} done</span>
          </button>
        ))}
      </div>
    </div>
  );
}
