'use client';

import { useState, useEffect, useRef } from 'react';
import { type PitchConfig } from './configs';

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

/* ── Counter animation ── */
function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{value.toLocaleString()}</span>;
}

/* ── Mock phone screen ── */
function PhoneScreen({ cfg }: { cfg: PitchConfig }) {
  const [tab, setTab] = useState<'home' | 'spin' | 'shop'>('home');
  const hqColor = cfg.hqColor;
  const prefix = cfg.hqPrefix;

  return (
    <div className="relative mx-auto" style={{ width: 260 }}>
      <div
        className="relative rounded-[36px] overflow-hidden shadow-2xl"
        style={{ background: '#111009', minHeight: 520, border: '2px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex justify-between px-6 pt-3 pb-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <span>9:41</span><span>●●●</span>
        </div>

        {tab === 'home' && (
          <div className="px-4 pb-3">
            <div className="rounded-2xl p-4 mb-3" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${hqColor}20` }}>🎮</div>
                <div className="min-w-0">
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{prefix}-AXR001</div>
                  <div className="font-bold text-white text-sm">Alex R.</div>
                  <div className="text-[11px]" style={{ color: hqColor }}>Planeswalker</div>
                </div>
                <div className="ml-auto text-right flex-shrink-0">
                  <div className="text-lg font-bold" style={{ color: hqColor }}>4,820</div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Points</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#222018' }}>
                <div className="h-full rounded-full" style={{ width: '76%', background: hqColor }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Level 64</span>
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>180 to next rank</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {[{ label: 'Events', value: '52' }, { label: 'Rank', value: '#3 🏆' }, { label: 'Streak', value: '8 🔥' }].map(s => (
                <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-xs font-bold text-white">{s.value}</div>
                  <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTab('spin')} className="rounded-xl py-2.5 text-xs font-bold" style={{ background: hqColor, color: '#111009' }}>
                🎰 Daily Spin
              </button>
              <button onClick={() => setTab('shop')} className="rounded-xl py-2.5 text-xs font-bold" style={{ background: '#222018', color: '#f2efe8', border: '1px solid rgba(255,255,255,0.08)' }}>
                🛍️ Prizes
              </button>
            </div>
          </div>
        )}

        {tab === 'spin' && (
          <div className="px-4 pb-3">
            <button onClick={() => setTab('home')} className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>← Back</button>
            <div className="text-center mb-3">
              <div className="text-sm font-bold text-white mb-0.5">Daily Spin</div>
              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Free once a day · resets at midnight</div>
            </div>
            <div className="rounded-2xl p-5 text-center mb-3" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-5xl mb-2">🎰</div>
              <div className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Win Points, XP, or rare cosmetics</div>
              <button className="w-full py-2.5 rounded-xl text-xs font-bold" style={{ background: hqColor, color: '#111009' }}>Spin Now →</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[{ label: '+50 XP', color: '#60a5fa' }, { label: '+150 XP', color: hqColor }, { label: 'Badge!', color: '#f59e0b' }].map(p => (
                <div key={p.label} className="rounded-lg p-2 text-center" style={{ background: '#222018', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs font-bold" style={{ color: p.color }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'shop' && (
          <div className="px-4 pb-3">
            <button onClick={() => setTab('home')} className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>← Back</button>
            <div className="text-sm font-bold text-white mb-3">Prize Wall</div>
            <div className="grid grid-cols-2 gap-2">
              {cfg.prizes.slice(0, 4).map(item => (
                <div key={item.id} className="rounded-xl p-3" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-[11px] font-bold text-white truncate">{item.name}</div>
                  <div className="text-[9px] mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.category}</div>
                  <div className="text-xs font-bold" style={{ color: item.color }}>{item.cost.toLocaleString()} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-around py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#111009' }}>
          {[{ icon: '🏠', label: 'Home' }, { icon: '📅', label: 'Events' }, { icon: '🏆', label: 'Ranks' }, { icon: '👤', label: 'Profile' }].map(n => (
            <button key={n.label} className="flex flex-col items-center gap-0.5">
              <span className="text-sm">{n.icon}</span>
              <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Staff check-in widget ── */
function StaffCheckinWidget({ cfg }: { cfg: PitchConfig }) {
  const [playerInput, setPlayerInput] = useState('');
  const [state, setState] = useState<'idle' | 'found' | 'done'>('idle');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const handleLookup = () => { if (playerInput.trim()) setState('found'); };
  const handleAward = (action: string) => {
    setSelectedAction(action);
    setState('done');
    setTimeout(() => { setState('idle'); setPlayerInput(''); setSelectedAction(null); }, 3000);
  };

  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 420 }}>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">🏷️</span>
        <div>
          <div className="font-bold text-white text-sm">Staff Check-in</div>
          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Award XP in seconds</div>
        </div>
      </div>

      {state === 'idle' && (
        <>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={playerInput}
              onChange={e => setPlayerInput(e.target.value.toUpperCase())}
              placeholder={`${cfg.hqPrefix}-XXXXXX`}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ background: '#222018', border: '1px solid rgba(255,255,255,0.1)' }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
            <button
              onClick={handleLookup}
              className="px-4 rounded-xl text-sm font-bold flex-shrink-0"
              style={{ background: cfg.hqColor, color: '#111009' }}
            >
              Find
            </button>
          </div>
          <div className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>or scan player QR code</div>
        </>
      )}

      {state === 'found' && (
        <>
          <div className="rounded-xl p-3 mb-4 flex items-center gap-3" style={{ background: '#222018', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${cfg.hqColor}20` }}>🎮</div>
            <div className="min-w-0">
              <div className="font-bold text-white text-sm">Alex R.</div>
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{cfg.hqPrefix}-AXR001 · 4,820 pts</div>
            </div>
            <div className="ml-auto text-green-400 text-xs font-semibold flex-shrink-0">✓ Found</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Event Check-in', xp: '+50 XP', color: cfg.hqColor },
              { label: 'Match Win', xp: '+25 XP', color: '#34d399' },
              { label: 'Tournament Win', xp: '+100 XP', color: '#FACC15' },
              { label: 'Referral Bonus', xp: '+75 XP', color: '#f472b6' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => handleAward(action.label)}
                className="rounded-xl p-3 text-left transition-colors"
                style={{ background: '#222018', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="text-xs font-semibold text-white">{action.label}</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: action.color }}>{action.xp}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {state === 'done' && (
        <div className="text-center py-6">
          <div className="text-4xl mb-2">✅</div>
          <div className="font-bold text-white mb-1">{selectedAction} awarded!</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Alex R. has been notified</div>
        </div>
      )}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ id, children, className, dark }: { id?: string; children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <section id={id} className={cn('py-16 sm:py-20 px-5', dark ? 'bg-surface' : '', className)}>
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-4" style={{ border: '1px solid rgba(196,181,253,0.3)', background: 'rgba(196,181,253,0.1)', color: '#c4b5fd' }}>
      {children}
    </div>
  );
}

/* ── Shared pitch UI — used by /pitch and /pitch/[slug] ── */
export default function PitchContent({ cfg }: { cfg: PitchConfig }) {
  const [activeStoreId, setActiveStoreId] = useState(cfg.stores[0].id);

  const totalPlayers = cfg.stores.reduce((s, g) => s + g.players, 0);
  const totalCheckins = cfg.stores.reduce((s, g) => s + g.weekCheckins, 0);
  const totalRedemptions = cfg.stores.reduce((s, g) => s + g.redemptions, 0);

  const rankColors = ['#FACC15', '#C0C0C0', '#CD7F32'];

  return (
    <div className="min-h-screen bg-base text-primary" style={{ fontFamily: 'var(--font-sans)' }}>

      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(196,181,253,0.08) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-8" style={{ border: '1px solid rgba(196,181,253,0.3)', background: 'rgba(196,181,253,0.1)', color: '#c4b5fd' }}>
            {cfg.label}
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-primary mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {cfg.heroHeadline}
          </h1>
          <p className="text-lg sm:text-xl text-secondary mb-4 leading-relaxed max-w-xl mx-auto">{cfg.heroSub}</p>
          <p className="text-secondary text-sm mb-10">{cfg.heroTagline}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <a
              href="#player"
              className="px-8 py-4 rounded-xl font-bold text-base transition-opacity hover:opacity-90"
              style={{ background: '#c4b5fd', color: '#111009' }}
            >
              See the player experience →
            </a>
            <a
              href="#company"
              className="px-8 py-4 rounded-xl font-bold text-base transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#f2efe8', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              Skip to company overview ↓
            </a>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-tertiary text-xs flex flex-col items-center gap-1">
          <span>Scroll to explore</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="border-y border-border-token bg-surface">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Active Players', value: totalPlayers },
            { label: 'Check-ins This Week', value: totalCheckins },
            { label: 'Prize Redemptions', value: totalRedemptions },
            { label: 'Stores Live', value: cfg.stores.length },
          ].map((stat, i) => (
            <div key={stat.label} className={cn('py-7 px-5 text-center', i < 3 ? 'border-b sm:border-b-0 sm:border-r border-border-token' : '', i === 1 ? 'border-r border-border-token sm:border-r' : '')}>
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                <AnimatedNumber target={stat.value} />
              </div>
              <div className="text-xs text-tertiary leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Player experience ── */}
      <Section id="player">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <SectionLabel>Player experience</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              Players earn every time they show up
            </h2>
            <p className="text-secondary text-base leading-relaxed mb-6">
              Each player gets a unique loyalty ID tied to your store. They check in at events, win matches, spin the daily wheel, and climb the leaderboard — all from their phone.
            </p>
            <div className="space-y-3">
              {[
                { icon: '🏷️', title: 'Player ID', desc: `Every player gets a ${cfg.hqPrefix}-XXXXX ID. Staff find them in seconds.` },
                { icon: '⚡', title: 'XP for everything', desc: 'Check-in, match wins, referrals, daily spin — all earn points.' },
                { icon: '🏆', title: 'Leaderboard competition', desc: 'Store rankings keep regulars coming back every week.' },
                { icon: '🔔', title: 'Push notifications', desc: 'Players get reminded about events, spin resets, and new prizes.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 mt-0.5 bg-elevated">{item.icon}</div>
                  <div>
                    <div className="font-semibold text-primary text-sm">{item.title}</div>
                    <div className="text-secondary text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <PhoneScreen cfg={cfg} />
          </div>
        </div>
      </Section>

      {/* ── Prize Wall ── */}
      <Section id="prizewall" dark>
        <div className="text-center mb-10">
          <SectionLabel>Prize wall</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
            The feature that started it all
          </h2>
          <p className="text-secondary max-w-xl mx-auto">
            Players spend their Points on avatar cosmetics — backgrounds, frames, badges, and titles. You control the catalog. Add new prizes any time from HQ.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {cfg.prizes.map(item => (
            <div key={item.id} className="rounded-2xl border border-border-token p-4 sm:p-5 hover:-translate-y-1 transition-transform bg-elevated">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl mb-3" style={{ background: `${item.color}20` }}>
                {item.icon}
              </div>
              <div className="font-bold text-primary text-sm mb-0.5 truncate">{item.name}</div>
              <div className="text-xs text-tertiary mb-3">{item.category}</div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-bold" style={{ color: item.color }}>{item.cost.toLocaleString()} pts</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: `${item.color}20`, color: item.color }}>
                  {item.rarity}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border-token p-5 sm:p-6 text-center bg-elevated">
          <p className="text-secondary text-sm">
            <span className="text-primary font-semibold">You set the prices, you add the prizes.</span> Every store gets its own Prize Wall with its own currency name — fully white-labeled per location.
          </p>
        </div>
      </Section>

      {/* ── Staff tools ── */}
      <Section id="staff">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <SectionLabel>Staff tools</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              Zero training required
            </h2>
            <p className="text-secondary text-base leading-relaxed mb-6">
              Your staff opens one screen. They type a Player ID or scan a QR code. They tap one button. Done. Players get XP and a notification instantly.
            </p>
            <div className="space-y-4">
              {[
                { icon: '📱', title: 'Works on any device', desc: 'Phone, tablet, or computer — no app install for staff.' },
                { icon: '🔍', title: 'Instant player lookup', desc: 'Find anyone by their store ID in under a second.' },
                { icon: '⚡', title: 'One-tap XP award', desc: 'Check-in, win, referral — preset buttons, no math.' },
                { icon: '✅', title: 'Automatic confirmation', desc: 'Player is notified on their phone the moment XP is awarded.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 mt-0.5 bg-elevated">{item.icon}</div>
                  <div>
                    <div className="font-semibold text-primary text-sm">{item.title}</div>
                    <div className="text-secondary text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <StaffCheckinWidget cfg={cfg} />
            <p className="text-center text-tertiary text-xs mt-4">Try it — type anything and hit Find</p>
          </div>
        </div>
      </Section>

      {/* ── Store HQ ── */}
      <Section id="hq" dark>
        <div className="text-center mb-10">
          <SectionLabel>Store HQ</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            What store managers see
          </h2>
          <p className="text-secondary max-w-lg mx-auto">
            Each store has its own HQ dashboard. Managers view top players, run events, add prizes, and see this week&apos;s activity at a glance.
          </p>
        </div>

        <div className="rounded-2xl border border-border-token overflow-hidden bg-elevated">
          {/* HQ Header — tabs hidden on mobile */}
          <div className="px-4 sm:px-6 py-4 border-b border-border-token">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cfg.hqColor}20` }}>🏪</div>
                <div className="min-w-0">
                  <div className="font-bold text-primary text-sm truncate">{cfg.hqStoreName} HQ</div>
                  <div className="text-xs text-tertiary">{cfg.hqCity} · Staff View</div>
                </div>
              </div>
              {/* Tabs: desktop only */}
              <div className="hidden sm:flex gap-1 flex-shrink-0">
                {['Dashboard', 'Events', 'Players', 'Shop', 'Settings'].map(tab => (
                  <button key={tab} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', tab === 'Dashboard' ? 'text-accent-fg' : 'text-tertiary hover:text-secondary')} style={tab === 'Dashboard' ? { background: cfg.hqColor } : {}}>
                    {tab}
                  </button>
                ))}
              </div>
              {/* Mobile: just show active tab badge */}
              <div className="sm:hidden px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0" style={{ background: cfg.hqColor, color: '#111009' }}>
                Dashboard
              </div>
            </div>
          </div>

          {/* HQ Stats — 2×2 on mobile, 4 across on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-token border-b border-border-token">
            {[
              { label: 'Active Players', value: cfg.stores[0].players.toString(), icon: '👥', color: cfg.hqColor },
              { label: 'Check-ins This Week', value: cfg.stores[0].weekCheckins.toString(), icon: '📅', color: '#34d399' },
              { label: 'Events Running', value: cfg.stores[0].events.toString(), icon: '🎮', color: '#60a5fa' },
              { label: 'Prizes Redeemed', value: cfg.stores[0].redemptions.toString(), icon: '🛍️', color: '#f59e0b' },
            ].map((stat, i) => (
              <div key={stat.label} className={cn('p-4 sm:p-5', i === 1 ? 'border-l sm:border-l-0 border-border-token' : '')}>
                <div className="text-xs text-tertiary mb-1 leading-tight">{stat.label}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</span>
                  <span className="text-sm">{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Top players */}
          <div className="p-4 sm:p-6">
            <div className="text-xs text-tertiary uppercase tracking-wide mb-3">Top Players This Month</div>
            <div className="space-y-2">
              {cfg.leaderboard.slice(0, 3).filter(p => p.store === cfg.hqStoreName).length > 0
                ? cfg.leaderboard.filter(p => p.store === cfg.hqStoreName).slice(0, 3).map((player, i) => (
                    <div key={player.rank} className="flex items-center gap-3 p-3 rounded-xl border border-border-token bg-base">
                      <span className="text-sm font-bold text-tertiary w-4 text-center flex-shrink-0">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cfg.hqColor}20` }}>🎮</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-primary text-sm">{player.name}</div>
                        <div className="text-xs text-tertiary">{cfg.hqPrefix}-AXR00{i + 1}</div>
                      </div>
                      <div className="font-bold text-sm flex-shrink-0" style={{ color: cfg.hqColor }}>{player.xp.toLocaleString()} pts</div>
                    </div>
                  ))
                : cfg.leaderboard.slice(0, 3).map((player, i) => (
                    <div key={player.rank} className="flex items-center gap-3 p-3 rounded-xl border border-border-token bg-base">
                      <span className="text-sm font-bold text-tertiary w-4 text-center flex-shrink-0">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cfg.hqColor}20` }}>🎮</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-primary text-sm">{player.name}</div>
                        <div className="text-xs text-tertiary">{cfg.hqPrefix}-{['AXR001','MRD042','TWK019'][i]}</div>
                      </div>
                      <div className="font-bold text-sm flex-shrink-0" style={{ color: cfg.hqColor }}>{player.xp.toLocaleString()} pts</div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </Section>

      {/* ── Company overview ── */}
      <Section id="company">
        <div className="text-center mb-10">
          <SectionLabel>Company overview</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            All {cfg.stores.length} stores. One view.
          </h2>
          <p className="text-secondary max-w-lg mx-auto">
            As company leadership, you see everything — every store&apos;s active players, this week&apos;s check-ins, and top performers. Store managers only see their own location.
          </p>
        </div>

        {/* Store filter pills */}
        <div className="flex gap-2 flex-wrap justify-center mb-6">
          <button
            onClick={() => setActiveStoreId('all')}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all"
            style={activeStoreId === 'all' ? { border: '1px solid rgba(196,181,253,0.5)', color: '#c4b5fd', background: 'rgba(196,181,253,0.1)' } : { borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
          >
            All
          </button>
          {cfg.stores.map(store => (
            <button
              key={store.id}
              onClick={() => setActiveStoreId(store.id)}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all"
              style={activeStoreId === store.id ? { border: `1px solid ${store.color}50`, color: store.color, background: `${store.color}10` } : { borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
            >
              {store.city}
            </button>
          ))}
        </div>

        {/* Store cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {cfg.stores.map(store => {
            const isActive = activeStoreId === store.id || activeStoreId === 'all';
            return (
              <div
                key={store.id}
                onClick={() => setActiveStoreId(store.id)}
                className="rounded-2xl border p-5 cursor-pointer transition-all hover:-translate-y-1"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: isActive ? `${store.color}40` : 'var(--border)',
                  opacity: isActive ? 1 : 0.5,
                  boxShadow: isActive ? `0 0 20px ${store.color}08` : 'none',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: store.color }}>{store.prefix}</div>
                    <div className="font-bold text-primary text-sm">{store.name}</div>
                    <div className="text-xs text-tertiary">{store.city}, {store.state}</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `${store.color}20` }}>🏪</div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <div className="text-lg font-bold text-primary">{store.players}</div>
                    <div className="text-[10px] text-tertiary">Players</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold" style={{ color: store.color }}>{store.weekCheckins}</div>
                    <div className="text-[10px] text-tertiary">This week</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary">{store.events}</div>
                    <div className="text-[10px] text-tertiary">Events</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs border-t border-border-token pt-3">
                  <span className="text-tertiary flex-shrink-0">Top:</span>
                  <span className="font-semibold text-primary truncate">{store.topPlayer.name}</span>
                  <span className="ml-auto font-bold flex-shrink-0" style={{ color: store.color }}>{store.topPlayer.xp.toLocaleString()} pts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Company leaderboard */}
        <div className="rounded-2xl border border-border-token overflow-hidden bg-elevated">
          <div className="px-4 sm:px-6 py-4 border-b border-border-token">
            <div className="font-bold text-primary text-sm">{cfg.companyName} · Company Leaderboard</div>
            <div className="text-xs text-tertiary">Top players across all {cfg.stores.length} stores</div>
          </div>
          <div className="divide-y divide-border-token">
            {cfg.leaderboard.map(player => (
              <div key={player.rank} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: player.rank <= 3 ? `${rankColors[player.rank - 1]}30` : 'var(--bg-base)',
                    color: player.rank <= 3 ? rankColors[player.rank - 1] : 'var(--text-tertiary)',
                  }}
                >
                  {player.rank}
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: `${player.color}20` }}>🎮</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-primary text-sm">{player.name}</div>
                  <div className="text-xs truncate" style={{ color: player.color }}>{player.store}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-primary text-sm">{player.xp.toLocaleString()}</div>
                  <div className="text-[10px] text-tertiary">Company XP</div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 sm:px-6 py-4 border-t border-border-token bg-base">
            <p className="text-xs text-tertiary text-center">
              Company XP = sum of all store XP. Being #1 at any store puts you in the company top 10.
            </p>
          </div>
        </div>
      </Section>

      {/* ── How it works ── */}
      <Section dark>
        <div className="text-center mb-10">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Launches in a weekend
          </h2>
          <p className="text-secondary max-w-lg mx-auto">
            No servers to manage, no software to install. Players sign up via QR code at your register.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {[
            { step: '01', title: 'Configure your store', desc: 'Set your store name, currency, and Player ID prefix in HQ settings. Takes 5 minutes.', color: '#c4b5fd' },
            { step: '02', title: 'Players sign up', desc: 'QR code at the register or table. Players create an account and get their store ID instantly.', color: '#60a5fa' },
            { step: '03', title: 'Staff runs events normally', desc: 'One button to award XP at check-in. No training. No setup. No configuration.', color: '#34d399' },
          ].map(step => (
            <div key={step.step} className="rounded-2xl border border-border-token p-5 sm:p-6 bg-elevated">
              <div className="text-3xl font-bold mb-3" style={{ color: step.color, fontFamily: 'var(--font-display)' }}>{step.step}</div>
              <div className="font-bold text-primary mb-2">{step.title}</div>
              <div className="text-secondary text-sm leading-relaxed">{step.desc}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'No app install for staff', 'Works on any phone',
            'Real-time XP updates', 'Automatic daily reminders',
            'Prize wall you control', 'Per-store leaderboards',
            'Company-wide rankings', 'Multi-store dashboard',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-secondary">
              <span className="text-green-400">✓</span>
              {item}
            </div>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-24 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(196,181,253,0.06) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-bold text-primary mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {cfg.ctaHeadline}
          </h2>
          <p className="text-secondary text-base sm:text-lg mb-10 leading-relaxed">{cfg.ctaBody}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={cfg.ctaPrimaryHref}
              className="px-8 py-4 rounded-xl font-bold text-base transition-opacity hover:opacity-90"
              style={{ background: '#c4b5fd', color: '#111009' }}
            >
              {cfg.ctaPrimaryLabel}
            </a>
            <a
              href={cfg.ctaSecondaryHref}
              className="px-8 py-4 rounded-xl font-bold text-base transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#f2efe8', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              {cfg.ctaSecondaryLabel}
            </a>
          </div>
          <p className="text-tertiary text-sm mt-8">{cfg.ctaByline}</p>
        </div>
      </section>

      {/* ── Sticky nav (desktop only) ── */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden sm:flex">
        <div className="flex items-center gap-1 px-3 py-2 rounded-2xl border border-border-token shadow-2xl bg-surface">
          {[
            { href: '#player', label: 'Players' },
            { href: '#prizewall', label: 'Prizes' },
            { href: '#staff', label: 'Staff' },
            { href: '#hq', label: 'HQ' },
            { href: '#company', label: `${cfg.companyName.split(' ')[0]} View` },
          ].map(link => (
            <a key={link.href} href={link.href} className="px-3 py-1.5 rounded-xl text-xs font-medium text-tertiary hover:text-primary hover:bg-elevated transition-all">
              {link.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
