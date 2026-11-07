'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

export const PAGE_INTRO_KEY_PREFIX = 'pp_page_intro_';

// One short "what is this page" card the first time a player opens each page.
const INTROS: Record<string, { key: string; title: string; text: string }> = {
  '/dashboard/events': {
    key: 'events',
    title: 'Events',
    text: "What's happening at your store. Tap the star to say you're interested, and check in when you get there. Earn XP just for showing up.",
  },
  '/dashboard/community': {
    key: 'community',
    title: 'Community',
    text: 'Leaderboards and your friends. See who is climbing in each game, find players, and add friends.',
  },
  '/dashboard/prize-wall': {
    key: 'prize-wall',
    title: 'Prize Wall',
    text: 'Spend your Prize Points here on rewards from the store. Points come from playing and showing up, and a PlayerPass lets you spend them.',
  },
  '/dashboard/profile': {
    key: 'profile',
    title: 'Your profile',
    text: 'Your player card: stats, games, status and settings. Choose who can see your profile here.',
  },
};

// Floats above the bottom nav (bottom-left on desktop) so it never pushes the page around.
export default function PageIntro() {
  const pathname = usePathname();
  const intro = INTROS[pathname];
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    if (!intro) return;
    try { if (localStorage.getItem(PAGE_INTRO_KEY_PREFIX + intro.key)) return; } catch { return; }
    const t = setTimeout(() => setShow(true), 700);
    return () => clearTimeout(t);
  }, [intro]);

  if (!intro || !show) return null;

  const dismiss = () => {
    try { localStorage.setItem(PAGE_INTRO_KEY_PREFIX + intro.key, 'true'); } catch { /* shows again next visit */ }
    setShow(false);
  };

  return (
    <div
      role="status"
      className="fixed left-4 right-4 z-40 rounded-2xl border border-accent/40 bg-surface p-4 shadow-2xl bottom-[calc(160px+env(safe-area-inset-bottom,0px))] lg:right-auto lg:bottom-6 lg:left-6 lg:w-[360px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-accent">About this page</div>
          <h2 className="mt-0.5 text-base font-bold text-primary">{intro.title}</h2>
        </div>
        <button type="button" onClick={dismiss} aria-label="Close" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-tertiary hover:text-primary">
          <X size={16} />
        </button>
      </div>
      <p className="mt-1 text-sm text-secondary">{intro.text}</p>
      <button type="button" onClick={dismiss} className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-white">Got it</button>
    </div>
  );
}
