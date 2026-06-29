'use client';

import { useState, useEffect, useRef } from 'react';

/* ── tiny helpers ── */
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

/* ── Store data for GGC ── */
const GGC_STORES = [
  {
    id: 'tem',
    name: 'Trade Emporium',
    city: 'Martinez',
    prefix: 'TEM',
    color: '#c4b5fd',
    players: 184,
    weekCheckins: 61,
    topPlayer: { name: 'Alex R.', xp: 4_820, rank: '#1' },
    events: 5,
    redemptions: 23,
  },
  {
    id: 'gob',
    name: 'Games of Benicia',
    city: 'Benicia',
    prefix: 'GOB',
    color: '#60a5fa',
    players: 97,
    weekCheckins: 34,
    topPlayer: { name: 'Jordan K.', xp: 3_290, rank: '#1' },
    events: 3,
    redemptions: 11,
  },
  {
    id: 'gop',
    name: 'Games of Pinole',
    city: 'Pinole',
    prefix: 'GOP',
    color: '#34d399',
    players: 72,
    weekCheckins: 22,
    topPlayer: { name: 'Sam L.', xp: 2_140, rank: '#1' },
    events: 2,
    redemptions: 7,
  },
  {
    id: 'ggc4',
    name: 'Trade Emporium East',
    city: 'Walnut Creek',
    prefix: 'TWC',
    color: '#fb923c',
    players: 55,
    weekCheckins: 18,
    topPlayer: { name: 'Casey M.', xp: 1_870, rank: '#1' },
    events: 2,
    redemptions: 4,
  },
  {
    id: 'ggc5',
    name: 'Games of Concord',
    city: 'Concord',
    prefix: 'GOC',
    color: '#f472b6',
    players: 43,
    weekCheckins: 12,
    topPlayer: { name: 'Riley T.', xp: 1_340, rank: '#1' },
    events: 1,
    redemptions: 3,
  },
];

const COMPANY_LEADERBOARD = [
  { rank: 1, name: 'Alex R.', store: 'Trade Emporium', xp: 4_820, prefix: 'TEM', color: '#c4b5fd' },
  { rank: 2, name: 'Jordan K.', store: 'Games of Benicia', xp: 3_290, prefix: 'GOB', color: '#60a5fa' },
  { rank: 3, name: 'Marcus D.', store: 'Trade Emporium', xp: 3_100, prefix: 'TEM', color: '#c4b5fd' },
  { rank: 4, name: 'Sam L.', store: 'Games of Pinole', xp: 2_140, prefix: 'GOP', color: '#34d399' },
  { rank: 5, name: 'Taylor W.', store: 'Trade Emporium', xp: 2_090, prefix: 'TEM', color: '#c4b5fd' },
];

