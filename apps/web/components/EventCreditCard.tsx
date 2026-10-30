'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface EventCreditState {
  eligible: boolean;
  monthKey: string;
  amountCents: number;
  redeemedAt: string | null;
  name: string;
  playerId: string;
}

type Step = 'idle' | 'confirm' | 'sure' | 'ticket';

const PACIFIC = 'America/Los_Angeles';

const dollars = (cents: number) => `$${Math.round(cents / 100)}`;
const monthName = (monthKey: string) => new Date(`${monthKey}T12:00:00`).toLocaleDateString('en-US', { month: 'long' });
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: PACIFIC, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Diamond members only: renders nothing for anyone else. The server decides who is eligible and enforces one use per month.
export function EventCreditCard() {
  const [credit, setCredit] = useState<EventCreditState | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/player/event-credit', { cache: 'no-store' });
      if (res.ok) setCredit(await res.json());
    } catch {
      // Leave the row hidden if the status can't be loaded.
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function redeem() {
    setRedeeming(true);
    setError(null);
    try {
      const res = await fetch('/api/player/event-credit', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 409) {
          await load();
          setStep('idle');
          return;
        }
        throw new Error(data.error ?? 'Could not redeem');
      }
      setCredit(prev => prev ? { ...prev, redeemedAt: data.redeemedAt, name: data.name, playerId: data.playerId } : prev);
      setStep('ticket');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redeem');
      setStep('idle');
    } finally {
      setRedeeming(false);
    }
  }

  if (!credit?.eligible) return null;

  const amount = dollars(credit.amountCents);
  const month = monthName(credit.monthKey);
  const used = credit.redeemedAt !== null;

  return (
    <>
      <div className="mt-3 rounded-xl bg-elevated p-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-primary text-sm font-semibold">Event Credit · {amount}</div>
          <div className="text-secondary text-xs mt-0.5">
            {used ? `Used for ${month}` : 'For events only · 1 per month'}
          </div>
          {error && <div className="text-danger text-xs mt-1">{error}</div>}
        </div>
        {used ? (
          <button type="button" onClick={() => setStep('ticket')} className="shrink-0 px-3 py-2 rounded-lg border border-border-token text-secondary text-sm font-semibold">
            View
          </button>
        ) : (
          <button type="button" onClick={() => { setError(null); setStep('confirm'); }} className="shrink-0 px-4 py-2 rounded-lg bg-accent text-black text-sm font-bold">
            Redeem
          </button>
        )}
      </div>

      {step === 'confirm' && (
        <Popup
          title={`Redeem your ${amount} Event Credit?`}
          body="Only tap this when you're at the counter with a staff member."
          confirmLabel="Continue"
          cancelLabel="Not now"
          onConfirm={() => setStep('sure')}
          onCancel={() => setStep('idle')}
        />
      )}
      {step === 'sure' && (
        <Popup
          title="Are you sure?"
          body={`This uses your Event Credit for ${month}. It can't be undone, even if you change your mind at the counter.`}
          confirmLabel={redeeming ? 'Redeeming…' : 'Yes, show to staff'}
          cancelLabel="Go back"
          busy={redeeming}
          onConfirm={() => void redeem()}
          onCancel={() => setStep('confirm')}
        />
      )}
      {step === 'ticket' && credit.redeemedAt && (
        <Ticket credit={credit} amount={amount} month={month} onClose={() => setStep('idle')} />
      )}
    </>
  );
}

function Popup({ title, body, confirmLabel, cancelLabel, busy, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; cancelLabel: string; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-border-token p-5 text-center">
        <div className="text-primary text-lg font-bold">{title}</div>
        <p className="text-secondary text-sm mt-2 leading-relaxed">{body}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" disabled={busy} onClick={onConfirm} className="w-full py-3 rounded-xl bg-accent text-black font-bold disabled:opacity-60">{confirmLabel}</button>
          <button type="button" disabled={busy} onClick={onCancel} className="w-full py-3 rounded-xl border border-border-token text-secondary font-semibold disabled:opacity-60">{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
}

// What staff look at. A live clock makes a screenshot easy to spot; the server record is the proof.
function Ticket({ credit, amount, month, onClose }: { credit: EventCreditState; amount: string; month: string; onClose: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Event Credit ticket">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border-2 border-dashed border-accent bg-surface p-6 text-center">
          <div className="text-secondary text-xs font-bold uppercase tracking-widest">Event Credit</div>
          <div className="text-accent font-extrabold text-6xl mt-2 tabular-nums">{amount}</div>
          <div className="text-secondary text-sm mt-1">Events only · Used for {month}</div>
          <div className="mt-5 divide-y divide-border-token text-left text-sm">
            <Row label="Name" value={credit.name} />
            <Row label="Player ID" value={credit.playerId} />
            <Row label="Redeemed" value={credit.redeemedAt ? when(credit.redeemedAt) : ''} />
            <Row label="Right now" value={now.toLocaleTimeString('en-US', { timeZone: PACIFIC, hour: 'numeric', minute: '2-digit', second: '2-digit' })} />
          </div>
        </div>
        <p className="text-secondary text-xs text-center mt-3">Show this screen to staff.</p>
        <button type="button" onClick={onClose} className="mt-4 w-full py-3 rounded-xl border border-border-token text-secondary font-semibold">Close</button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-secondary">{label}</span>
      <span className="text-primary font-semibold tabular-nums">{value}</span>
    </div>
  );
}
