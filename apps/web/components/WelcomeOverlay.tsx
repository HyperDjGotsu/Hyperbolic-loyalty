'use client';

import { useState, useEffect } from 'react';

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

interface PrizePreview { id: string; name: string; image_url: string | null; xp_cost: number }

const MEDALS: Array<{ name: string; price: number; face: string; ring: string }> = [
  { name: 'Bronze', price: 10, face: 'linear-gradient(135deg,#e8a56a,#8c4f22)', ring: '#b8703a' },
  { name: 'Silver', price: 15, face: 'linear-gradient(135deg,#f1f3f6,#8d96a3)', ring: '#c4cad3' },
  { name: 'Gold', price: 20, face: 'linear-gradient(135deg,#ffe48a,#c58a12)', ring: '#e2b43c' },
  { name: 'Diamond', price: 30, face: 'linear-gradient(135deg,#d9f6ff,#5cc8f0 55%,#8f7bff)', ring: '#8fdcf7' },
];

// Mock of the feature each slide describes. Slide 0 is the logo; 1.. follow buildSlides order.
function SlideArt({ slide, prizes, currency }: { slide: number; prizes: PrizePreview[]; currency: string }) {
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
      <div className="mb-6 text-center">
        <div className="font-display text-7xl font-extrabold leading-none text-accent">+5</div>
        <div className="mt-2 text-xs font-bold uppercase tracking-widest text-secondary">Daily bonus {currency}</div>
      </div>
    );
  }
  if (slide === 3) {
    const shown = prizes.slice(0, 2);
    if (shown.length === 0) {
      return (
        <div className="mb-6 grid w-full max-w-xs grid-cols-2 gap-3">
          {['pokemon', 'one_piece'].map(g => (
            <img key={g} src={`/games/ggob/${g}.jpg`} alt="" className="h-28 w-full rounded-2xl border border-border-token object-cover" />
          ))}
        </div>
      );
    }
    return (
      <div className={`mb-6 grid w-full max-w-xs gap-3 ${shown.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-[11rem]'}`}>
        {shown.map(p => (
          <div key={p.id} className="overflow-hidden rounded-2xl border border-border-token bg-surface text-left">
            {p.image_url && <img src={p.image_url} alt="" className="h-28 w-full object-cover" />}
            <div className="p-2.5">
              <div className="truncate text-xs font-bold text-primary">{p.name}</div>
              <div className="text-[11px] font-semibold text-accent">{p.xp_cost.toLocaleString()} {currency}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (slide === 4) {
    return (
      <div className="mb-6 flex w-full max-w-xs justify-between">
        {MEDALS.map(m => (
          <div key={m.name} className="text-center">
            <div
              className={`mx-auto h-14 w-14 shadow-lg ${m.name === 'Diamond' ? '' : 'rounded-full'}`}
              style={{
                background: m.face,
                border: m.name === 'Diamond' ? undefined : `3px solid ${m.ring}`,
                clipPath: m.name === 'Diamond' ? 'polygon(50% 0,100% 38%,50% 100%,0 38%)' : undefined,
              }}
            />
            <div className="mt-2 text-[11px] font-bold text-primary">{m.name}</div>
            <div className="text-[11px] text-secondary">${m.price}</div>
          </div>
        ))}
      </div>
    );
  }
  if (slide === 5) {
    return (
      <div className="relative mb-6 w-full max-w-xs overflow-hidden rounded-2xl border border-border-token">
        <img src="/games/ggob/pokemon.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative flex flex-col items-center px-4 py-5">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-xp text-2xl">😎</div>
          <div className="mt-3 text-lg font-extrabold text-white">Hyperbolic Creative</div>
          <div className="mt-3 grid w-full grid-cols-3 text-center">
            <div><div className="text-xl font-extrabold text-white">11</div><div className="text-[10px] font-semibold uppercase text-white/70">Level</div></div>
            <div><div className="text-xl font-extrabold text-xp">1,080</div><div className="text-[10px] font-semibold uppercase text-white/70">Total XP</div></div>
            <div><div className="text-xl font-extrabold text-accent">250</div><div className="text-[10px] font-semibold uppercase text-white/70">{currency}</div></div>
          </div>
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
  const [prizes, setPrizes] = useState<PrizePreview[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Fetch store config for dynamic slide content
    fetch(`/api/store-config?t=${Date.now()}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setConfig({ ...DEFAULT_CONFIG, ...data }); })
      .catch(() => {});

    // Real prizes from the player's store for the Prize Wall slide (the slide falls back to game art without them)
    const storeId = localStorage.getItem('ggc_selected_store_id');
    if (storeId) {
      fetch(`/api/prize-wall?storeId=${encodeURIComponent(storeId)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          const withArt = (data?.items ?? []).filter((i: PrizePreview) => i.image_url);
          setPrizes(withArt.slice(0, 2));
        })
        .catch(() => {});
    }

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
      <div key={slide} className="pp-slide flex-1 flex flex-col items-center justify-center px-8 text-center">
        {slide === 0 && <img src="/brand/pp-lockup.png" alt="Player Pass" className="mx-auto mb-8 h-44 w-auto" />}
        <SlideArt slide={slide} prizes={prizes} currency={config.currency_name} />
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
          className="pp-press w-full max-w-sm py-4 rounded-xl bg-accent text-white font-bold text-base hover:opacity-90"
        >
          {current.cta ?? 'Next →'}
        </button>
      </div>
    </div>
  );
}