const PRIZE_ITEMS = [
  { id: 1, name: 'Golden Frame', cost: 500, category: 'Frame', icon: '🖼️', color: '#FACC15', rarity: 'Rare' },
  { id: 2, name: 'Dragon Badge', cost: 300, category: 'Badge', icon: '🐉', color: '#E63946', rarity: 'Uncommon' },
  { id: 3, name: 'Holographic BG', cost: 800, category: 'Background', icon: '✨', color: '#8B5CF6', rarity: 'Epic' },
  { id: 4, name: 'Rookie Badge', cost: 100, category: 'Badge', icon: '🏅', color: '#60A5FA', rarity: 'Common' },
  { id: 5, name: 'Emperor Title', cost: 1500, category: 'Title', icon: '👑', color: '#F59E0B', rarity: 'Legendary' },
  { id: 6, name: 'Neon Frame', cost: 400, category: 'Frame', icon: '💫', color: '#00d4ff', rarity: 'Rare' },
];

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
function PhoneScreen() {
  const [tab, setTab] = useState<'home' | 'spin' | 'shop'>('home');

  return (
    <div className="relative mx-auto" style={{ width: 280 }}>
      {/* Phone chrome */}
      <div
        className="relative rounded-[40px] overflow-hidden shadow-2xl border-[3px] border-white/10"
        style={{ background: '#111009', minHeight: 560 }}
      >
        {/* Status bar */}
        <div className="flex justify-between px-6 pt-3 pb-1 text-[10px] text-white/40">
          <span>9:41</span>
          <span>●●●</span>
        </div>

        {tab === 'home' && (
          <div className="px-4 pb-4">
            {/* Player card */}
            <div className="rounded-2xl border border-white/10 p-4 mb-3" style={{ background: '#1a1810' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#c4b5fd20' }}>
                  🎮
                </div>
                <div>
                  <div className="text-xs text-white/50">TEM-AXR001</div>
                  <div className="font-bold text-white text-sm">Alex R.</div>
                  <div className="text-[11px]" style={{ color: '#c4b5fd' }}>Planeswalker</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xl font-bold" style={{ color: '#c4b5fd' }}>4,820</div>
                  <div className="text-[10px] text-white/40">Points</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#222018' }}>
                <div className="h-full rounded-full" style={{ width: '76%', background: '#c4b5fd' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-white/30">Level 64</span>
                <span className="text-[10px] text-white/30">180 to next rank</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Events', value: '52', icon: '📅' },
                { label: 'Rank', value: '#3', icon: '🏆' },
                { label: 'Streak', value: '8🔥', icon: '' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-2 text-center border border-white/[0.08]" style={{ background: '#1a1810' }}>
                  <div className="text-sm font-bold text-white">{s.value}</div>
                  <div className="text-[9px] text-white/40">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTab('spin')}
                className="rounded-xl py-2.5 text-xs font-bold border border-white/10"
                style={{ background: '#c4b5fd', color: '#111009' }}
              >
                🎰 Daily Spin
              </button>
              <button
                onClick={() => setTab('shop')}
                className="rounded-xl py-2.5 text-xs font-bold border border-white/10"
                style={{ background: '#222018', color: '#f2efe8' }}
              >
                🛍️ Prize Wall
              </button>
            </div>
          </div>
        )}

        {tab === 'spin' && (
          <div className="px-4 pb-4">
            <button onClick={() => setTab('home')} className="text-white/40 text-xs mb-3">← Back</button>
            <div className="text-center mb-4">
              <div className="text-sm font-bold text-white mb-1">Daily Spin</div>
              <div className="text-[11px] text-white/40">Free once a day — resets at midnight</div>
            </div>
            <div className="rounded-2xl border border-white/10 p-6 text-center mb-4" style={{ background: '#1a1810' }}>
              <div className="text-6xl mb-3">🎰</div>
              <div className="text-xs text-white/50 mb-3">Spin to win Points, XP, or rare cosmetics</div>
              <button
                className="w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: '#c4b5fd', color: '#111009' }}
              >
                Spin Now →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '+50 XP', rarity: 'Common', color: '#60a5fa' },
                { label: '+150 XP', rarity: 'Rare', color: '#c4b5fd' },
                { label: 'Badge!', rarity: 'Epic', color: '#f59e0b' },
              ].map(p => (
                <div key={p.label} className="rounded-lg p-2 text-center border border-white/[0.08]" style={{ background: '#222018' }}>
                  <div className="text-sm font-bold" style={{ color: p.color }}>{p.label}</div>
                  <div className="text-[9px] text-white/30">{p.rarity}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'shop' && (
          <div className="px-4 pb-4">
            <button onClick={() => setTab('home')} className="text-white/40 text-xs mb-3">← Back</button>
            <div className="text-sm font-bold text-white mb-3">Prize Wall</div>
            <div className="grid grid-cols-2 gap-2">
              {PRIZE_ITEMS.slice(0, 4).map(item => (
                <div key={item.id} className="rounded-xl p-3 border border-white/[0.08]" style={{ background: '#1a1810' }}>
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-[11px] font-bold text-white truncate">{item.name}</div>
                  <div className="text-[10px] text-white/40 mb-2">{item.category}</div>
                  <div className="text-xs font-bold" style={{ color: item.color }}>{item.cost} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="flex justify-around py-3 border-t border-white/[0.08]" style={{ background: '#111009' }}>
          {[
            { icon: '🏠', label: 'Home', key: 'home' },
            { icon: '📅', label: 'Events', key: 'events' },
            { icon: '🏆', label: 'Leaderboard', key: 'lb' },
            { icon: '👤', label: 'Profile', key: 'profile' },
          ].map(n => (
            <button key={n.key} className="flex flex-col items-center gap-0.5">
              <span className="text-base">{n.icon}</span>
              <span className="text-[9px] text-white/40">{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Staff check-in widget ── */
function StaffCheckinWidget() {
  const [playerInput, setPlayerInput] = useState('');
  const [state, setState] = useState<'idle' | 'found' | 'done'>('idle');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const handleLookup = () => {
    if (playerInput.trim()) setState('found');
  };

  const handleAward = (action: string) => {
    setSelectedAction(action);
    setState('done');
    setTimeout(() => { setState('idle'); setPlayerInput(''); setSelectedAction(null); }, 3000);
  };

  return (
    <div className="rounded-2xl border border-white/10 p-6" style={{ background: '#1a1810', maxWidth: 420 }}>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">🏷️</span>
        <div>
          <div className="font-bold text-white text-sm">Staff Check-in</div>
          <div className="text-[11px] text-white/40">Award XP in seconds</div>
        </div>
      </div>

      {state === 'idle' && (
        <>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={playerInput}
              onChange={e => setPlayerInput(e.target.value.toUpperCase())}
              placeholder="TEM-XXXXXX"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10 outline-none focus:border-white/30"
              style={{ background: '#222018' }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
            <button
              onClick={handleLookup}
              className="px-4 rounded-xl text-sm font-bold"
              style={{ background: '#c4b5fd', color: '#111009' }}
            >
              Find
            </button>
          </div>
          <div className="text-center text-white/20 text-xs">or scan player QR code</div>
        </>
      )}

      {state === 'found' && (
        <>
          <div className="rounded-xl p-3 mb-4 border border-white/10 flex items-center gap-3" style={{ background: '#222018' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: '#c4b5fd20' }}>🎮</div>
            <div>
              <div className="font-bold text-white text-sm">Alex R.</div>
              <div className="text-xs text-white/40">TEM-AXR001 · Planeswalker · 4,820 pts</div>
            </div>
            <div className="ml-auto text-green-400 text-xs font-semibold">✓ Found</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Event Check-in', xp: '+50 XP', color: '#c4b5fd' },
              { label: 'Match Win', xp: '+25 XP', color: '#34d399' },
              { label: 'Tournament Win', xp: '+100 XP', color: '#FACC15' },
              { label: 'Referral Bonus', xp: '+75 XP', color: '#f472b6' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => handleAward(action.label)}
                className="rounded-xl p-3 text-left border border-white/10 hover:border-white/20 transition-colors"
                style={{ background: '#222018' }}
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
          <div className="text-xs text-white/40">Alex R. has been notified</div>
        </div>
      )}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('py-20 px-5', className)}>
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-semibold uppercase tracking-widest mb-4">
      {children}
    </div>
  );
}

/* ── Main page ── */
export default function PitchPage() {
  const [activeStoreId, setActiveStoreId] = useState('tem');
  const activeStore = GGC_STORES.find(s => s.id === activeStoreId) ?? GGC_STORES[0];

  const totalPlayers = GGC_STORES.reduce((s, g) => s + g.players, 0);
  const totalCheckins = GGC_STORES.reduce((s, g) => s + g.weekCheckins, 0);
  const totalRedemptions = GGC_STORES.reduce((s, g) => s + g.redemptions, 0);

  return (
    <div className="min-h-screen bg-base text-primary" style={{ fontFamily: 'var(--font-sans)' }}>

      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-5 relative overflow-hidden">
        {/* ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(196,181,253,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-semibold uppercase tracking-widest mb-8">
            Gamers Guild Corp · Private Demo
          </div>
          <h1
            className="text-5xl sm:text-6xl font-bold text-primary mb-6 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            The loyalty system your players will actually use
          </h1>
          <p className="text-xl text-secondary mb-4 leading-relaxed max-w-xl mx-auto">
            One platform. Five stores. Every player who walks through any of your doors gets their own loyalty ID and starts earning.
          </p>
          <p className="text-secondary text-sm mb-12">
            Built for TCG game stores. Launched at Trade Emporium.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="#player"
              className="px-8 py-4 rounded-xl font-bold text-base transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
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
      <div className="border-y border-border-token" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-border-token">
          {[
            { label: 'Active Players (GGC)', value: totalPlayers, suffix: '' },
            { label: 'Check-ins This Week', value: totalCheckins, suffix: '' },
            { label: 'Prize Redemptions', value: totalRedemptions, suffix: '' },
            { label: 'Stores Live', value: 5, suffix: '' },
          ].map(stat => (
            <div key={stat.label} className="py-8 px-6 text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                <AnimatedNumber target={stat.value} />
                {stat.suffix}
              </div>
              <div className="text-xs text-tertiary">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 1: Player experience ── */}
      <Section id="player">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
                { icon: '🏷️', title: 'Player ID', desc: 'Every player gets a TEM-XXXXX ID. Staff find them in seconds.' },
                { icon: '⚡', title: 'XP for everything', desc: 'Check-in, match wins, referrals, daily spin — all earn points.' },
                { icon: '🏆', title: 'Leaderboard competition', desc: 'Store rankings keep regulars coming back every week.' },
                { icon: '🔔', title: 'Push notifications', desc: 'Players get reminded about events, spin resets, and new prizes.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: 'var(--bg-elevated)' }}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-primary text-sm">{item.title}</div>
                    <div className="text-secondary text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <PhoneScreen />
          </div>
        </div>
      </Section>

      {/* ── Section 2: Prize Wall ── */}
      <Section id="prizewall" className="bg-surface">
        <div className="text-center mb-12">
          <SectionLabel>Prize wall</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
            The feature that started it all
          </h2>
          <p className="text-secondary max-w-xl mx-auto">
            Players spend their Points on avatar cosmetics — backgrounds, frames, badges, and titles. You control the catalog. Add new prizes any time from HQ.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {PRIZE_ITEMS.map(item => (
            <div
              key={item.id}
              className="rounded-2xl border border-border-token p-5 hover:-translate-y-1 transition-transform cursor-default"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                style={{ background: `${item.color}20` }}
              >
                {item.icon}
              </div>
              <div className="font-bold text-primary text-sm mb-0.5">{item.name}</div>
              <div className="text-xs text-tertiary mb-3">{item.category}</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: item.color }}>{item.cost.toLocaleString()} pts</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${item.color}20`, color: item.color }}
                >
                  {item.rarity}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-accent/20 p-6 text-center" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-secondary text-sm">
            <span className="text-primary font-semibold">You set the prices, you add the prizes.</span> Every store gets its own Prize Wall with its own currency name. Trade Emporium runs on &ldquo;Fragments.&rdquo; Games of Benicia could run on &ldquo;Sparks.&rdquo; Fully white-labeled.
          </p>
        </div>
      </Section>

      {/* ── Section 3: Staff tools ── */}
      <Section id="staff">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
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
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: 'var(--bg-elevated)' }}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-primary text-sm">{item.title}</div>
                    <div className="text-secondary text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <StaffCheckinWidget />
            <p className="text-center text-tertiary text-xs mt-4">Try it — type anything and hit Find</p>
          </div>
        </div>
      </Section>

      {/* ── Section 4: Store HQ ── */}
      <Section id="hq" className="bg-surface">
        <div className="text-center mb-10">
          <SectionLabel>Store HQ</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            What store managers see
          </h2>
          <p className="text-secondary max-w-lg mx-auto">
            Each store has its own HQ dashboard. Managers can manage events, view top players, add prizes, and see this week&apos;s activity at a glance.
          </p>
        </div>

        <div className="rounded-2xl border border-border-token overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          {/* HQ Header */}
          <div className="px-6 py-4 border-b border-border-token flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: '#c4b5fd20' }}>🏪</div>
              <div>
                <div className="font-bold text-primary text-sm">Trade Emporium HQ</div>
                <div className="text-xs text-tertiary">Martinez, CA · Staff View</div>
              </div>
            </div>
            <div className="flex gap-2">
              {['Dashboard', 'Events', 'Players', 'Shop', 'Settings'].map(tab => (
                <button
                  key={tab}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', tab === 'Dashboard' ? 'bg-accent text-accent-fg' : 'text-tertiary hover:text-secondary')}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* HQ Stats */}
          <div className="grid grid-cols-4 divide-x divide-border-token">
            {[
              { label: 'Active Players', value: '184', icon: '👥', color: '#c4b5fd' },
              { label: 'Check-ins This Week', value: '61', icon: '📅', color: '#34d399' },
              { label: 'Events Running', value: '5', icon: '🎮', color: '#60a5fa' },
              { label: 'Prizes Redeemed', value: '23', icon: '🛍️', color: '#f59e0b' },
            ].map(stat => (
              <div key={stat.label} className="p-5">
                <div className="text-xs text-tertiary mb-1">{stat.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">{stat.value}</span>
                  <span className="text-sm">{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Top players table */}
          <div className="p-6">
            <div className="text-xs text-tertiary uppercase tracking-wide mb-3">Top Players This Month</div>
            <div className="space-y-2">
              {[
                { rank: 1, name: 'Alex R.', id: 'TEM-AXR001', xp: 4820, game: 'MTG' },
                { rank: 2, name: 'Marcus D.', id: 'TEM-MRD042', xp: 3100, game: 'One Piece' },
                { rank: 3, name: 'Taylor W.', id: 'TEM-TWK019', xp: 2090, game: 'Pokemon' },
              ].map(player => (
                <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl border border-border-token" style={{ background: 'var(--bg-base)' }}>
                  <span className="text-sm font-bold text-tertiary w-5 text-center">{player.rank}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: '#c4b5fd20' }}>🎮</div>
                  <div className="flex-1">
                    <div className="font-semibold text-primary text-sm">{player.name}</div>
                    <div className="text-xs text-tertiary">{player.id}</div>
                  </div>
                  <div className="text-xs text-tertiary">{player.game}</div>
                  <div className="font-bold text-sm" style={{ color: '#c4b5fd' }}>{player.xp.toLocaleString()} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Section 5: Company overview ── */}
      <Section id="company">
        <div className="text-center mb-10">
          <SectionLabel>Company overview</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            All five stores. One view.
          </h2>
          <p className="text-secondary max-w-lg mx-auto">
            As company leadership, you see everything — every store&apos;s active players, this week&apos;s check-ins, top performers, and company-wide rankings. Store managers only see their own store.
          </p>
        </div>

        {/* Store selector tabs */}
        <div className="flex gap-2 flex-wrap justify-center mb-6">
          <button
            onClick={() => setActiveStoreId('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
              activeStoreId === 'all'
                ? 'border-accent/50 text-accent bg-accent/10'
                : 'border-border-token text-tertiary hover:text-secondary'
            )}
          >
            All Stores
          </button>
          {GGC_STORES.map(store => (
            <button
              key={store.id}
              onClick={() => setActiveStoreId(store.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
                activeStoreId === store.id
                  ? 'border-accent/50 text-accent bg-accent/10'
                  : 'border-border-token text-tertiary hover:text-secondary'
              )}
            >
              {store.city}
            </button>
          ))}
        </div>

        {/* Store cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {GGC_STORES.map(store => (
            <div
              key={store.id}
              onClick={() => setActiveStoreId(store.id)}
              className={cn(
                'rounded-2xl border p-5 cursor-pointer transition-all hover:-translate-y-1',
                activeStoreId === store.id || activeStoreId === 'all'
                  ? 'border-accent/30 shadow-[0_0_20px_rgba(196,181,253,0.05)]'
                  : 'border-border-token opacity-60'
              )}
              style={{ background: 'var(--bg-elevated)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: store.color }}
                  >
                    {store.prefix}
                  </div>
                  <div className="font-bold text-primary text-sm">{store.name}</div>
                  <div className="text-xs text-tertiary">{store.city}, CA</div>
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ background: `${store.color}20` }}
                >
                  🏪
                </div>
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
                <span className="text-tertiary">Top player:</span>
                <span className="font-semibold text-primary">{store.topPlayer.name}</span>
                <span className="ml-auto font-bold" style={{ color: store.color }}>{store.topPlayer.xp.toLocaleString()} pts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Company leaderboard */}
        <div className="rounded-2xl border border-border-token overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div className="px-6 py-4 border-b border-border-token">
            <div className="font-bold text-primary text-sm">Gamers Guild Corp · Company Leaderboard</div>
            <div className="text-xs text-tertiary">Top players across all 5 stores</div>
          </div>
          <div className="divide-y divide-border-token">
            {COMPANY_LEADERBOARD.map(player => (
              <div key={player.rank} className="flex items-center gap-4 px-6 py-4">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    background: player.rank <= 3 ? `${['#FACC15', '#C0C0C0', '#CD7F32'][player.rank - 1]}30` : 'var(--bg-base)',
                    color: player.rank <= 3 ? ['#FACC15', '#a0a0a0', '#CD7F32'][player.rank - 1] : 'var(--text-tertiary)',
                  }}
                >
                  {player.rank}
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: `${player.color}20` }}>
                  🎮
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-primary text-sm">{player.name}</div>
                  <div className="text-xs" style={{ color: player.color }}>{player.store}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{player.xp.toLocaleString()}</div>
                  <div className="text-[10px] text-tertiary">Company XP</div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-border-token" style={{ background: 'var(--bg-base)' }}>
            <p className="text-xs text-tertiary text-center">
              Company XP = sum of all store XP. A player at #1 in any store will naturally appear in the company top 10.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Section 6: How it works operationally ── */}
      <Section className="bg-surface">
        <div className="text-center mb-10">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Launches in a weekend
          </h2>
          <p className="text-secondary max-w-lg mx-auto">
            No servers to manage, no software to install. You get a URL for each store. Players scan a QR code to sign up.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {[
            {
              step: '01',
              title: 'Configure your store',
              desc: 'Set your store name, currency, and Player ID prefix in HQ settings. Takes 5 minutes.',
              color: '#c4b5fd',
            },
            {
              step: '02',
              title: 'Players sign up',
              desc: 'QR code at the register or table. Players create an account and get their store ID instantly.',
              color: '#60a5fa',
            },
            {
              step: '03',
              title: 'Staff runs events normally',
              desc: 'Your staff does what they already do — run events. One button to award XP when someone checks in.',
              color: '#34d399',
            },
          ].map(step => (
            <div key={step.step} className="rounded-2xl border border-border-token p-6" style={{ background: 'var(--bg-elevated)' }}>
              <div className="text-3xl font-bold mb-3" style={{ color: step.color, fontFamily: 'var(--font-display)' }}>
                {step.step}
              </div>
              <div className="font-bold text-primary mb-2">{step.title}</div>
              <div className="text-secondary text-sm leading-relaxed">{step.desc}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'No app install for staff', icon: '✅' },
            { label: 'Works on any phone', icon: '✅' },
            { label: 'Real-time XP updates', icon: '✅' },
            { label: 'Automatic daily reminders', icon: '✅' },
            { label: 'Prize wall you control', icon: '✅' },
            { label: 'Per-store leaderboards', icon: '✅' },
            { label: 'Company-wide rankings', icon: '✅' },
            { label: 'Multi-store dashboard', icon: '✅' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-secondary">
              <span className="text-green-400">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <section className="py-24 px-5 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(196,181,253,0.06) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to launch at Gamers Guild Corp?
          </h2>
          <p className="text-secondary text-lg mb-10 leading-relaxed">
            This is already running. The same system powering Trade Emporium can be live at all five of your stores — with your branding, your prizes, your player IDs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="px-8 py-4 rounded-xl font-bold text-base transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              See the live app →
            </a>
            <a
              href="/hq"
              className="px-8 py-4 rounded-xl font-bold text-base transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#f2efe8', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              View store HQ
            </a>
          </div>
          <p className="text-tertiary text-sm mt-8">
            Built by Darrell · djgotsuai@gmail.com
          </p>
        </div>
      </section>

      {/* ── Sticky nav ── */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden sm:flex">
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-2xl border border-border-token shadow-2xl"
          style={{ background: 'var(--bg-surface)' }}
        >
          {[
            { href: '#player', label: 'Players' },
            { href: '#prizewall', label: 'Prizes' },
            { href: '#staff', label: 'Staff' },
            { href: '#hq', label: 'HQ' },
            { href: '#company', label: 'GGC View' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-tertiary hover:text-primary hover:bg-elevated transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
