'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'hxp_welcome_seen';

const SLIDES = [
  {
    emoji: '👋',
    title: 'Welcome to Hyperbolic XP',
    body: "You just joined your store's loyalty system. Every time you show up, play, and compete — you earn XP and climb the leaderboard.",
    cta: null,
  },
  {
    emoji: '⚡',
    title: 'Earn XP Every Visit',
    body: 'Check in at events to earn XP. Win matches for bonus XP. The more you play, the higher you rank.',
    cta: null,
  },
  {
    emoji: '🎰',
    title: 'Free Daily Spin',
    body: "Every day you get a free spin on the prize wheel. Prizes reset at midnight — don't leave XP on the table.",
    cta: null,
  },
  {
    emoji: '🛍️',
    title: 'The Prize Wall',
    body: 'Spend your points on avatar cosmetics: backgrounds, frames, badges, and more. Your profile, your style.',
    cta: null,
  },
  {
    emoji: '🪪',
    title: 'Your Player ID',
    body: "Your HYP-ID is your identity at the store. Staff use it to check you in, award XP, and look you up. Find it any time on your Profile.",
    cta: "Let's go",
  },
];

export function WelcomeOverlay() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const next = () => {
    if (slide < SLIDES.length - 1) {
      setSlide(slide + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = SLIDES[slide];

  return (
    <div className="fixed inset-0 z-[100] bg-base flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={dismiss}
          className="text-tertiary text-sm hover:text-secondary transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-7xl mb-8">{current.emoji}</div>
        <h2 className="text-primary text-2xl font-bold mb-4 leading-snug">{current.title}</h2>
        <p className="text-secondary text-base leading-relaxed max-w-sm">{current.body}</p>
      </div>

      {/* Progress dots + CTA */}
      <div className="p-8 flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all ${
                i === slide ? 'w-6 h-2 bg-accent' : 'w-2 h-2 bg-border-strong'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={next}
          className="w-full max-w-sm py-4 rounded-xl bg-accent text-white font-bold text-base hover:opacity-90 transition-opacity"
        >
          {current.cta ?? 'Next →'}
        </button>
      </div>
    </div>
  );
}
