'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { STAFF_GUIDES, GUIDE_MIN_VIEWS } from '@/lib/staff-guides';

type Progress = Record<string, { views: number; acknowledged: boolean }>;

function log(tab: string, action: string) {
  return fetch('/api/hq/guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tab, action }),
  }).catch(() => {});
}

// Shows the active tab's guide until the staff member has seen it GUIDE_MIN_VIEWS times and ticked "I understand".
// A "?" button reopens it any time. Every action is logged server-side.
export default function StaffGuide({ tabKey }: { tabKey: string }) {
  const guide = STAFF_GUIDES[tabKey];
  const [progress, setProgress] = useState<Progress | null>(null);
  const [open, setOpen] = useState<null | 'auto' | 'manual'>(null);
  const [understood, setUnderstood] = useState(false);
  const shownThisLoad = useRef<Set<string>>(new Set());

  useEffect(() => {
    let live = true;
    fetch('/api/hq/guide')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (live && d?.guides) setProgress(d.guides); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // Auto-open once per tab per page load, until acknowledged. This is what counts as a "view".
  useEffect(() => {
    setOpen(null);
    setUnderstood(false);
    if (!guide || !progress) return;
    const p = progress[tabKey];
    if (!p || p.acknowledged || shownThisLoad.current.has(tabKey)) return;
    shownThisLoad.current.add(tabKey);
    log(tabKey, 'shown');
    setProgress(prev => (prev ? { ...prev, [tabKey]: { ...prev[tabKey], views: prev[tabKey].views + 1 } } : prev));
    setOpen('auto');
  }, [tabKey, progress === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback((action?: string) => {
    if (action) log(tabKey, action);
    setOpen(null);
    setUnderstood(false);
  }, [tabKey]);

  const acknowledge = () => {
    log(tabKey, 'acknowledged');
    setProgress(prev => (prev ? { ...prev, [tabKey]: { ...prev[tabKey], acknowledged: true } } : prev));
    setOpen(null);
    setUnderstood(false);
  };

  if (!guide) return null;
  const p = progress?.[tabKey];
  const canOptOut = open === 'auto' && !!p && p.views >= GUIDE_MIN_VIEWS && !p.acknowledged;

  return (
    <>
      <button
        onClick={() => { log(tabKey, 'reopened'); setOpen('manual'); }}
        className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-surface border border-border-strong text-secondary hover:text-primary hover:bg-elevated shadow-lg font-bold"
        aria-label="How this page works"
        title="How this page works"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/60" role="dialog" aria-modal="true" aria-label={guide.title}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface border border-border-token rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-primary">{guide.title}</h2>
            <p className="text-sm text-secondary mt-1 mb-4">{guide.intro}</p>

            <ol className="space-y-3">
              {guide.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-primary">{s.do}</div>
                    {s.why && <div className="text-xs text-tertiary mt-0.5">{s.why}</div>}
                  </div>
                </li>
              ))}
            </ol>

            {guide.careful && (
              <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                <span className="font-semibold">Careful: </span>{guide.careful}
              </div>
            )}

            {open === 'auto' && p && !p.acknowledged && (
              <p className="text-xs text-tertiary mt-4">
                {p.views < GUIDE_MIN_VIEWS
                  ? `You'll see this guide ${GUIDE_MIN_VIEWS - p.views} more time${GUIDE_MIN_VIEWS - p.views === 1 ? '' : 's'} (viewed ${p.views} of ${GUIDE_MIN_VIEWS}).`
                  : 'You\'ve seen this guide enough times to turn it off.'}
              </p>
            )}

            {canOptOut && (
              <label className="flex items-start gap-2 mt-3 text-sm text-secondary cursor-pointer">
                <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} className="mt-0.5 w-4 h-4 accent-accent" />
                <span>I understand how to do this and I don&apos;t need to see this guide again. This is recorded under my name.</span>
              </label>
            )}

            <div className="flex items-center gap-3 mt-5">
              {open === 'manual' ? (
                <button onClick={() => close()} className="flex-1 py-3 rounded-xl bg-accent text-accent-fg font-bold hover:opacity-90">Close</button>
              ) : canOptOut && understood ? (
                <button onClick={acknowledge} className="flex-1 py-3 rounded-xl bg-accent text-accent-fg font-bold hover:opacity-90">Done, don&apos;t show again</button>
              ) : (
                <button onClick={() => close('got_it')} className="flex-1 py-3 rounded-xl bg-accent text-accent-fg font-bold hover:opacity-90">Got it</button>
              )}
              {open === 'auto' && (
                <button onClick={() => close('skipped')} className="px-3 py-3 text-sm text-tertiary hover:text-primary">Skip</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
