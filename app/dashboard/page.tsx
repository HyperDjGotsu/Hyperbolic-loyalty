'use client';

import React, { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  FloatingParticles,
  Avatar,
  GlowButton,
  GameXpCard,
  StatCard,
} from '@/components/ui';
import { BannerCarousel } from '@/components/BannerCarousel';
import { DailyGacha } from '@/components/DailyGacha';
import { CheckInModal } from '@/components/CheckInModal';
import type { Player, ActivityItem, Banner } from '@/lib/types';

// Type for displayed game data
interface GameDisplay {
  id: string;
  name: string;
  xpName: string;
  icon: string;
  xp: number;
  level: number;
  color: string;
  rank: string;
}

// Game icons and colors for display
const GAME_CONFIG: Record<string, { icon: string; color: string }> = {
  one_piece: { icon: '🏴‍☠️', color: '#E63946' },
  gundam: { icon: '🤖', color: '#3B82F6' },
  pokemon: { icon: '⚡', color: '#FACC15' },
  mtg: { icon: '✨', color: '#8B5CF6' },
  star_wars: { icon: '🌟', color: '#00d4ff' },
  vanguard: { icon: '⚔️', color: '#ef4444' },
  uvs: { icon: '👊', color: '#f97316' },
  hololive: { icon: '🎤', color: '#ff69b4' },
  riftbound: { icon: '🌀', color: '#22c55e' },
  lorcana: { icon: '🪄', color: '#EC4899' },
  yugioh: { icon: '🃏', color: '#9333ea' },
  digimon: { icon: '🦖', color: '#f59e0b' },
  weiss_schwarz: { icon: '🎴', color: '#6366f1' },
  union_arena: { icon: '🏟️', color: '#14b8a6' },
  warhammer: { icon: '⚔️', color: '#dc2626' },
  sw_legion: { icon: '🎖️', color: '#059669' },
};

const mockBanners: Banner[] = [
  { id: 1, title: 'ONE PIECE WEEKLY', subtitle: 'Tonight @ 6PM', color: 'from-red-600 to-orange-600', icon: '🏴‍☠️', badge: 'LIVE SOON', hasStream: true },
  { id: 2, title: 'DOUBLE XP WEEKEND', subtitle: 'All Events 2x Points', color: 'from-purple-600 to-pink-600', icon: '⚡', badge: '2 DAYS LEFT', hasStream: false },
  { id: 3, title: 'NEW: LORCANA', subtitle: 'Launch Tournament Friday', color: 'from-pink-600 to-purple-600', icon: '🪄', badge: 'NEW', hasStream: true },
];

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-700 rounded w-32 mb-2"></div>
      <div className="h-4 bg-slate-700 rounded w-24"></div>
    </div>
  );
}

