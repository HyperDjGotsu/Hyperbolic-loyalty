'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

// Kiosk panel for the printed check-in QR: the waiting list, "Approve selected", reopen, manager reconciliation, and the print button.
// Nothing here awards anything. The panel only sends ids staff ticked; the SERVER checks the staff session, the store, the feature flag
// and a short-lived PIN grant, validates each request against its stored record, and runs the existing staff check-in path.
// There is deliberately no "approve everyone" button, and a needs_review request can only be resolved by a manager from the award records.

type Status = 'pending' | 'approving' | 'needs_review' | 'dismissed';

interface Evidence { attendanceRows: number; xpRows: number; pointsRows: number; pointsExpected: boolean; verdict: 'complete' | 'empty' | 'partial' }
interface Req {
  id: string;
  status: Status;
  playerName: string;
  playerId: string;
  requestedAt: string;
  lastError: string | null;
  evidence?: Evidence | null;
}
interface ListData {
  enabled: boolean;
  authorized: boolean;
  pinExpiresAt: number | null;
  canReconcile: boolean;
  counts: { waiting: number; needsReview: number; dismissed: number };
  requests: Req[];
}
interface ActionResult { id: string; playerName: string; result: string; error?: string; verdict?: string }

const BATCH = 10;          // players per server call (the server refuses more)
const TOUCH_EVERY_MS = 60_000;

function esc(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
function timeOf(iso: string | number | null) {
  if (iso === null) return '';
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }); } catch { return ''; }
}

