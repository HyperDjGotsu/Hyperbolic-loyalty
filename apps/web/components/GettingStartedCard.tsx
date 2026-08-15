'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'hxp_welcome_seen';
const DISMISSED_KEY = 'hxp_started_dismissed';

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  href: string;
  storageKey: string;
}

const ITEMS: ChecklistItem[] = [
  {
    key: 'profile',
    label: 'Create your profile',
    description: 'Done!',
    href: '/dashboard/profile',
    storageKey: 'hxp_done_profile',
  },
  {
    key: 'spin',
    label: 'Do your first daily spin',
    description: 'Claim a free XP reward',
    href: '/dashboard',
    storageKey: 'hxp_done_spin',
  },
  {
    key: 'games',
    label: 'Set your favorite games',
    description: 'Personalize your experience',
    href: '/dashboard/profile',
    storageKey: 'hxp_done_games',
  },
  {
    key: 'shop',
    label: 'Visit the Prize Wall',
    description: 'See what you can unlock',
    href: '/dashboard/prize-wall',
    storageKey: 'hxp_done_shop',
  },
  {
    key: 'event',
    label: 'Check in to an event',
    description: 'Ask staff or scan the QR code at your next visit',
    href: '/dashboard/events',
    storageKey: 'hxp_done_event',
  },
];

export function GettingStartedCard() {
  const [visible, setVisible] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Only show if welcome overlay has been seen and card not dismissed
    if (!localStorage.getItem(STORAGE_KEY)) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Load completion state
    const state: Record<string, boolean> = { profile: true }; // profile always done
    for (const item of ITEMS) {
      if (localStorage.getItem(item.storageKey)) state[item.key] = true;
    }
    setCompleted(state);
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const doneCount = ITEMS.filter((i) => completed[i.key]).length;
  const allDone = doneCount === ITEMS.length;

  return (
    <div className="mx-4 mb-4 bg-elevated/50 rounded-2xl border border-border-token overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-primary font-bold text-sm">Getting Started</h3>
          <p className="text-tertiary text-xs mt-0.5">{doneCount}/{ITEMS.length} complete</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-tertiary text-xs hover:text-secondary transition-colors"
        >
          {allDone ? '✓ Dismiss' : 'Hide'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-3 h-1.5 bg-border-token rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / ITEMS.length) * 100}%` }}
        />
      </div>

      <div className="divide-y divide-border-token/50">
        {ITEMS.map((item) => {
          const done = !!completed[item.key];
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => {
                if (!done) {
                  localStorage.setItem(item.storageKey, 'true');
                  setCompleted((prev) => ({ ...prev, [item.key]: true }));
                }
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/50 transition-colors"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                done ? 'bg-accent border-accent' : 'border-border-strong'
              }`}>
                {done && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${done ? 'text-tertiary line-through' : 'text-primary'}`}>
                  {item.label}
                </div>
                {!done && (
                  <div className="text-tertiary text-xs truncate">{item.description}</div>
                )}
              </div>
              {!done && <span className="text-tertiary text-sm flex-shrink-0">›</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Call this from the daily spin component when a spin completes
export function markSpinDone() {
  if (typeof window !== 'undefined') localStorage.setItem('hxp_done_spin', 'true');
}

// Call this from the shop page on mount
export function markShopVisited() {
  if (typeof window !== 'undefined') localStorage.setItem('hxp_done_shop', 'true');
}

// Call this from the profile page when favorites are saved
export function markGamesDone() {
  if (typeof window !== 'undefined') localStorage.setItem('hxp_done_games', 'true');
}
