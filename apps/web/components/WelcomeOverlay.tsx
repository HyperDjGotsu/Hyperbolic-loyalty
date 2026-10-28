'use client';

import { useState, useEffect } from 'react';
import { Hand, Zap, RotateCw, ShoppingBag, CreditCard, type LucideIcon } from 'lucide-react';

const STORAGE_KEY = 'hxp_welcome_seen';

interface StoreConfig {
  store_name: string;
  shop_title: string;
  shop_description: string;
  player_id_prefix: string;
  currency_name: string;
}

const DEFAULT_CONFIG: StoreConfig = {
  store_name: 'Player Pass',
  shop_title: 'Prize Wall',
  shop_description: 'avatar cosmetics — backgrounds, frames, badges, and more',
  player_id_prefix: '',
  currency_name: 'Points',
};

function buildSlides(cfg: StoreConfig) {
  return [
    {
      icon: Hand,
      title: `Welcome to ${cfg.store_name}`,
      body: "You just joined your store's loyalty system. Every time you show up, play, and compete — you earn XP and climb the leaderboard.",
    },
    {
      icon: Zap,
      title: 'Earn XP Every Visit',
      body: 'Check in at events to earn XP. Win matches for bonus XP. The more you play, the higher you rank.',
    },
    {
      icon: RotateCw,
      title: 'Free Daily Spin',
      body: `Every day you get a free spin on the prize wheel. Prizes reset at midnight — don't leave ${cfg.currency_name} on the table.`,
    },
    {
      icon: ShoppingBag,
      title: cfg.shop_title,
      body: `Spend your ${cfg.currency_name} on ${cfg.shop_description}. Your profile, your style.`,
    },
    {
      icon: CreditCard,
      title: 'Your Player Profile',
      body: 'Your Player Pass profile travels with you across the network. Your progress, Guild Points, and rewards are always there. Staff and check-in kiosks can identify you through your profile QR — no code to remember.',
      cta: "Let's go",
    },
  ] as Array<{ icon: LucideIcon; title: string; body: string; cta?: string }>;
}

export function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Fetch store config for dynamic slide content
    fetch(`/api/store-config?t=${Date.now()}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setConfig({ ...DEFAULT_CONFIG, ...data }); })
      .catch(() => {});

    setVisible(true);
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

  const SLIDES = buildSlides(config);

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
        {slide === 0 ? (
          <img src="/brand/pp-lockup.png" alt="Player Pass" className="mx-auto mb-8 h-44 w-auto" />
        ) : (
          <div className="mx-auto mb-8 grid h-24 w-24 place-items-center rounded-[30px] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent"><current.icon size={44} strokeWidth={1.75} /></div>
        )}
        <h2 className="text-primary text-2xl font-bold mb-4 leading-snug">{current.title}</h2>
        <p className="text-secondary text-base leading-relaxed max-w-sm">{current.body}</p>
      </div>

      {/* Progress dots + CTA */}
      <div className="p-8 flex flex-col items-center gap-6">
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