export function CheckinRequestsPanel({
  eventId, eventName, gameName, origin, onCheckInByPlayerId, onChanged,
}: {
  eventId: string;
  eventName: string;
  gameName?: string | null;
  origin: string;
  /** The kiosk's existing staff check-in (used for players whose pass needs the renewal prompt). */
  onCheckInByPlayerId: (playerId: string) => void;
  /** Refresh the kiosk's attendance count after something changed. */
  onChanged: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null); // null = not known yet; false = off for this store (panel stays hidden)
  const [data, setData] = useState<ListData | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; lines: string[] } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinNote, setPinNote] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const stopped = useRef(false);
  const openRef = useRef(false);
  const lastTouch = useRef(0);
  openRef.current = open;

  const base = `/api/events/${eventId}/checkin-requests`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: 'no-store' });
      if (stopped.current) return;
      if (res.status === 404) {
        const d = await res.json().catch(() => ({}));
        if (d?.code === 'feature_disabled') { setEnabled(false); return; }
        setPollError('This event could not be found.');
        return;
      }
      if (res.status === 403) { setPollError('Staff sign-in expired. Reload this page and sign in again.'); return; }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const d = await res.json() as ListData;
      if (stopped.current) return;
      if (d.enabled === false) { setEnabled(false); return; }
      setEnabled(true);
      setData(d);
      setLastOkAt(Date.now());
      setPollError(null);
      // The server is the authority on the unlock. If it says locked while the panel is open, lock the screen too.
      if (!d.authorized && openRef.current) { setOpen(false); setPinNote('Locked after a few minutes without use.'); setPin(''); setPinError(''); setPinOpen(true); }
      const ids = new Set(d.requests.map(r => r.id));
      setSelected(prev => { const next = new Set(Array.from(prev).filter(id => ids.has(id))); return next.size === prev.size ? prev : next; });
    } catch {
      if (!stopped.current) setPollError('Cannot reach the server. The list may be out of date.');
    }
  }, [base]);

  // A different event: start clean.
  useEffect(() => {
    setEnabled(null); setData(null); setPollError(null); setLastOkAt(null);
    setSelected(new Set()); setOpen(false); setNotice(null); setPinOpen(false);
  }, [eventId]);

  // Poll the waiting list (faster while the panel is open). Stops when the feature is off for this store.
  useEffect(() => {
    if (enabled === false) return;
    stopped.current = false;
    void load();
    const t = setInterval(load, open ? 5000 : 10000);
    return () => { stopped.current = true; clearInterval(t); };
  }, [load, open, enabled]);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Touching the screen slides the server's idle window forward (at most once a minute). Polling alone never does.
  const touch = useCallback(() => {
    if (!data?.authorized || Date.now() - lastTouch.current < TOUCH_EVERY_MS) return;
    lastTouch.current = Date.now();
    fetch(`${base}/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extend: true }) })
      .then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => { if (ok && d.expiresAt) setData(prev => prev ? { ...prev, pinExpiresAt: d.expiresAt } : prev); })
      .catch(() => { /* the next poll shows the real state */ });
  }, [base, data?.authorized]);

  if (enabled === false) return null; // not switched on for this store: the kiosk looks exactly as before

  const waiting = (data?.requests ?? []).filter(r => r.status === 'pending' || r.status === 'approving');
  const review = (data?.requests ?? []).filter(r => r.status === 'needs_review');
  const dismissed = (data?.requests ?? []).filter(r => r.status === 'dismissed');
  const badge = (data?.counts.waiting ?? 0) + (data?.counts.needsReview ?? 0);
  const minsLeft = data?.pinExpiresAt ? Math.max(0, Math.ceil((data.pinExpiresAt - tick) / 60000)) : 0;

  const openPanel = () => {
    if (data?.authorized) { setOpen(true); setNotice(null); void load(); return; }
    setPin(''); setPinError(''); setPinNote(''); setPinOpen(true);
  };

  const submitPin = async () => {
    setPinBusy(true); setPinError('');
    try {
      const res = await fetch(`${base}/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setPinOpen(false); setOpen(true); setNotice(null); lastTouch.current = Date.now(); await load(); return; }
      setPinError(d?.needsSetup ? 'No staff PIN is set for this account. Set one in HQ first.' : (d?.error || 'Wrong PIN'));
      setPin('');
    } catch { setPinError('Could not check the PIN. Try again.'); } finally { setPinBusy(false); }
  };

  const lockNow = async () => {
    setOpen(false);
    try { await fetch(`${base}/unlock`, { method: 'DELETE' }); } catch { /* the grant also expires by itself */ }
    void load();
  };

  const toggle = (id: string) => { touch(); setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };

  // Send ids in groups of 10, one group at a time, with progress. Stops (and says so) on a lock or a connection problem.
  const runBatches = async (action: 'approve' | 'dismiss' | 'reopen', ids: string[]) => {
    if (ids.length === 0 || busy) return;
    setBusy(true); setNotice(null); setProgress({ done: 0, total: ids.length });
    const results: ActionResult[] = [];
    let stoppedMsg: string | null = null;
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const chunk = ids.slice(i, i + BATCH);
        let res: Response;
        try {
          res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, request_ids: chunk }) });
        } catch {
          stoppedMsg = `Connection lost after ${i} of ${ids.length}. The last group may have gone through: check the list before trying again.`;
          break;
        }
        const d = await res.json().catch(() => ({})) as { results?: ActionResult[]; error?: string; code?: string };
        if (!res.ok || !d.results) {
          if (d.code === 'pin_required') { setOpen(false); setPin(''); setPinError(''); setPinNote('Enter your PIN to continue.'); setPinOpen(true); }
          stoppedMsg = `${d.error || 'That did not go through.'} ${i} of ${ids.length} done; nothing from the rest was changed.`;
          break;
        }
        results.push(...d.results);
        setProgress({ done: Math.min(i + BATCH, ids.length), total: ids.length });
      }
      const okSet = action === 'approve' ? ['checked_in', 'already_checked_in'] : action === 'dismiss' ? ['dismissed'] : ['reopened', 'already_checked_in'];
      const ok = results.filter(r => okSet.includes(r.result));
      const bad = results.filter(r => !okSet.includes(r.result));
      const lines: string[] = [];
      if (ok.length) lines.push(`${action === 'approve' ? 'Checked in' : action === 'dismiss' ? 'Dismissed' : 'Reopened'}: ${ok.length}`);
      for (const r of bad) {
        const why = r.result === 'renewal_required' ? 'pass expired: use the Renewal button'
          : r.result === 'needs_review' ? 'unclear result: a manager has to review this, do not retry'
          : r.result === 'event_ended' ? 'the event has ended'
          : r.result === 'failed' ? `did not go through (${r.error ?? 'error'}), nothing awarded; try again`
          : `skipped (${r.error ?? r.result})`;
        lines.push(`${r.playerName || 'A request'}: ${why}`);
      }
      if (stoppedMsg) lines.push(stoppedMsg);
      setNotice({ tone: bad.length || stoppedMsg ? 'warn' : 'ok', lines: lines.length ? lines : ['Nothing changed.'] });
      setSelected(new Set());
      onChanged();
    } finally { setBusy(false); setProgress(null); void load(); }
  };

  const reconcile = async (r: Req, resolution: 'confirm_complete' | 'release' | 'recheck') => {
    if (busy) return;
    if (resolution !== 'recheck' && !window.confirm(resolution === 'confirm_complete'
      ? `The records show ${r.playerName} is fully checked in. Mark this request as done?`
      : `The records show nothing was written for ${r.playerName}. Put this request back on the waiting list?`)) return;
    touch();
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reconcile', request_ids: [r.id], resolution }) });
      const d = await res.json().catch(() => ({})) as { error?: string; code?: string; results?: ActionResult[] };
      if (!res.ok) {
        if (d.code === 'pin_required') { setOpen(false); setPin(''); setPinError(''); setPinNote('Enter your PIN to continue.'); setPinOpen(true); }
        setNotice({ tone: 'warn', lines: [d.error || 'That did not go through. Nothing was changed.'] });
      } else {
        const res0 = d.results?.[0]?.result;
        setNotice({ tone: 'ok', lines: [res0 === 'confirmed_complete' ? `${r.playerName}: confirmed as checked in.` : res0 === 'released' ? `${r.playerName}: back on the waiting list.` : res0 === 'rechecked' ? `${r.playerName}: records re-read.` : `${r.playerName}: no change (${res0 ?? 'skipped'}).`] });
        onChanged();
      }
    } catch {
      setNotice({ tone: 'warn', lines: ['Connection problem. Nothing was changed. Try again.'] });
    } finally { setBusy(false); void load(); }
  };

  const printSign = async () => {
    touch();
    // Open the window first (inside the tap), then fill it, so the browser does not block it.
    const w = window.open('', '_blank', 'width=720,height=960');
    if (!w) { setNotice({ tone: 'warn', lines: ['The browser blocked the print window. Allow pop-ups for this site and try again.'] }); return; }
    try {
      const url = `${origin}/checkin?event_id=${encodeURIComponent(eventId)}&mode=request`;
      const qr = await QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M' });
      w.document.write(`<!doctype html><title>Check in: ${esc(eventName)}</title>
<style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px}h1{font-size:40px;margin:0 0 6px}h2{font-size:22px;font-weight:500;margin:0 0 18px;color:#444}
img{width:440px;height:440px;margin:16px 0}p{font-size:22px;margin:8px 0}.small{font-size:16px;color:#555;margin-top:26px}</style>
<h1>${esc(eventName)}</h1>${gameName ? `<h2>${esc(gameName)}</h2>` : ''}
<p><b>Scan to check in</b></p><img src="${qr}" alt="Check-in QR code">
<p>Open your phone camera, scan, then tap <b>Request check-in</b>.</p>
<p>Staff will confirm you&apos;re here and your points are added.</p>
<p class="small">This sign works for this event only, and only while it is running.</p>
<script>window.onload=function(){window.print()}</script>`);
      w.document.close();
    } catch {
      w.close();
      setNotice({ tone: 'warn', lines: ['Could not make the QR code. Try again.'] });
    }
  };

  const approvable = (r: Req) => r.status === 'pending' && r.lastError !== 'renewal_required';
  const selectedIds = Array.from(selected);

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-4 right-4 z-40 px-5 py-3 rounded-full text-base font-bold bg-surface/95 border border-border-strong text-primary shadow-lg select-none flex items-center gap-2"
      >
        Requests
        {pollError
          ? <span title={pollError} className="min-w-[1.5rem] h-6 px-1.5 rounded-full bg-amber-500 text-black text-sm flex items-center justify-center">!</span>
          : badge > 0 && <span className="min-w-[1.5rem] h-6 px-1.5 rounded-full bg-accent text-accent-fg text-sm flex items-center justify-center">{badge}</span>}
      </button>

      {pinOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-xs text-center">
            <h2 className="text-lg font-bold text-primary mb-1">Staff PIN</h2>
            <p className="text-sm text-secondary mb-4">{pinNote || 'Enter your PIN to review check-in requests.'}</p>
            <input
              inputMode="numeric" type="password" autoComplete="off" autoFocus maxLength={6}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') void submitPin(); }}
              className="w-full px-4 py-3 rounded-xl bg-elevated border border-border text-primary text-center text-2xl tracking-[0.4em] outline-none focus:border-accent"
            />
            {pinError && <p className="text-red-400 text-sm mt-3">{pinError}</p>}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setPinOpen(false)} className="flex-1 py-3 rounded-xl border border-border text-secondary">Cancel</button>
              <button type="button" onClick={() => void submitPin()} disabled={pinBusy || pin.length < 4} className="flex-1 py-3 rounded-xl bg-accent text-accent-fg font-bold disabled:opacity-50">
                {pinBusy ? '…' : 'Open'}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 md:p-6" onPointerDown={touch}>
          <div className="bg-surface border border-border rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 md:p-5 border-b border-border">
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-black text-primary">Check-in requests</h2>
                <p className="text-secondary text-sm truncate">{eventName}</p>
                <p className="text-tertiary text-xs mt-0.5">Unlocked · locks in ~{minsLeft || 1} min if unused</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end flex-shrink-0">
                <button type="button" onClick={() => void printSign()} className="px-3 py-2 rounded-xl border border-border-strong text-primary text-sm font-semibold">Print sign</button>
                <button type="button" onClick={() => void lockNow()} className="px-3 py-2 rounded-xl border border-border text-secondary text-sm font-semibold">Lock</button>
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-xl bg-elevated border border-border text-primary text-sm font-semibold">Close</button>
              </div>
            </div>

            {pollError && (
              <div className="mx-4 mt-3 rounded-xl px-4 py-3 text-sm border bg-amber-500/10 border-amber-500/40 text-amber-300">
                {pollError}{lastOkAt ? ` Last updated ${timeOf(lastOkAt)}.` : ''} Do not approve from an old list.
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-tertiary text-sm px-1">
                Tick only the players you can see in the room, then press Approve selected.
                <span className="block mt-1 font-semibold text-secondary">
                  {waiting.length} waiting
                  {review.length > 0 && <span className="text-red-400"> · {review.length} need{review.length === 1 ? 's' : ''} manager review (below)</span>}
                  {dismissed.length > 0 && <span> · {dismissed.length} dismissed</span>}
                </span>
              </p>
              {notice && (
                <div className={`rounded-xl px-4 py-3 text-sm border ${notice.tone === 'ok' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-amber-500/10 border-amber-500/40 text-amber-300'}`}>
                  {notice.lines.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
              {waiting.length === 0 && review.length === 0 && dismissed.length === 0 && (
                <p className="text-tertiary text-center py-10">No one is waiting. Players who scan the printed sign show up here.</p>
              )}

              {waiting.map(r => {
                const renewal = r.lastError === 'renewal_required';
                const checked = selected.has(r.id);
                const info = (
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-primary truncate">{r.playerName}</span>
                    <span className="block text-tertiary text-xs">{r.playerId}</span>
                  </span>
                );
                return (
                  <div key={r.id} className={`rounded-xl border p-3 flex items-center gap-3 ${checked ? 'border-accent bg-accent/10' : 'border-border bg-base'}`}>
                    {renewal ? (
                      <>
                        <button type="button" onClick={() => { touch(); setOpen(false); onCheckInByPlayerId(r.playerId); }}
                          className="px-3 py-3 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-sm font-bold flex-shrink-0">Renewal…</button>
                        {info}
                      </>
                    ) : (
                      <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                        <input type="checkbox" checked={checked} disabled={r.status === 'approving' || busy} onChange={() => toggle(r.id)} className="w-7 h-7 flex-shrink-0 accent-[var(--accent)]" />
                        {info}
                      </label>
                    )}
                    <div className="text-right flex-shrink-0">
                      <div className="text-secondary text-sm">{timeOf(r.requestedAt)}</div>
                      <div className={`text-xs font-semibold ${renewal ? 'text-amber-400' : r.status === 'approving' ? 'text-accent' : 'text-tertiary'}`}>
                        {renewal ? 'Pass expired' : r.status === 'approving' ? 'Checking in…' : 'Waiting'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {review.length > 0 && (
                <div className="pt-3">
                  <h3 className="text-red-400 text-sm font-bold uppercase tracking-wider mb-2">Needs manager review (never retried automatically)</h3>
                  {review.map(r => {
                    const ev = r.evidence;
                    return (
                      <div key={r.id} className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 mb-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block font-bold text-primary truncate">{r.playerName}</span>
                            <span className="block text-tertiary text-xs">{r.playerId}</span>
                          </span>
                          <div className="text-right flex-shrink-0">
                            <div className="text-secondary text-sm">{timeOf(r.requestedAt)}</div>
                            <div className="text-xs font-semibold text-red-400">Needs review</div>
                          </div>
                        </div>
                        {!data?.canReconcile && <p className="text-tertiary text-xs mt-2">Ask a store manager. They can check this player&apos;s records here.</p>}
                        {data?.canReconcile && ev === null && <p className="text-amber-300 text-xs mt-2">Could not read the award records. Try again in a moment.</p>}
                        {data?.canReconcile && ev && (
                          <div className="mt-2 text-xs text-secondary space-y-1">
                            <div>Check-in recorded: {ev.attendanceRows > 0 ? 'yes' : 'no'} · XP entries: {ev.xpRows} · Prize Point entries: {ev.pointsRows}{ev.pointsExpected ? ' (1 expected)' : ' (none expected)'}</div>
                            <div className={ev.verdict === 'complete' ? 'text-emerald-300' : ev.verdict === 'empty' ? 'text-amber-300' : 'text-red-300'}>
                              {ev.verdict === 'complete' ? 'The records show a complete check-in.'
                                : ev.verdict === 'empty' ? 'Nothing was written for this player.'
                                : 'Only part of the check-in was written. Repair it with the reconciliation SQL, then Re-check. It cannot be confirmed or released here.'}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {ev.verdict === 'complete' && <button type="button" disabled={busy} onClick={() => void reconcile(r, 'confirm_complete')} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-50">Confirm checked in</button>}
                              {ev.verdict === 'empty' && <button type="button" disabled={busy} onClick={() => void reconcile(r, 'release')} className="px-3 py-2 rounded-lg bg-amber-500 text-black font-bold disabled:opacity-50">Not checked in: put back on the list</button>}
                              <button type="button" disabled={busy} onClick={() => void reconcile(r, 'recheck')} className="px-3 py-2 rounded-lg border border-border-strong text-primary font-semibold disabled:opacity-50">Re-check</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {dismissed.length > 0 && (
                <details className="pt-3">
                  <summary className="text-tertiary text-sm font-semibold cursor-pointer select-none">Dismissed ({dismissed.length})</summary>
                  <div className="mt-2 space-y-2">
                    {dismissed.map(r => (
                      <div key={r.id} className="rounded-xl border border-border bg-base p-3 flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-bold text-primary truncate">{r.playerName}</span>
                          <span className="block text-tertiary text-xs">{r.playerId} · {timeOf(r.requestedAt)}</span>
                        </span>
                        <button type="button" disabled={busy} onClick={() => { touch(); void runBatches('reopen', [r.id]); }} className="px-3 py-2 rounded-lg border border-border-strong text-primary text-sm font-semibold flex-shrink-0 disabled:opacity-50">Reopen</button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            <div className="p-4 border-t border-border">
              {progress && (
                <div className="mb-3">
                  <div className="text-secondary text-sm mb-1">Working… {progress.done} of {progress.total}</div>
                  <div className="h-2 rounded-full bg-elevated overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} /></div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => void runBatches('dismiss', selectedIds)} disabled={busy || selected.size === 0}
                  className="px-5 py-4 rounded-2xl border border-border-strong text-secondary font-bold disabled:opacity-40">Dismiss selected</button>
                <button type="button" onClick={() => void runBatches('approve', waiting.filter(approvable).filter(r => selected.has(r.id)).map(r => r.id))} disabled={busy || selected.size === 0 || !!pollError}
                  className="flex-1 py-4 rounded-2xl bg-accent text-accent-fg text-lg font-black disabled:opacity-40">
                  {busy ? 'Working…' : `Approve selected (${selected.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
