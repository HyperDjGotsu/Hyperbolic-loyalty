'use client';

import React, { useEffect, useState } from 'react';
import { PASS_TIERS, type PassTierKey } from '@/lib/pass-tiers';

// Bottom sheet comparing the passes. `currentTier` is highlighted as the player's own.
export function PassesSheet({ currentTier, onClose }: { currentTier: PassTierKey; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  // Play the exit (same edge it came from) before the parent unmounts the sheet
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 250);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/70 ${closing ? 'pp-backdrop-out' : 'pp-backdrop'}`} role="dialog" aria-modal="true" aria-label="Passes" onClick={close}>
      <div className={`w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface border-t border-border-token p-5 pb-8 ${closing ? 'pp-sheet-out' : 'pp-sheet'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-primary">Passes</h2>
          <button type="button" onClick={close} className="pp-press px-3 py-1.5 rounded-lg border border-border-token text-secondary text-sm font-semibold">Close</button>
        </div>
        <div className="flex flex-col gap-3">
          {PASS_TIERS.map(tier => {
            const isCurrent = tier.key === currentTier;
            return (
              <div key={tier.key} className={`rounded-2xl p-4 border ${isCurrent ? 'border-accent bg-accent/10' : 'border-border-token bg-elevated'}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-base font-bold">{tier.name}</span>
                    {isCurrent && <span className="text-[11px] font-bold uppercase tracking-wide text-accent">Your pass</span>}
                  </div>
                  <span className="text-primary text-base font-bold tabular-nums">
                    {tier.priceMonthly === null ? 'Free' : <>${tier.priceMonthly}<span className="text-secondary text-xs font-normal">/mo</span></>}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {tier.perks.map(perk => (
                    <li key={perk} className="text-secondary text-sm flex gap-2"><span aria-hidden="true">·</span><span>{perk}</span></li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-secondary text-xs mt-4 text-center">Ask staff in the store to start or change your pass.</p>
      </div>
    </div>
  );
}