export default function DashboardHome() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<any>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [showAllGames, setShowAllGames] = useState(false);
  const [showGacha, setShowGacha] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  // Load player data on mount
  useEffect(() => {
    async function loadPlayer() {
      if (!isLoaded) return;
      
      // If user is logged in with Clerk, try to get their linked player
      if (user) {
        try {
          const response = await fetch('/api/player/by-clerk');
          const data = await response.json();

          if (data.linked) {
            // Store for future reference
            localStorage.setItem('hyperbolic_player_id', data.hyp_id);
            localStorage.setItem('hyperbolic_player_uuid', data.id);
            setPlayerData(data);
            setLoading(false);
            return;
          } else {
            // User is logged in but hasn't linked a player yet
            router.push('/onboarding');
            return;
          }
        } catch (error) {
          console.error('Error loading player via Clerk:', error);
        }
      }

      // Fallback: try localStorage (for backwards compatibility or non-logged-in access)
      const hypId = localStorage.getItem('hyperbolic_player_id');
      
      if (!hypId) {
        // No player found anywhere, redirect to sign-in or onboarding
        router.push(user ? '/onboarding' : '/sign-in');
        return;
      }

      try {
        const response = await fetch(`/api/player/${hypId}`);
        const data = await response.json();

        if (response.ok && !data.error) {
          setPlayerData(data);
        } else {
          console.error('Failed to load player:', data.error);
          // Clear invalid player ID
          localStorage.removeItem('hyperbolic_player_id');
          localStorage.removeItem('hyperbolic_player_uuid');
          router.push(user ? '/onboarding' : '/sign-in');
        }
      } catch (error) {
        console.error('Error loading player:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPlayer();
  }, [isLoaded, user, router]);

  // Derive display values from real data
  const totalXp = playerData?.xp || 0;
  const level = Math.floor(totalXp / 100) + 1;
  const levelProgress = (totalXp % 100);
  const nextLevelXp = level * 100;

  // Transform game XP data for display
  const games: GameDisplay[] = (playerData?.gameXP || [])
    .filter((gxp: any) => gxp && gxp.game_id)
    .map((gxp: any) => {
      const slug = gxp.game_id || 'unknown';
      const config = GAME_CONFIG[slug] || { icon: '🎮', color: '#64748b' };
      const xpValue = gxp.game_xp || gxp.total_xp || gxp.xp || 0;
      return {
        id: slug,
        name: slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        xpName: slug === 'one_piece' ? 'Bounty' : 'XP',
        icon: config.icon,
        xp: xpValue,
        level: Math.floor(xpValue / 50) + 1,
        color: config.color,
        rank: gxp.rank || 'Newcomer',
      };
    });

  const displayedGames: GameDisplay[] = showAllGames ? games : games.slice(0, 3);

  // Transform activity for display
  const recentActivity: ActivityItem[] = (playerData?.recentActivity || []).map((entry: any, i: number) => {
    const sourceIcons: Record<string, string> = {
      event_attendance: '📍',
      match_win: '🏆',
      purchase: '🛒',
      daily_spin: '🎰',
      referral: '👥',
      achievement: '🎖️',
      check_in: '📍',
      manual_adjustment: '✨',
    };
    return {
      id: i,
      type: entry.source,
      text: entry.description || entry.source.replace(/_/g, ' '),
      xp: entry.final_xp,
      time: new Date(entry.created_at).toLocaleDateString(),
      icon: sourceIcons[entry.source] || '⚡',
    };
  });

  const handleGachaComplete = (result: { xp?: number }) => {
    setHasSpunToday(true);
    if (result.xp && playerData) {
      setPlayerData((prev: any) => ({ ...prev, xp: (prev?.xp || 0) + result.xp! }));
    }
    setShowGacha(false);
  };

  const handleCheckInComplete = (xpEarned: number) => {
    setHasCheckedInToday(true);
    if (playerData) {
      setPlayerData((prev: any) => ({ ...prev, xp: (prev?.xp || 0) + xpEarned }));
    }
    setShowCheckIn(false);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🎮</div>
          <div className="text-slate-400">Loading your profile...</div>
        </div>
      </div>
    );
  }

  const avatar = playerData?.avatar || {};

  const avatarForComponent = {
    type: 'emoji' as const,
    base: avatar.emoji || '😎',
    photoUrl: null,
    background: avatar.background || '#3b82f6',
    frame: avatar.frame || 'none',
    badge: avatar.badge || null,
  };

  return (
    <div className="min-h-full pb-4">
      {/* Header with Player Card */}
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 pt-4 pb-6">
        <FloatingParticles />
        
        {/* Logo + User Button */}
        <div className="relative mb-4">
          <div className="absolute top-0 right-4">
            <UserButton afterSignOutUrl="/" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-orbitron">
              HYPERBOLIC
            </div>
            <div className="text-orange-400 text-xs font-bold tracking-widest">— GAMES —</div>
          </div>
        </div>

        {/* Player Card */}
        <div className="mx-4">
          <div className="bg-slate-800/90 rounded-2xl p-4 border border-cyan-500/30 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar avatar={avatarForComponent} size="md" />
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-slate-800">
                  {level}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-white text-lg font-bold">{playerData?.displayName || 'Player'}</h1>
                  <span className="text-cyan-400 text-xs font-mono">{playerData?.hyp_id}</span>
                </div>
                <div className="text-purple-400 text-sm">Level {level} Player</div>
                <div className="mt-2">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-slate-500">XP to next level</span>
                    <span className="text-cyan-400 font-mono">
                      {totalXp.toLocaleString()} / {nextLevelXp.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-3 mt-4 pt-3 border-t border-slate-700/50">
              <StatCard icon="🎮" label="Games" value={games.length} />
              <StatCard icon="📋" label="Activity" value={recentActivity.length} />
              <StatCard icon="⭐" label="Level" value={level} color="text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 -mt-3 relative z-10 flex gap-3">
        <GlowButton
          color="green"
          onClick={() => setShowCheckIn(true)}
          disabled={hasCheckedInToday}
          className="flex-1 py-4"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">📍</span>
            <span>{hasCheckedInToday ? 'Checked In!' : 'Check In'}</span>
          </div>
        </GlowButton>
        <GlowButton
          color="purple"
          onClick={() => setShowGacha(true)}
          disabled={hasSpunToday}
          className="flex-1 py-4 relative"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">⏳</span>
            <span>{hasSpunToday ? 'Claimed!' : 'Daily Spin'}</span>
          </div>
          {!hasSpunToday && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          )}
        </GlowButton>
      </div>

      {/* Banner Carousel */}
      <div className="mt-4">
        <BannerCarousel banners={mockBanners} />
      </div>

      {/* Battle Pass Banner */}
      {playerData?.passTier && playerData.passTier !== 'none' && (
        <div className="mx-4 mt-4">
          <div className="relative bg-gradient-to-r from-yellow-600/20 via-orange-500/20 to-yellow-600/20 border border-yellow-500/40 rounded-xl p-3 flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <div className="font-bold text-yellow-400 text-sm uppercase">{playerData.passTier} PASS ACTIVE</div>
                <div className="text-yellow-300/60 text-xs">Bonus XP multiplier on all events</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Games */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white flex items-center gap-2">
            <span className="text-xl">🎮</span> My Games
          </h2>
          {games.length > 3 && (
            <button
              onClick={() => setShowAllGames(!showAllGames)}
              className="text-cyan-400 text-sm"
            >
              {showAllGames ? 'Show Less' : `View All (${games.length})`}
            </button>
          )}
        </div>
        {games.length > 0 ? (
          <div className="space-y-2">
            {displayedGames.map((game) => (
              <GameXpCard
                key={game.id}
                game={game}
                isExpanded={expandedGame === game.id}
                onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <div className="text-3xl mb-2">🎮</div>
            <p>No game XP yet - attend events to start earning!</p>
          </div>
        )}
        <div className="mt-3 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-xl p-3 border border-cyan-500/20">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Total Combined XP</span>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {totalXp.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mx-4 mt-6 mb-6">
        <h2 className="font-bold text-white flex items-center gap-2 mb-3">
          <span className="text-xl">📋</span> Recent Activity
        </h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-2">
            {recentActivity.map((a) => (
              <div
                key={a.id}
                className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700/50"
              >
                <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-xl">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate">{a.text}</div>
                  <div className="text-slate-500 text-xs">{a.time}</div>
                </div>
                <div className="text-cyan-400 font-bold text-sm">+{a.xp}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <div className="text-3xl mb-2">📋</div>
            <p>No activity yet - check in to events!</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGacha && (
        <DailyGacha onComplete={handleGachaComplete} onClose={() => setShowGacha(false)} />
      )}
      {showCheckIn && (
        <CheckInModal
          hasCheckedIn={hasCheckedInToday}
          onComplete={handleCheckInComplete}
          onClose={() => setShowCheckIn(false)}
        />
      )}
    </div>
  );
}
