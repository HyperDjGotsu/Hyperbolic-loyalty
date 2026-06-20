'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  GlowButton,
  GameXpCard,
  StatCard,
} from '@/components/ui';
import { BannerCarousel } from '@/components/BannerCarousel';
import { DailyGacha } from '@/components/DailyGacha';
import { CheckInModal } from '@/components/CheckInModal';
import { CardOfTheDayCompact } from '@/components/CardOfTheDay';
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
  // Monthly attendance tracking (Pirate's Life / Hyperlife)
  monthlyAttendance?: number;
  monthlyThreshold?: number;
  monthlyBonus?: number;
  earnedMonthlyBonus?: boolean;
  achievementName?: string;
}

// Game icons and colors for display
const GAME_CONFIG: Record<string, { icon: string; color: string }> = {
  one_piece: { icon: '🏴‍☠️', color: '#E63946' },
  gundam: { icon: '🤖', color: '#3B82F6' },
  pokemon: { icon: '⚡', color: '#FACC15' },
  mtg: { icon: '✨', color: '#8B5CF6' },
  star_wars: { icon: '🌟', color: '#00d4ff' },
  star_wars_unlimited: { icon: '🌟', color: '#00d4ff' },
  vanguard: { icon: '⚔️', color: '#ef4444' },
  uvs: { icon: '👊', color: '#f97316' },
  hololive: { icon: '🎤', color: '#ff69b4' },
  riftbound: { icon: '🌀', color: '#22c55e' },
  lorcana: { icon: '🪄', color: '#EC4899' },
  yugioh: { icon: '🃏', color: '#9333ea' },
  digimon: { icon: '🦖', color: '#f59e0b' },
  weiss_schwarz: { icon: '🎴', color: '#6366f1' },
  weiss: { icon: '🎴', color: '#6366f1' },
  union_arena: { icon: '🏟️', color: '#14b8a6' },
  warhammer: { icon: '⚔️', color: '#dc2626' },
  sw_legion: { icon: '🎖️', color: '#059669' },
  general: { icon: '🎮', color: '#64748b' },
};

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-elevated rounded w-32 mb-2"></div>
      <div className="h-4 bg-elevated rounded w-24"></div>
    </div>
  );
}

// Static counter component (replaces GSAP animated counter)
function StaticCounter({ value }: { value: number }) {
  return <span>{value.toLocaleString()}</span>;
}

