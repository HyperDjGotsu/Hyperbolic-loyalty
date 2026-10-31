'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearLane } from '@/components/LaneLink';

// Shown on sign-in when a remembered player was sent straight here. Lets someone who wanted the store side change their preference.
export function LanePrompt() {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div className="mb-6 w-full max-w-sm rounded-2xl border border-border-token bg-surface p-4 text-center" role="region" aria-label="Update your preference">
      <p className="text-sm font-semibold text-primary">Looking for the store side instead?</p>
      <p className="mt-1 text-xs text-secondary">We sent you to sign-in because you picked Player last time. Want to update your preference?</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => { clearLane(); router.push('/'); }}
          className="pp-press flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg"
        >
          Yes, show me
        </button>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="pp-press flex-1 rounded-xl border border-border-token px-3 py-2 text-sm font-semibold text-secondary"
        >
          No, I&apos;m a player
        </button>
      </div>
    </div>
  );
}
