'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-hyper-dark relative overflow-hidden">
      {/* Floating Particles Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              background: ['#22d3ee', '#a855f7', '#ec4899', '#f97316'][Math.floor(Math.random() * 4)],
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 4}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="font-orbitron text-4xl md:text-6xl font-black">
            <span className="text-gradient-cyan">HYPERBOLIC</span>
          </h1>
          <p className="font-orbitron text-lg md:text-xl text-amber-400 tracking-[0.3em] mt-2">
            — GAMES —
          </p>
        </div>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-md">
          Level up your TCG journey
        </p>
        <p className="text-slate-500 mb-12 max-w-lg">
          Earn XP at events, unlock exclusive rewards, track your progress across all your favorite card games.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <SignedOut>
            <Link
              href="/sign-up"
              className="hyper-button px-8 py-4 text-lg"
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-4 text-lg font-orbitron uppercase tracking-wider rounded-xl border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-all"
            >
              Sign In
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="hyper-button px-8 py-4 text-lg"
            >
              Go to Dashboard
            </Link>
          </SignedIn>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl">
          {[
            { icon: '🏴‍☠️', title: 'Multi-Game XP', desc: 'Track progress across One Piece, Pokemon, MTG & more' },
            { icon: '🏆', title: 'Competitive Ranks', desc: 'Climb the leaderboard and earn Emperor status' },
            { icon: '🎁', title: 'Exclusive Rewards', desc: 'Daily spins, cosmetics, and real-world perks' },
          ].map((feature, i) => (
            <div
              key={i}
              className="hyper-card p-6 text-center hover:scale-105 transition-transform"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="font-orbitron text-lg text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Games Preview */}
        <div className="mt-16">
          <p className="text-slate-500 text-sm mb-4 font-orbitron tracking-wider">SUPPORTED GAMES</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: '🏴‍☠️', name: 'One Piece', color: '#E63946' },
              { icon: '⚡', name: 'Pokemon', color: '#FACC15' },
              { icon: '✨', name: 'MTG', color: '#8B5CF6' },
              { icon: '🤖', name: 'Gundam', color: '#3B82F6' },
              { icon: '🪄', name: 'Lorcana', color: '#EC4899' },
              { icon: '🌟', name: 'Star Wars', color: '#00d4ff' },
            ].map((game, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50"
                style={{ borderLeftColor: game.color, borderLeftWidth: '3px' }}
              >
                <span>{game.icon}</span>
                <span className="text-white text-sm">{game.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 text-center text-slate-600 text-sm">
        <p>© 2024 Hyperbolic Creative. All rights reserved.</p>
      </footer>
    </div>
  );
}
