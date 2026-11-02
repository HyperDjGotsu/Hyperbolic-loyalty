'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export const HOME_TOUR_KEY = 'pp_home_tour_seen';
export const WELCOME_CLOSED_EVENT = 'pp:welcome-closed';

interface Stop { key: string; title: string; text: string }

// Order is the order players see. Stops whose section is not on screen (no banners, no prize highlights,
// desktop vs mobile layout) are skipped, so the same list serves both layouts.
const STOPS: Stop[] = [
  { key: 'hero', title: 'This is you', text: 'Your level fills up as you earn XP. Prize Points are what you spend on the Prize Wall.' },
  { key: 'pass', title: 'Your Player Pass', text: 'Your pass sets how fast you earn. Tap it any time to compare passes.' },
  { key: 'events', title: "What's up next at the store", text: 'These are the events happening at the store. You can find more on the Events page, but this is a quick snapshot.' },
  { key: 'games', title: 'Your games', text: 'Track your progress in each game you play. Each game has its own rank, and all your points combine for your store and network rank in that game.' },
  { key: 'cotd', title: 'Card of the Day', text: 'A new card every day. Come back daily to see it and vote.' },
  { key: 'prizes', title: 'Prize Wall', text: 'Spend your Prize Points here on rewards from the store.' },
  { key: 'activity', title: 'Your activity', text: 'Every XP you earn shows up here, so you can see where it came from.' },
  { key: 'friends', title: 'Friends', text: 'See what your friends are up to. Find players in Community.' },
];

type Rect = { top: number; left: number; width: number; height: number };

const find = (key: string) => document.querySelector<HTMLElement>(`[data-tour="${key}"]`);
const visible = (el: HTMLElement | null) => !!el && el.getClientRects().length > 0;

export default function HomeTour() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const finish = useCallback(() => {
    try { localStorage.setItem(HOME_TOUR_KEY, 'true'); } catch { /* private mode: tour may show again */ }
    setStops([]);
  }, []);

  // Wait for the welcome slides to be done, then for Home to finish loading, then start
  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    const seen = () => { try { return !!localStorage.getItem(HOME_TOUR_KEY); } catch { return true; } };
    const welcomeDone = () => { try { return !!localStorage.getItem('hxp_welcome_seen'); } catch { return true; } };

    const begin = () => {
      if (cancelled || seen()) return;
      let tries = 0;
      poll = setInterval(() => {
        tries++;
        if (visible(find('hero'))) {
          if (poll) clearInterval(poll);
          const live = STOPS.filter(s => visible(find(s.key)));
          if (!cancelled && live.length > 0) { setI(0); setStops(live); }
        } else if (tries > 40) {
          if (poll) clearInterval(poll);
        }
      }, 250);
    };

    if (seen()) return;
    if (welcomeDone()) begin();
    const onWelcome = () => begin();
    window.addEventListener(WELCOME_CLOSED_EVENT, onWelcome);
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      window.removeEventListener(WELCOME_CLOSED_EVENT, onWelcome);
    };
  }, []);

  const active = stops[i];

  const measure = useCallback(() => {
    const el = active ? find(active.key) : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [active]);

  // Bring the section into view, then follow it while the page settles or scrolls
  useLayoutEffect(() => {
    if (!active) return;
    const el = find(active.key);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    measure();
    let frame = 0;
    const loop = () => { measure(); frame = requestAnimationFrame(loop); };
    frame = requestAnimationFrame(loop);
    const stop = setTimeout(() => cancelAnimationFrame(frame), 900);
    const onMove = () => measure();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(stop);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') setI(n => Math.min(n + 1, stops.length - 1));
      if (e.key === 'ArrowLeft') setI(n => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, stops.length, finish]);

  if (!active || !rect) return null;

  const pad = 6;
  const last = i === stops.length - 1;
  // Card sits on the opposite half of the screen from the highlighted section
  const sectionMid = rect.top + rect.height / 2;
  const cardAtTop = sectionMid > window.innerHeight / 2;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Home walkthrough">
      {/* Blocks taps on the page underneath while the tour runs */}
      <div className="absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed rounded-[28px] ring-2 ring-accent motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
        }}
      />
      <div
        className={`fixed left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-border-token bg-surface p-4 shadow-2xl ${cardAtTop ? 'top-4 lg:top-20' : 'bottom-24 lg:bottom-6'}`}
        aria-live="polite"
      >
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-tertiary">
          <span>{i + 1} of {stops.length}</span>
          <button type="button" onClick={finish} className="uppercase tracking-widest text-tertiary hover:text-secondary">Skip</button>
        </div>
        <h2 className="text-lg font-bold text-primary">{active.title}</h2>
        <p className="mt-1 text-sm text-secondary">{active.text}</p>
        <div className="mt-4 flex gap-3">
          {i > 0 && (
            <button type="button" onClick={() => setI(n => n - 1)} className="flex-1 rounded-xl border border-border-token py-2.5 text-sm font-semibold text-secondary">
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? finish() : setI(n => n + 1))}
            className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white"
          >
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
