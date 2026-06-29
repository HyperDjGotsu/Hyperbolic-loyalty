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

/* ── HQ mock with interactive tabs ── */
type HQTab = 'Dashboard' | 'Events' | 'Players' | 'Shop' | 'Settings';

function HQSection({ cfg, rankColors }: { cfg: PitchConfig; rankColors: string[] }) {
  const [activeTab, setActiveTab] = useState<HQTab>('Dashboard');
  const store = cfg.stores[0];
  const tabs: HQTab[] = ['Dashboard', 'Events', 'Players', 'Shop', 'Settings'];

  const mockEvents = [
    { name: 'One Piece Weekly', day: 'Today', time: '6:00 PM', players: 18, status: 'live' },
    { name: 'Pokemon League', day: 'Tomorrow', time: '2:00 PM', players: 24, status: 'upcoming' },
    { name: 'MTG Commander Night', day: 'Fri', time: '6:00 PM', players: 12, status: 'upcoming' },
    { name: 'Gundam Card Game', day: 'Sat', time: '4:00 PM', players: 8, status: 'upcoming' },
    { name: 'SWU Weekly', day: 'Thu', time: '6:00 PM', players: 10, status: 'upcoming' },
  ];

  const mockPlayers = [
    { name: 'Alex R.', id: `${cfg.hqPrefix}-AXR001`, xp: 4820, game: 'MTG', checkins: 52, status: 'active' },
    { name: 'Marcus D.', id: `${cfg.hqPrefix}-MRD042`, xp: 3100, game: 'One Piece', checkins: 38, status: 'active' },
    { name: 'Taylor W.', id: `${cfg.hqPrefix}-TWK019`, xp: 2090, game: 'Pokemon', checkins: 29, status: 'active' },
    { name: 'Jordan S.', id: `${cfg.hqPrefix}-JRS007`, xp: 1540, game: 'Gundam', checkins: 21, status: 'active' },
    { name: 'Casey M.', id: `${cfg.hqPrefix}-CMQ033`, xp: 980, game: 'SWU', checkins: 14, status: 'inactive' },
  ];

  const mockPrizes = cfg.prizes.map(p => ({ ...p, active: true, redeemed: Math.floor(Math.random() * 15) }));

  return (
    <Section id="hq" dark>
      <div className="text-center mb-10">
        <SectionLabel>Store HQ</SectionLabel>
        <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          What store managers see
        </h2>
        <p className="text-secondary max-w-lg mx-auto">
          Each store has its own HQ dashboard. Click through the tabs to explore what your managers use every day.
        </p>
      </div>

      <div className="rounded-2xl border border-border-token overflow-hidden bg-elevated">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-border-token">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cfg.hqColor}20` }}>🏪</div>
              <div className="min-w-0">
                <div className="font-bold text-primary text-sm truncate">{cfg.hqStoreName} HQ</div>
                <div className="text-xs text-tertiary">{cfg.hqCity} · Staff View</div>
              </div>
            </div>
            {/* Tabs — desktop */}
            <div className="hidden sm:flex gap-1 flex-shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={tab === activeTab ? { background: cfg.hqColor, color: '#111009' } : { color: 'var(--text-tertiary)' }}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Tabs — mobile: scrollable row below header */}
          </div>
          {/* Mobile tab row */}
          <div className="flex gap-1 mt-3 sm:hidden overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={tab === activeTab ? { background: cfg.hqColor, color: '#111009' } : { color: 'var(--text-tertiary)', background: 'var(--bg-base)' }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dashboard tab ── */}
        {activeTab === 'Dashboard' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-token border-b border-border-token">
              {[
                { label: 'Active Players', value: store.players, icon: '👥' },
                { label: 'Check-ins This Week', value: store.weekCheckins, icon: '📅' },
                { label: 'Events Running', value: store.events, icon: '🎮' },
                { label: 'Prizes Redeemed', value: store.redemptions, icon: '🛍️' },
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
            <div className="p-4 sm:p-6">
              <div className="text-xs text-tertiary uppercase tracking-wide mb-3">Top Players This Month</div>
              <div className="space-y-2">
                {cfg.leaderboard.slice(0, 3).map((player, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border-token bg-base">
                    <span className="text-sm font-bold text-tertiary w-4 text-center flex-shrink-0">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cfg.hqColor}20` }}>🎮</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-primary text-sm">{player.name}</div>
                      <div className="text-xs text-tertiary">{cfg.hqPrefix}-{['AXR001','MRD042','TWK019'][i]}</div>
                    </div>
                    <div className="font-bold text-sm flex-shrink-0" style={{ color: cfg.hqColor }}>{player.xp.toLocaleString()} pts</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Events tab ── */}
        {activeTab === 'Events' && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-tertiary uppercase tracking-wide">This Week's Events</div>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: cfg.hqColor, color: '#111009' }}>
                + New event
              </button>
            </div>
            <div className="space-y-2">
              {mockEvents.map(ev => (
                <div key={ev.name} className="flex items-center gap-3 p-3 rounded-xl border border-border-token bg-base">
                  <div className="text-xl flex-shrink-0">{ev.status === 'live' ? '🟢' : '📅'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary text-sm">{ev.name}</div>
                    <div className="text-xs text-tertiary">{ev.day} · {ev.time} · {ev.players} players registered</div>
                  </div>
                  {ev.status === 'live' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#22c55e20', color: '#22c55e' }}>LIVE</span>
                  )}
                  <button className="text-xs text-tertiary hover:text-secondary transition-colors flex-shrink-0">Check in →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Players tab ── */}
        {activeTab === 'Players' && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                placeholder={`Search by name or ${cfg.hqPrefix}-ID…`}
                className="flex-1 rounded-xl px-3 py-2 text-sm border border-border-token bg-base text-primary outline-none"
                readOnly
              />
            </div>
            <div className="space-y-2">
              {mockPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border-token bg-base">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cfg.hqColor}20` }}>🎮</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary text-sm">{p.name}</div>
                    <div className="text-xs text-tertiary truncate">{p.id} · {p.game} · {p.checkins} events</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm" style={{ color: cfg.hqColor }}>{p.xp.toLocaleString()}</div>
                    <div className="text-[10px] text-tertiary">pts</div>
                  </div>
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', p.status === 'active' ? 'bg-green-400' : 'bg-tertiary')} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Shop tab ── */}
        {activeTab === 'Shop' && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-tertiary uppercase tracking-wide">Prize Wall Catalog</div>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: cfg.hqColor, color: '#111009' }}>
                + Add prize
              </button>
            </div>
            <div className="space-y-2">
              {mockPrizes.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-border-token bg-base">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${item.color}20` }}>{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary text-sm">{item.name}</div>
                    <div className="text-xs text-tertiary">{item.category} · {item.redeemed} redeemed</div>
                  </div>
                  <div className="font-bold text-sm flex-shrink-0" style={{ color: item.color }}>{item.cost.toLocaleString()} pts</div>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-4 rounded-full relative cursor-pointer" style={{ background: '#22c55e' }}>
                      <div className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Settings tab ── */}
        {activeTab === 'Settings' && (
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {[
                { label: 'Store Name', value: cfg.hqStoreName },
                { label: 'Player ID Prefix', value: cfg.hqPrefix },
                { label: 'Currency Name', value: 'Points' },
                { label: 'City', value: cfg.hqCity },
              ].map(setting => (
                <div key={setting.label} className="flex items-center justify-between p-3 rounded-xl border border-border-token bg-base">
                  <span className="text-sm text-secondary">{setting.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{setting.value}</span>
                    <button className="text-xs text-tertiary hover:text-secondary transition-colors">Edit</button>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-xl border border-border-token bg-base">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-secondary">Notification Crons</span>
                  <span className="text-xs text-green-400 font-medium">● Active</span>
                </div>
                <div className="text-xs text-tertiary space-y-1">
                  <div>Daily spin reminder — 10:00 AM PT</div>
                  <div>Event reminders — 7:00 AM PT day-of</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ── App Tour Slides ── */
function AppPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 260 }}>
      <div className="relative rounded-[36px] overflow-hidden shadow-2xl" style={{ background: '#111009', minHeight: 500, border: '2px solid rgba(255,255,255,0.1)' }}>
        <div className="flex justify-between px-6 pt-3 pb-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>9:41</span><span>●●●</span>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function AppTourSection({ cfg }: { cfg: PitchConfig }) {
  const [slide, setSlide] = useState(0);
  const color = cfg.hqColor;
  const prefix = cfg.hqPrefix;

  const slides = [
    {
      label: 'Home Dashboard',
      title: 'This is what your player sees every time they open the app.',
      body: `Their loyalty ID, their rank, their XP. Everything personal to them — no login friction, no confusion. They know exactly where they stand.`,
      screen: (
        <div className="px-4 pb-4">
          <div className="rounded-2xl p-4 mb-3" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${color}20` }}>🎮</div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{prefix}-AXR001</div>
                <div className="font-bold text-white text-sm">Alex R.</div>
                <div className="text-[11px]" style={{ color }}>Planeswalker · Level 64</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" style={{ color }}>4,820</div>
                <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Points</div>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: '#222018' }}>
              <div className="h-full rounded-full" style={{ width: '76%', background: color }} />
            </div>
            <div className="flex justify-between">
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>180 pts to next rank</span>
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>#3 on leaderboard</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[{ v: '52', l: 'Events' }, { v: '8🔥', l: 'Streak' }, { v: '72%', l: 'Win rate' }].map(s => (
              <div key={s.l} className="rounded-xl p-2 text-center" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-xs font-bold text-white">{s.v}</div>
                <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="rounded-xl py-2.5 text-xs font-bold text-center" style={{ background: color, color: '#111009' }}>🎰 Daily Spin</div>
            <div className="rounded-xl py-2.5 text-xs font-bold text-center" style={{ background: '#222018', color: '#f2efe8', border: '1px solid rgba(255,255,255,0.08)' }}>🛍️ Prize Wall</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl py-2.5 text-xs font-bold text-center" style={{ background: '#222018', color: '#f2efe8', border: '1px solid rgba(255,255,255,0.08)' }}>📅 Events</div>
            <div className="rounded-xl py-2.5 text-xs font-bold text-center" style={{ background: '#222018', color: '#f2efe8', border: '1px solid rgba(255,255,255,0.08)' }}>🏆 Leaderboard</div>
          </div>
        </div>
      ),
    },
    {
      label: 'Events Calendar',
      title: 'Every event at your store, always visible.',
      body: `Players can see what's coming up this week, register interest, and get reminded the day of. No more "I didn't know there was a tournament."`,
      screen: (
        <div className="px-4 pb-4">
          <div className="text-xs font-semibold text-white mb-3">This Week</div>
          {[
            { name: 'One Piece Weekly', day: 'Today', time: '6 PM', players: 18, color: '#E63946', live: true },
            { name: 'Pokemon League', day: 'Sun', time: '2 PM', players: 24, color: '#FACC15', live: false },
            { name: 'MTG Commander', day: 'Fri', time: '6 PM', players: 12, color: '#8B5CF6', live: false },
            { name: 'Gundam Card Game', day: 'Sat', time: '4 PM', players: 8, color: '#3B82F6', live: false },
          ].map(ev => (
            <div key={ev.name} className="flex items-center gap-2.5 p-3 rounded-xl mb-2" style={{ background: '#1a1810', border: `1px solid ${ev.live ? ev.color + '40' : 'rgba(255,255,255,0.07)'}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `${ev.color}20` }}>🎮</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{ev.name}</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{ev.day} · {ev.time} · {ev.players} players</div>
              </div>
              {ev.live
                ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>LIVE</span>
                : <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>+XP</span>}
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Check-in & XP',
      title: 'Staff awards XP. The player gets notified instantly.',
      body: `Staff looks up the player by ID or QR scan, taps "Event Check-in." The player's phone lights up with a notification — they earned 50 XP just for showing up.`,
      screen: (
        <div className="px-4 pb-4">
          {/* Staff check-in view compressed into phone */}
          <div className="rounded-2xl p-4 mb-3" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Staff · Check In</div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3" style={{ background: '#222018', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: `${color}20` }}>🎮</div>
              <div>
                <div className="text-xs font-bold text-white">Alex R.</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{prefix}-AXR001 · 4,820 pts</div>
              </div>
              <div className="ml-auto text-green-400 text-[10px] font-semibold">✓ Found</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Event Check-in', xp: '+50 XP', color },
                { label: 'Match Win', xp: '+25 XP', color: '#34d399' },
              ].map(a => (
                <div key={a.label} className="rounded-xl p-2.5" style={{ background: '#111009', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-[10px] font-semibold text-white">{a.label}</div>
                  <div className="text-xs font-bold mt-0.5" style={{ color: a.color }}>{a.xp}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Player notification */}
          <div className="rounded-2xl p-4" style={{ background: '#1a1810', border: `1px solid ${color}40` }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Player's Phone</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl">⚡</div>
              <div>
                <div className="text-xs font-bold text-white">+50 XP Earned!</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>One Piece Weekly · you're now #3</div>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ background: '#222018' }}>
              <div className="h-full rounded-full transition-all" style={{ width: '82%', background: color }} />
            </div>
            <div className="text-[9px] mt-1 text-right" style={{ color: 'rgba(255,255,255,0.3)' }}>4,870 / 5,000 to Mythic</div>
          </div>
        </div>
      ),
    },
    {
      label: 'Leaderboard',
      title: 'Competition is the retention engine.',
      body: `Players come back because they want to climb. The leaderboard shows their rank, their gap to the person above them, and the top players they're chasing. It resets each month so everyone has a shot.`,
      screen: (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-white">One Piece</div>
            <div className="text-[10px]" style={{ color }}>Resets in 12 days</div>
          </div>
          {[
            { rank: 1, name: 'Alex R.', xp: 4820, you: true },
            { rank: 2, name: 'Marcus D.', xp: 3100, you: false },
            { rank: 3, name: 'Taylor W.', xp: 2090, you: false },
            { rank: 4, name: 'Jordan S.', xp: 1540, you: false },
            { rank: 5, name: 'Casey M.', xp: 980, you: false },
          ].map(p => (
            <div key={p.rank} className="flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5" style={{ background: p.you ? `${color}18` : '#1a1810', border: `1px solid ${p.you ? color + '40' : 'rgba(255,255,255,0.07)'}` }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: p.rank === 1 ? '#FACC1530' : '#222018', color: p.rank === 1 ? '#FACC15' : 'rgba(255,255,255,0.4)' }}>{p.rank}</div>
              <div className="flex-1 text-xs font-semibold text-white">{p.name}{p.you ? ' (you)' : ''}</div>
              <div className="text-xs font-bold" style={{ color: p.you ? color : 'rgba(255,255,255,0.6)' }}>{p.xp.toLocaleString()}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Daily Spin',
      title: 'Free every day. Drives daily opens.',
      body: `Every player gets one free spin at midnight reset. They win Points, XP, or rare cosmetics. This alone brings people back daily — even on days they're not playing.`,
      screen: (
        <div className="px-4 pb-4">
          <div className="text-center mb-3">
            <div className="text-xs font-semibold text-white mb-0.5">Daily Spin</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Resets at midnight · free once a day</div>
          </div>
          <div className="rounded-2xl p-5 text-center mb-3" style={{ background: '#1a1810', border: `1px solid ${color}30` }}>
            <div className="text-5xl mb-3">🎰</div>
            <div className="rounded-xl py-2.5 text-xs font-bold" style={{ background: color, color: '#111009' }}>Spin Now →</div>
          </div>
          <div className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Possible prizes</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: '+50 XP', rarity: 'Common', color: '#60a5fa' },
              { label: '+150 XP', rarity: 'Rare', color },
              { label: 'Gold Frame', rarity: 'Epic', color: '#FACC15' },
              { label: '+25 XP', rarity: 'Common', color: '#60a5fa' },
              { label: 'Badge', rarity: 'Rare', color: '#f472b6' },
              { label: '👑 Title', rarity: 'Legendary', color: '#f59e0b' },
            ].map(p => (
              <div key={p.label} className="rounded-lg p-2 text-center" style={{ background: '#1a1810', border: `1px solid ${p.color}30` }}>
                <div className="text-[10px] font-bold" style={{ color: p.color }}>{p.label}</div>
                <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.rarity}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      label: 'Prize Wall',
      title: 'Points become something players actually want.',
      body: `Cosmetics for their profile — frames, backgrounds, badges, titles. They earn them, show them off, and feel ownership over their loyalty account. You control what's on the wall.`,
      screen: (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-white">Prize Wall</div>
            <div className="text-[10px] font-bold" style={{ color }}>4,820 pts available</div>
          </div>
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {['All', 'Frames', 'Badges', 'Backgrounds', 'Titles'].map((cat, i) => (
              <div key={cat} className="px-2.5 py-1 rounded-lg text-[10px] font-medium flex-shrink-0" style={{ background: i === 0 ? color : '#1a1810', color: i === 0 ? '#111009' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>{cat}</div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cfg.prizes.slice(0, 4).map(item => (
              <div key={item.id} className="rounded-xl p-3" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-[11px] font-bold text-white truncate">{item.name}</div>
                <div className="text-[9px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.category} · {item.rarity}</div>
                <div className="rounded-lg py-1.5 text-center text-[10px] font-bold" style={{ background: `${item.color}20`, color: item.color }}>{item.cost.toLocaleString()} pts</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      label: 'Player Profile',
      title: 'Their identity at your store.',
      body: `Every player has a profile with their ID, their cosmetics, their stats, and their games. The Player ID is how staff finds them — and it's theirs. They'll remember it.`,
      screen: (
        <div className="px-4 pb-4">
          {/* Avatar area */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2" style={{ background: `${color}20`, border: `2px solid ${color}50` }}>🎮</div>
            <div className="font-bold text-white text-sm">Alex R.</div>
            <div className="text-[11px] font-mono mt-0.5" style={{ color }}>
              {prefix}-AXR001
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[{ v: '4,820', l: 'Points' }, { v: '#3', l: 'Rank' }, { v: '52', l: 'Events' }].map(s => (
              <div key={s.l} className="rounded-xl p-2.5 text-center" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-sm font-bold text-white">{s.v}</div>
                <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Equipped cosmetics */}
          <div className="rounded-xl p-3 mb-2" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Equipped</div>
            <div className="flex gap-2">
              {[{ label: 'Golden Frame', icon: '🖼️', color: '#FACC15' }, { label: 'Dragon Badge', icon: '🐉', color: '#E63946' }, { label: 'Emperor', icon: '👑', color: '#f59e0b' }].map(c => (
                <div key={c.label} className="flex-1 rounded-lg p-2 text-center" style={{ background: '#222018' }}>
                  <div className="text-lg">{c.icon}</div>
                  <div className="text-[8px]" style={{ color: c.color }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Member since Jan 2025 · 8-win streak 🔥</div>
          </div>
        </div>
      ),
    },
    {
      label: 'Notifications',
      title: 'The app keeps players engaged between visits.',
      body: `Daily spin reminders, event announcements, XP confirmations. Players stay connected to the store even when they're not there — which means they show up more.`,
      screen: (
        <div className="px-4 pb-4">
          <div className="text-xs font-semibold text-white mb-3">Notifications</div>
          {[
            { icon: '🎰', title: 'Daily spin ready!', body: "Don't leave Points on the table — spin now.", time: '2m ago', color },
            { icon: '📣', title: 'New event announced', body: 'One Piece Regional — Sat Jan 25 · 12 PM', time: '1h ago', color: '#E63946' },
            { icon: '⚡', title: 'XP Earned', body: '+50 XP from Pokemon League check-in', time: '2d ago', color: '#FACC15' },
            { icon: '🏆', title: 'Rank up!', body: "You've reached Planeswalker rank in MTG", time: '3d ago', color: '#8B5CF6' },
            { icon: '🛍️', title: 'New prize added', body: 'Holographic Frame now on the Prize Wall', time: '5d ago', color: '#34d399' },
          ].map(n => (
            <div key={n.title} className="flex items-start gap-2.5 p-2.5 rounded-xl mb-2" style={{ background: '#1a1810', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5" style={{ background: `${n.color}20` }}>{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-white">{n.title}</div>
                <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{n.body}</div>
              </div>
              <div className="text-[9px] flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{n.time}</div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const total = slides.length;
  const current = slides[slide];

  return (
    <section id="tour" className="py-16 sm:py-20 px-5 bg-surface border-b border-border-token">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <SectionLabel>App walkthrough</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
            Slide by slide
          </h2>
          <p className="text-secondary max-w-lg mx-auto">
            Walk through every screen your players will use. Use the arrows or dot navigation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Phone */}
          <div className="order-2 lg:order-1 flex justify-center">
            <AppPhone key={slide}>{current.screen}</AppPhone>
          </div>

          {/* Narrative */}
          <div className="order-1 lg:order-2">
            {/* Slide label */}
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color }}>
              {slide + 1} of {total} · {current.label}
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-primary mb-4 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {current.title}
            </h3>
            <p className="text-secondary text-base leading-relaxed mb-8">
              {current.body}
            </p>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSlide(s => Math.max(0, s - 1))}
                disabled={slide === 0}
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-border-token text-primary hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ←
              </button>
              <div className="flex gap-1.5 flex-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    className="rounded-full transition-all"
                    style={{
                      width: i === slide ? 24 : 8,
                      height: 8,
                      background: i === slide ? color : 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => setSlide(s => Math.min(total - 1, s + 1))}
                disabled={slide === total - 1}
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-border-token text-primary hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                →
              </button>
            </div>

            {/* Slide titles quick-jump */}
            <div className="mt-6 flex flex-wrap gap-2">
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={i === slide
                    ? { background: `${color}20`, color, border: `1px solid ${color}40` }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const PITCH_STORAGE_KEY = 'hxp_pitch_config';

/* ── Shared pitch UI — used by /pitch and /pitch/[slug] ── */
export default function PitchContent({ cfg: defaultCfg }: { cfg: PitchConfig }) {
  const [cfg, setCfg] = useState(defaultCfg);
  const [activeStoreId, setActiveStoreId] = useState(defaultCfg.stores[0].id);

  // Load localStorage override on mount (set by /pitch/edit)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PITCH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PitchConfig;
        setCfg(parsed);
        setActiveStoreId(parsed.stores[0]?.id ?? defaultCfg.stores[0].id);
      }
    } catch { /* ignore corrupt storage */ }
  }, [defaultCfg.stores]);

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

      {/* ── App tour ── */}
      <AppTourSection cfg={cfg} />

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
      <HQSection cfg={cfg} rankColors={rankColors} />

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
