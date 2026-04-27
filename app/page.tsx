'use client';

import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';

const FEATURES = [
  {
    label: 'Multi-Game XP',
    desc: 'Track progress across One Piece, Pokémon, MTG, and more. Every event, every win earns you points.',
    accent: '#00c8ea',
    stat: '10+ games',
  },
  {
    label: 'Competitive Seasons',
    desc: 'Monthly seasons crown one Emperor per game. Climb from East Blue Rookie to the top — your legacy stays permanent.',
    accent: '#f4c542',
    stat: 'Monthly resets',
  },
  {
    label: 'Daily Rewards',
    desc: 'Spin for XP every day. Redeem points for cosmetics, badges, and real-world store perks.',
    accent: '#22c55e',
    stat: 'Every day',
  },
];

const GAMES = [
  { name: 'One Piece', color: '#E63946' },
  { name: 'Pokémon', color: '#FACC15' },
  { name: 'Magic: The Gathering', color: '#8B5CF6' },
  { name: 'Lorcana', color: '#EC4899' },
  { name: 'Digimon', color: '#3B82F6' },
  { name: 'Dragon Ball Super', color: '#f97316' },
  { name: 'Gundam', color: '#64748b' },
  { name: 'Star Wars Unlimited', color: '#00c8ea' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#080810] text-white relative overflow-hidden font-rajdhani">

      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 80% 10%, rgba(0,200,234,0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 10% 90%, rgba(0,200,234,0.04) 0%, transparent 50%)
          `,
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div>
          <span className="font-orbitron font-black text-xl text-[#00c8ea] tracking-wider">HYPERBOLIC</span>
          <span className="font-orbitron text-amber-400 text-xs tracking-[0.3em] ml-2">GAMES</span>
        </div>
        <div className="flex items-center gap-4">
          <SignedOut>
            <Link
              href="/sign-in"
              className="text-white/50 hover:text-white text-sm font-medium transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="bg-[#00c8ea] text-[#080810] font-orbitron font-bold text-sm uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-[#00f0ff] transition-colors"
            >
              Join Free
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="bg-[#00c8ea] text-[#080810] font-orbitron font-bold text-sm uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-[#00f0ff] transition-colors"
            >
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left: Text */}
        <div>
          <div className="inline-flex items-center gap-2 bg-[#00c8ea]/10 border border-[#00c8ea]/20 rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00c8ea] animate-pulse" />
            <span className="text-[#00c8ea] text-sm font-medium tracking-wide">Games of Martinez — Benicia, CA</span>
          </div>

          <h1 className="font-orbitron font-black text-5xl lg:text-6xl leading-none tracking-tight mb-6">
            <span className="text-white">LEVEL UP</span>
            <br />
            <span className="text-[#00c8ea]">YOUR TCG</span>
            <br />
            <span className="text-white">JOURNEY</span>
          </h1>

          <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-md">
            Earn XP at every event. Climb the ranks. Compete for Emperor status across 10+ card games — all in one loyalty system built for your local game store.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <SignedOut>
              <Link
                href="/sign-up"
                className="bg-[#00c8ea] text-[#080810] font-orbitron font-bold uppercase tracking-wider px-8 py-4 rounded-xl hover:bg-[#00f0ff] transition-all hover:-translate-y-px text-center"
              >
                Get Started — It&apos;s Free
              </Link>
              <Link
                href="/sign-in"
                className="border border-white/[0.12] text-white/70 font-orbitron font-bold uppercase tracking-wider px-8 py-4 rounded-xl hover:border-white/25 hover:text-white transition-all text-center"
              >
                Sign In
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="bg-[#00c8ea] text-[#080810] font-orbitron font-bold uppercase tracking-wider px-8 py-4 rounded-xl hover:bg-[#00f0ff] transition-all hover:-translate-y-px text-center"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>

        {/* Right: Player card mockup */}
        <div className="hidden lg:flex justify-end">
          <div className="relative w-[340px]">
            {/* Glow behind card */}
            <div className="absolute inset-0 blur-3xl bg-[#00c8ea]/10 rounded-3xl" />

            {/* Card */}
            <div className="relative bg-[#0f0f1a] border border-white/[0.08] rounded-3xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#00c8ea]/50 rounded-t-3xl" />

              {/* Player header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#00c8ea]/10 border border-[#00c8ea]/20 flex items-center justify-center text-2xl">
                  🏴‍☠️
                </div>
                <div>
                  <div className="font-bold text-white">CaptainHyper</div>
                  <div className="text-[#00c8ea] text-xs font-mono">HYP-XXXX00</div>
                </div>
                <div className="ml-auto bg-amber-400/10 border border-amber-400/30 rounded-lg px-2.5 py-1">
                  <span className="text-amber-400 text-xs font-bold font-orbitron">LVL 12</span>
                </div>
              </div>

              {/* XP bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-white/40 mb-2">
                  <span>XP Progress</span>
                  <span>2,840 / 3,000</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-[#00c8ea] rounded-full" />
                </div>
              </div>

              {/* Game stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Events', value: '47' },
                  { label: 'Wins', value: '112' },
                  { label: 'Rank', value: '#3' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.04] rounded-xl p-3 text-center">
                    <div className="text-white font-bold text-lg">{s.value}</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Games */}
              <div className="flex gap-2">
                {[
                  { name: 'OP', color: '#E63946' },
                  { name: 'PKM', color: '#FACC15' },
                  { name: 'MTG', color: '#8B5CF6' },
                ].map((g) => (
                  <div
                    key={g.name}
                    className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-bold font-orbitron"
                    style={{ background: `${g.color}18`, color: g.color, border: `1px solid ${g.color}30` }}
                  >
                    {g.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-20 border-t border-white/[0.06]">
        <div className="mb-12">
          <p className="text-[#00c8ea] font-orbitron text-xs tracking-[0.3em] uppercase mb-3">How it works</p>
          <h2 className="font-orbitron font-black text-3xl text-white">Built for competitive players</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
          {FEATURES.map((f) => (
            <div key={f.label} className="bg-[#080810] p-8 hover:bg-[#0f0f1a] transition-colors">
              <div
                className="text-xs font-orbitron font-bold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full inline-block"
                style={{ color: f.accent, background: `${f.accent}12`, border: `1px solid ${f.accent}25` }}
              >
                {f.stat}
              </div>
              <h3 className="font-orbitron font-bold text-white text-lg mb-3">{f.label}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Games */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-16 border-t border-white/[0.06]">
        <p className="text-white/30 font-orbitron text-xs tracking-[0.3em] uppercase mb-8">Supported Games</p>
        <div className="flex flex-wrap gap-3">
          {GAMES.map((g) => (
            <div
              key={g.name}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.14] transition-colors"
            >
              <div className="w-2 h-2 rounded-full" style={{ background: g.color }} />
              <span className="text-white/70 text-sm">{g.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] px-8 py-8 max-w-7xl mx-auto flex items-center justify-between">
        <span className="font-orbitron text-sm text-white/20 font-bold tracking-wider">HYPERBOLIC GAMES</span>
        <span className="text-white/20 text-sm">© 2026 Hyperbolic Creative</span>
      </footer>
    </div>
  );
}
