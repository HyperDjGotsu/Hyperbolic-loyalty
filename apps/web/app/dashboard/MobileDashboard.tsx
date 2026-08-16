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
import { CardOfTheDayCompact } from '@/components/CardOfTheDay';
import { GettingStartedCard } from '@/components/GettingStartedCard';
import { PlayerPassCard } from '@/components/PlayerPassCard';
import { StoreSwitcherModal } from '@/components/StoreSwitcherModal';
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
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinMessage, setSpinMessage] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<string[]>([]);
  const [storeConfig, setStoreConfig] = useState({ currency_name: 'Points', currency_icon: '⭐' });
  const [prizeHighlights, setPrizeHighlights] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [storeUpdates, setStoreUpdates] = useState<any[]>([]);
  const [friendActivity, setFriendActivity] = useState<any[]>([]);
  const [passStatus, setPassStatus] = useState<{
    tier: 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';
    lifetimeXp: number;
    prizePoints: number;
    multiplier: number;
  } | null>(null);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  // homeStore: DB-persisted primary store — only changes via explicit "Change Home Store" action
  const [homeStore, setHomeStore] = useState<{
    id: string; name: string; city: string; slug: string;
    is_flagship: boolean; color: string | null;
  } | null>(null);
  // selectedStore: temporary browsing context — controls events, leaderboard, banners, prize wall
  const [selectedStore, setSelectedStore] = useState<{
    id: string; name: string; city: string; slug: string;
    is_flagship: boolean; color: string | null;
  } | null>(null);

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
            localStorage.setItem('hyperbolic_player_id', data.player_id);
            localStorage.setItem('hyperbolic_player_uuid', data.id);
            setPlayerData(data);
            const homeStoreFromDb = data.homeStore ?? null;
            setHomeStore(homeStoreFromDb);

            // Restore selected-store from localStorage (player may have switched stores).
            // Priority: localStorage → homeStore fallback.
            // NEVER overwrite a valid saved selection with homeStore on every load.
            const savedStoreId = localStorage.getItem('ggc_selected_store_id');
            const savedStoreName = localStorage.getItem('ggc_selected_store_name');

            if (savedStoreId && savedStoreName) {
              // Validate: fetch active stores and confirm saved id is still valid
              try {
                const storesRes = await fetch('/api/stores');
                if (storesRes.ok) {
                  const storesData = await storesRes.json();
                  const activeStores: Array<{ id: string; name: string; city: string; slug: string; is_flagship: boolean; color: string | null }> = storesData.stores || [];
                  const matched = activeStores.find((s) => s.id === savedStoreId);
                  if (matched) {
                    // Valid saved selection — use it, don't touch homeStore
                    setSelectedStore(matched);
                    // Refresh the cached name in case it changed
                    localStorage.setItem('ggc_selected_store_name', matched.name);
                  } else {
                    // Saved store no longer active — fall back to homeStore
                    setSelectedStore(homeStoreFromDb);
                    if (homeStoreFromDb) {
                      localStorage.setItem('ggc_selected_store_id', homeStoreFromDb.id);
                      localStorage.setItem('ggc_selected_store_name', homeStoreFromDb.name);
                    } else {
                      localStorage.removeItem('ggc_selected_store_id');
                      localStorage.removeItem('ggc_selected_store_name');
                    }
                  }
                } else {
                  // API error — use homeStore as safe fallback
                  setSelectedStore(homeStoreFromDb);
                }
              } catch {
                setSelectedStore(homeStoreFromDb);
              }
            } else if (homeStoreFromDb) {
              // No saved selection — seed from homeStore
              setSelectedStore(homeStoreFromDb);
              localStorage.setItem('ggc_selected_store_id', homeStoreFromDb.id);
              localStorage.setItem('ggc_selected_store_name', homeStoreFromDb.name);
            } else {
              setSelectedStore(null);
            }

            // Guardrail: legacy players may have no home store yet
            if (!data.homeStoreId) {
              setShowStoreSwitcher(true);
            }
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
      const playerId = localStorage.getItem('hyperbolic_player_id');

      if (!playerId) {
        // No player found anywhere, redirect to sign-in or onboarding
        router.push(user ? '/onboarding' : '/sign-in');
        return;
      }

      try {
        const response = await fetch(`/api/player/${playerId}`);
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

  // Load spin status when player is loaded
  useEffect(() => {
    async function loadSpinStatus() {
      if (!playerData || !user) return;
      try {
        const spinRes = await fetch('/api/xp/daily-spin');
        if (spinRes.ok) {
          const spinData = await spinRes.json();
          setHasSpunToday(!spinData.canSpin);
        }
      } catch (error) {
        console.error('Error loading spin status:', error);
      }
    }
    loadSpinStatus();
  }, [playerData, user]);

  // Load player pass status (tier, dual currency)
  useEffect(() => {
    if (!user) return;
    fetch('/api/player/pass-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPassStatus(data); })
      .catch(() => {});
  }, [user]);

  // Load store config
  useEffect(() => {
    async function loadStoreConfig() {
      try {
        const res = await fetch(`/api/store-config?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setStoreConfig(data);
        }
      } catch (error) {
        console.error('Error loading store config:', error);
      }
    }
    loadStoreConfig();
  }, []);

  useEffect(() => {
    if (!selectedStore?.id) return;
    fetch(`/api/prize-wall?storeId=${selectedStore.id}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setPrizeHighlights((d.items || []).slice(0, 4)))
      .catch(() => {});
  }, [selectedStore?.id]);

  useEffect(() => {
    const storeId = selectedStore?.id || localStorage.getItem('ggc_selected_store_id');
    const url = storeId
      ? `/api/events?status=upcoming&limit=3&store_id=${storeId}`
      : '/api/events?status=upcoming&limit=3';
    fetch(url)
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setUpcomingEvents(d.events || []))
      .catch(() => {});
  }, [selectedStore?.id]);

  useEffect(() => {
    const storeId = selectedStore?.id || localStorage.getItem('ggc_selected_store_id');
    const url = storeId ? `/api/store-updates?store_id=${storeId}` : '/api/store-updates';
    fetch(url)
      .then(r => r.ok ? r.json() : { updates: [] })
      .then(d => setStoreUpdates(d.updates || []))
      .catch(() => {});
  }, [selectedStore?.id]);

  useEffect(() => {
    fetch('/api/friends-activity')
      .then(r => r.ok ? r.json() : { activity: [] })
      .then(d => setFriendActivity(d.activity || []))
      .catch(() => {});
  }, []);

  // Load banners — re-runs when selected store changes so carousel reflects current context:
  // network-wide banners + banners for the selected store
  useEffect(() => {
    async function loadBanners() {
      try {
        const url = selectedStore
          ? `/api/banners?store_id=${selectedStore.id}`
          : '/api/banners';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const transformedBanners = (data.banners || []).map((b: any) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle || '',
            colorFrom: b.colorFrom || '#8b5cf6',
            colorTo: b.colorTo || '#ec4899',
            icon: b.icon || '🎮',
            badge: b.badge || '',
            hasStream: b.hasStream || false,
            twitchUrl: b.twitchUrl,
            youtubeUrl: b.youtubeUrl,
            backgroundImage: b.backgroundImage || b.background_image || null,
            bgSize: b.bgSize || 'cover',
            bgPosition: b.bgPosition || 'center',
          }));
          setBanners(transformedBanners);
        }
      } catch (error) {
        console.error('Error loading banners:', error);
      }
    }
    loadBanners();
  }, [selectedStore?.id]);

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
        name: slug === 'general' ? 'Guild Points' : slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
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

  const handleSpin = async () => {
    if (hasSpunToday || isSpinning) return;
    setIsSpinning(true);
    try {
      const res = await fetch('/api/xp/daily-spin', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setHasSpunToday(true);
        setSpinMessage(`+${data.prize.xp} XP — ${data.prize.label}`);
        setTimeout(() => setSpinMessage(null), 3000);
      }
    } catch (e) {
      console.error('Spin error:', e);
    } finally {
      setIsSpinning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🎮</div>
          <div className="text-secondary">Loading your profile...</div>
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
            Player Pass
          </div>
        </div>

        {/* Player Card */}
        <div className="mx-4">
          <div className="card p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar avatar={avatarForComponent} size="md" />
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-primary text-xs font-bold px-2 py-0.5 rounded-full border-2 border-border-token">
                  {level}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-primary text-lg font-bold">{playerData?.displayName || 'Player'}</h1>
                </div>
                <div className="text-secondary text-sm">Level {level} Player</div>
                <div className="mt-2">
                  <div className="h-2 bg-border-border-token rounded-full overflow-hidden">
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
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border-token">
              <StatCard icon="🎮" label="Games" value={games.length} />
              <StatCard icon="📋" label="Activity" value={recentActivity.length} />
              <StatCard icon={storeConfig.currency_icon} label={storeConfig.currency_name} value={playerData?.gems || 0} color="text-accent" />
            </div>

            {/* Store Context — shows selected (browsing) store, not home store */}
            {(selectedStore || homeStore) && (
              <button
                onClick={() => setShowStoreSwitcher(true)}
                className="mt-3 pt-3 border-t border-border-token w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: (selectedStore ?? homeStore)!.color ?? '#7c3aed' }}
                  />
                  <div>
                    <span className="text-tertiary text-xs">Viewing </span>
                    <span className="text-secondary text-xs font-medium">{(selectedStore ?? homeStore)!.name}</span>
                    {(selectedStore ?? homeStore)!.is_flagship && (
                      <span className="ml-1 text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-1 py-0.5 rounded leading-none">
                        Flagship
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-tertiary text-xs group-hover:text-secondary transition-colors">Switch →</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Store Switcher Modal */}
      {showStoreSwitcher && (
        <StoreSwitcherModal
          currentStoreId={selectedStore?.id ?? null}
          homeStoreId={homeStore?.id ?? null}
          required={!homeStore}
          onSwitch={(store) => {
            if (!homeStore) {
              // Null-home-store guardrail: this IS the permanent home store selection
              // The PATCH is called inside the modal only in this mode
              setHomeStore(store);
            }
            setSelectedStore(store);
            localStorage.setItem('ggc_selected_store_id', store.id);
            localStorage.setItem('ggc_selected_store_name', store.name);
            setShowStoreSwitcher(false);
          }}
          onClose={() => setShowStoreSwitcher(false)}
        />
      )}

      {/* Daily Spin */}
      <div className="px-4 -mt-3 relative z-10">
        <GlowButton
          color="purple"
          onClick={handleSpin}
          disabled={hasSpunToday || isSpinning}
          className="w-full py-4 relative"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🎰</span>
            <span>{hasSpunToday ? (spinMessage || 'Claimed!') : isSpinning ? 'Spinning…' : 'Daily Spin'}</span>
          </div>
          {!hasSpunToday && !isSpinning && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          )}
        </GlowButton>
        {spinMessage && !hasSpunToday && (
          <p className="text-center text-xs text-accent mt-1">{spinMessage}</p>
        )}
      </div>

      {/* Player Pass — tier, dual currency, prize wall CTA */}
      {passStatus && (
        <div className="mt-4">
          <PlayerPassCard
            tier={passStatus.tier}
            lifetimeXp={passStatus.lifetimeXp}
            prizePoints={passStatus.prizePoints}
          />
        </div>
      )}

      {/* Getting Started checklist — shown to new players */}
      <div className="mt-4">
        <GettingStartedCard />
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
          <h2 className="font-bold text-primary flex items-center gap-2">
            <span className="text-xl">🎮</span> My Games
            {favoriteGames.length > 0 && (
              <span className="text-xs text-secondary font-normal">(Favorites)</span>
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
          <div className="text-center py-8 text-secondary">
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
        <h2 className="font-bold text-primary flex items-center gap-2 mb-3">
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
                  <div className="text-primary text-sm truncate">{a.text}</div>
                  <div className="text-secondary text-xs">{a.time}</div>
                </div>
                <div className={`font-bold text-sm ${a.xp >= 0 ? 'text-xp' : 'text-danger'}`}>
                  {a.xp >= 0 ? '+' : ''}{a.xp}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <div className="text-3xl mb-2">📋</div>
            <p>No activity yet - check in to events!</p>
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <div className="mx-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-primary flex items-center gap-2">
            <span className="text-xl">📅</span> Upcoming Events
          </h2>
          <a href="/dashboard/events" className="text-accent text-sm">View Calendar →</a>
        </div>
        <div className="space-y-2">
          {upcomingEvents.length === 0 ? (
            <div className="flex items-center gap-3 p-3 bg-elevated border border-border-token rounded-xl opacity-60">
              <div className="w-9 h-9 bg-elevated/50 rounded-lg flex items-center justify-center text-lg">📅</div>
              <div className="text-sm text-secondary">No upcoming events</div>
            </div>
          ) : upcomingEvents.map((event: any) => (
            <div key={event.id} className="flex items-center gap-3 p-3 bg-elevated border border-border-token rounded-xl">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: `${event.game?.color || '#3b82f6'}20` }}
              >
                {event.game?.icon || '🎮'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{event.name}</div>
                <div className="text-xs text-secondary">{event.date}, {event.time}</div>
              </div>
              {event.isFree && <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded flex-shrink-0">Free</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Store Updates */}
      {storeUpdates.length > 0 && (
        <div className="mx-4 mt-6">
          <h2 className="font-bold text-primary flex items-center gap-2 mb-3">
            <span className="text-xl">📡</span> Store Updates
          </h2>
          <div className="space-y-2">
            {storeUpdates.map((update: any, i: number) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 bg-elevated border border-border-token rounded-xl ${update.link ? 'cursor-pointer hover:border-accent/40 transition-colors' : ''}`}
                onClick={() => update.link && (window.location.href = update.link)}
              >
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center text-lg flex-shrink-0">{update.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-accent uppercase tracking-wide font-medium mb-0.5">{update.label}</div>
                  <div className="text-sm font-medium leading-snug">{update.headline}</div>
                  {update.subtext && <div className="text-xs text-secondary mt-0.5">{update.subtext}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends Activity */}
      <div className="mx-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-primary flex items-center gap-2">
            <span className="text-xl">👥</span> Friends Activity
          </h2>
          <a href="/dashboard/community" className="text-accent text-sm">Community →</a>
        </div>
        {friendActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2 bg-elevated border border-border-token rounded-xl">
            <div className="text-3xl">👥</div>
            <div className="text-sm font-medium text-secondary">No friend activity yet</div>
            <div className="text-xs text-tertiary">Add friends to see what they&apos;re up to</div>
            <a href="/dashboard/community" className="mt-2 text-xs text-accent border border-accent/30 px-3 py-1.5 rounded-lg">
              Find players →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {friendActivity.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-elevated border border-border-token rounded-xl">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center text-base flex-shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-snug">{item.headline}</div>
                  {item.subtext && <div className="text-xs text-secondary mt-0.5">{item.subtext}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prize Wall */}
      {prizeHighlights.length > 0 && (
        <div className="mx-4 mt-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-primary flex items-center gap-2">
              <span className="text-xl">🏆</span> Prize Wall
            </h2>
            <a href="/dashboard/prize-wall" className="text-accent text-sm">Visit →</a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {prizeHighlights.map((item: any) => (
              <a
                key={item.id}
                href="/dashboard/prize-wall"
                className="bg-elevated border border-border-token rounded-xl overflow-hidden hover:border-accent/40 transition-colors block"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-24 object-contain bg-black/20"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center text-3xl bg-surface">🎁</div>
                )}
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{item.name}</div>
                  <div className="text-[10px] text-accent mt-0.5">{item.xp_cost.toLocaleString()} Guild Points</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