export default function MobileDashboard() {
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
  const [banners, setBanners] = useState<Banner[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<string[]>([]);

  const gamesContainerRef = useRef<HTMLDivElement>(null);
  const activityContainerRef = useRef<HTMLDivElement>(null);

  // Load favorite games
  useEffect(() => {
    async function loadFavorites() {
      try {
        const res = await fetch('/api/player/favorite-games');
        if (res.ok) {
          const data = await res.json();
          if (data.favorites && data.favorites.length > 0) {
            setFavoriteGames(data.favorites);
          }
        }
      } catch (error) {
        console.error('Error loading favorite games:', error);
      }
    }
    if (isLoaded && user) {
      loadFavorites();
    }
  }, [isLoaded, user]);

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

  // Load check-in and spin status when player is loaded
  useEffect(() => {
    async function loadDailyStatus() {
      if (!playerData || !user) return;
      
      try {
        // Check check-in status
        const checkinRes = await fetch('/api/xp/checkin');
        if (checkinRes.ok) {
          const checkinData = await checkinRes.json();
          setHasCheckedInToday(checkinData.hasCheckedInToday || false);
        }
        
        // Check spin status
        const spinRes = await fetch('/api/xp/daily-spin');
        if (spinRes.ok) {
          const spinData = await spinRes.json();
          setHasSpunToday(spinData.hasSpunToday || false);
        }
      } catch (error) {
        console.error('Error loading daily status:', error);
      }
    }
    
    loadDailyStatus();
  }, [playerData, user]);

  // Load banners for carousel
  useEffect(() => {
    async function loadBanners() {
      try {
        const res = await fetch('/api/banners');
        if (res.ok) {
          const data = await res.json();
          // Transform to match Banner type expected by BannerCarousel
          const transformedBanners = (data.banners || []).map((b: any) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle || '',
            // Pass actual color values for inline style gradient
            colorFrom: b.colorFrom || '#8b5cf6',
            colorTo: b.colorTo || '#ec4899',
            icon: b.icon || '🎮',
            badge: b.badge || '',
            hasStream: b.hasStream || false,
            twitchUrl: b.twitchUrl,
            youtubeUrl: b.youtubeUrl,
            backgroundImage: b.backgroundImage || b.background_image || null,
          }));
          setBanners(transformedBanners);
        }
      } catch (error) {
        console.error('Error loading banners:', error);
      }
    }
    loadBanners();
  }, []);

  // Derive display values from real data
  const totalXp = playerData?.xp || 0;
  const level = Math.floor(totalXp / 100) + 1;
  const levelProgress = (totalXp % 100);
  const nextLevelXp = level * 100;

  // Transform game XP data for display (now includes monthly attendance)
  const games: GameDisplay[] = (playerData?.gameXP || [])
    .filter((gxp: any) => gxp && gxp.game_id)
    .map((gxp: any) => {
      const slug = gxp.game_id || 'unknown';
      const config = GAME_CONFIG[slug] || { icon: '🎮', color: '#64748b' };
      const xpValue = gxp.game_xp || gxp.total_xp || gxp.xp || 0;
      return {
        id: slug,
        name: slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        xpName: gxp.xpName || (slug === 'one_piece' ? 'Berries' : 'XP'),
        icon: config.icon,
        xp: xpValue,
        level: Math.floor(xpValue / 50) + 1,
        color: config.color,
        rank: gxp.rank || 'Newcomer',
        // Pass monthly attendance data
        monthlyAttendance: gxp.monthlyAttendance || 0,
        monthlyThreshold: gxp.monthlyThreshold || (slug === 'one_piece' ? 6 : 3),
        monthlyBonus: gxp.monthlyBonus || 30,
        earnedMonthlyBonus: gxp.earnedMonthlyBonus || false,
        achievementName: gxp.achievementName || (slug === 'one_piece' ? "Pirate's Life" : 'Hyperlife'),
      };
    });

  // Filter to favorite games (if any), sort by XP, show top 3
  const filteredGames = favoriteGames.length > 0
    ? games
        .filter(g => favoriteGames.includes(g.id))
        .sort((a, b) => b.xp - a.xp)
    : games.sort((a, b) => b.xp - a.xp);
  
  const displayedGames: GameDisplay[] = showAllGames ? filteredGames : filteredGames.slice(0, 3);
  
  // Count for "View All" button - show total favorites or total games
  const totalGamesCount = favoriteGames.length > 0 ? filteredGames.length : games.length;

  // Transform activity for display
  const recentActivity = (playerData?.recentActivity || []).map((a: any) => ({
    id: a.id,
    text: a.description || a.source?.replace(/_/g, ' ') || 'XP Earned',
    xp: a.final_xp || a.base_xp || 0,
    time: new Date(a.created_at).toLocaleDateString(),
    icon: '⭐',
  }));

  // Handle gacha completion
  const handleGachaComplete = () => {
    setHasSpunToday(true);
  };

  // Handle check-in completion
  const handleCheckInComplete = () => {
    setHasCheckedInToday(true);
    // Optionally refresh player data
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
    type: (avatar.photoUrl || avatar.photo_url) ? 'photo' as const : 'emoji' as const,
    base: avatar.base || avatar.emoji || '😎',
    photoUrl: avatar.photoUrl || avatar.photo_url || null,
    background: avatar.background || '#3b82f6',
    frame: avatar.frame || 'none',
    badge: avatar.badge || null,
  };

  return (
    <div className="min-h-full pb-4">
      {/* Header with Player Card */}
      <div className="relative bg-base pt-4 pb-6">
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="text-2xl font-black text-secondary font-display">
            HYPERBOLIC
          </div>
          <div className="text-orange-400 text-xs font-bold tracking-widest">— GAMES —</div>
        </div>

        {/* Player Card */}
        <div className="mx-4">
          <div className="card p-4 shadow-xl">
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
                  <span className="text-secondary text-xs font-mono">{playerData?.hyp_id}</span>
                </div>
                <div className="text-secondary text-sm">Level {level} Player</div>
                <div className="mt-2">
                  <div className="h-2 bg-border-token rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-tertiary">XP to next level</span>
                    <span className="text-secondary font-mono">
                      <StaticCounter value={totalXp} /> / {nextLevelXp.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-3 mt-4 pt-3 border-t border-token">
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
      {banners.length > 0 && (
        <div className="mt-4">
          <BannerCarousel banners={banners} />
        </div>
      )}

      {/* Card of the Day */}
      <div className="mx-4 mt-4">
        <CardOfTheDayCompact />
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
            {favoriteGames.length > 0 && (
              <span className="text-xs text-slate-500 font-normal">(Favorites)</span>
            )}
          </h2>
          {totalGamesCount > 3 && (
            <button
              onClick={() => setShowAllGames(!showAllGames)}
              className="text-secondary text-sm"
            >
              {showAllGames ? 'Show Less' : `View All (${totalGamesCount})`}
            </button>
          )}
        </div>
        {filteredGames.length > 0 ? (
          <div className="space-y-2" ref={gamesContainerRef}>
            {displayedGames.map((game) => (
              <div key={game.id} className="game-card">
                <GameXpCard
                  game={game}
                  isExpanded={expandedGame === game.id}
                  onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <div className="text-3xl mb-2">🎮</div>
            <p>No game XP yet - attend events to start earning!</p>
          </div>
        )}
        <div className="mt-3 card p-3">
          <div className="flex justify-between items-center">
            <span className="text-tertiary text-sm">Total Combined XP</span>
            <span className="xp-number text-xl">
              <StaticCounter value={totalXp} />
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
          <div className="space-y-2" ref={activityContainerRef}>
            {recentActivity.map((a: any) => (
              <div
                key={a.id}
                className="activity-item card p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-xl">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate">{a.text}</div>
                  <div className="text-slate-500 text-xs">{a.time}</div>
                </div>
                <div className={`font-bold text-sm ${a.xp >= 0 ? 'text-xp' : 'text-danger'}`}>
                  {a.xp >= 0 ? '+' : ''}{a.xp}
                </div>
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
