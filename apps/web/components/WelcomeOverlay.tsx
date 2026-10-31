'use client';

import { useState, useEffect } from 'react';
import { Gift, Crown, QrCode, Lock } from 'lucide-react';
import { PASS_TIERS } from '@/lib/pass-tiers';

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
      title: `Welcome to ${cfg.store_name}`,
      body: "You just joined your store's loyalty system. Every time you show up, play, and compete — you earn XP and climb the leaderboard.",
    },
    {
      title: 'Earn XP Every Visit',
      body: 'Check in at events to earn XP. Win matches for bonus XP. The more you play, the higher you rank.',
    },
    {
      title: 'Daily Bonus',
      body: `Open the app every day for a free bonus. It resets at midnight — don't leave ${cfg.currency_name} on the table.`,
    },
    {
      title: cfg.shop_title,
      body: `Everyone earns ${cfg.currency_name} at events. Spend them on prizes from the store — a pass unlocks spending.`,
    },
    {
      title: 'Passes',
      body: 'Bronze, Silver, Gold and Diamond passes let you spend your points and earn them faster. Staff can start one for you in the store.',
    },
    {
      title: 'Your Player Profile',
      body: 'Your Player Pass profile travels with you across the network. Your progress, Guild Points, and rewards are always there. Staff and check-in kiosks can identify you through your profile QR — no code to remember.',
      cta: "Let's go",
    },
  ] as Array<{ title: string; body: string; cta?: string }>;
}


const CARD = 'w-full max-w-xs rounded-2xl border border-border-token bg-surface p-4 text-left';

// Small mock of the feature each slide describes. Slide 0 is the logo and slide 1.. follow buildSlides order.
function SlideArt({ slide }: { slide: number }) {
  if (slide === 1) {
    return (
      <div className={`${CARD} mb-6`}>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-secondary">Level 11</span>
          <span className="text-xp">+30 XP</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-elevated"><div className="h-full w-2/3 rounded-full bg-xp" /></div>
        <div className="mt-3 flex gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-elevated px-2.5 py-1 text-primary">Check-in +20</span>
          <span className="rounded-full bg-elevated px-2.5 py-1 text-primary">Match win +10</span>
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${CARD} mb-6 flex items-center gap-3`}>
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent"><Gift size={24} /></div>
        <div className="flex-1">
          <div className="text-sm font-bold text-primary">Daily bonus ready</div>
          <div className="text-xs text-secondary">Resets at midnight</div>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-fg">Claim</span>
      </div>
    );
  }
  if (slide === 3) {
    return (
      <div className="mb-6 grid w-full max-w-xs grid-cols-2 gap-3">
        {['Prize', 'Prize'].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border-token bg-surface p-3 text-left">
            <div className="h-14 rounded-xl bg-elevated" />
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-primary">
              <span>{i === 0 ? '250 pts' : '500 pts'}</span>
              <Lock size={12} className="text-secondary" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (slide === 4) {
    return (
      <div className="mb-6 grid w-full max-w-xs grid-cols-4 gap-2">
        {PASS_TIERS.filter(t => t.key !== 'free').map(t => (
          <div key={t.key} className="rounded-xl border border-border-token bg-surface py-3 text-center">
            <Crown size={18} className="mx-auto text-accent" />
            <div className="mt-1 text-[11px] font-bold text-primary">{t.name}</div>
            <div className="text-[11px] text-secondary">${t.priceMonthly}</div>
          </div>
        ))}
      </div>
    );
  }
  if (slide === 5) {
    return (
      <div className={`${CARD} mb-6 flex items-center gap-3`}>
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-elevated text-primary"><QrCode size={30} /></div>
        <div>
          <div className="text-sm font-bold text-primary">Your profile QR</div>
          <div className="text-xs text-secondary">Staff scan it. No code to remember.</div>
        </div>
      </div>
    );
  }
  return null;
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
        {slide === 0 && <img src="/brand/pp-lockup.png" alt="Player Pass" className="mx-auto mb-8 h-44 w-auto" />}
        <SlideArt slide={slide} />
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
