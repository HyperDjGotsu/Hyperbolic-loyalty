'use client';

import React, { useEffect, useState } from 'react';
import {
  Avatar,
  GameXpCard,
} from '@/components/ui';
import { BannerCarousel } from '@/components/BannerCarousel';
import { CardOfTheDayCompact } from '@/components/CardOfTheDay';
import { GettingStartedCard } from '@/components/GettingStartedCard';
import { StoreSwitcherModal } from '@/components/StoreSwitcherModal';
import { HomeSkeleton } from '@/components/Skeleton';
import SpecialEvents from '@/components/SpecialEvents';
import type { DashboardData } from './useDashboardData';
import { Gift } from 'lucide-react';
import { CoverImage, HeroBackdrop, pickBackdropGame } from '@/components/CoverImage';
import { parseBackdrop } from '@/lib/games';
import { PageTitle } from '@/components/PageTitle';

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
  // Monthly attendance tracking (Pirate's Life / The Regular)
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
  warhammer: { icon: '💀', color: '#dc2626' },
  sw_legion: { icon: '🎖️', color: '#059669' },
  azuki: { icon: '⛩️', color: '#c084fc' },
  blood_bowl: { icon: '🏈', color: '#b45309' },
  bolt_action: { icon: '🎯', color: '#475569' },
  general: { icon: '🎮', color: '#64748b' },
};

const PASS_MULTIPLIER: Record<string, string> = { free: '1x', bronze: '1.25x', silver: '1.5x', gold: '2x', diamond: '2x★' };

// Circular progress ring. `pct` is 0-100; children render in the centre.
function Ring({ pct, size, stroke, color, children }: { pct: number; size: number; stroke: number; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, pct)) / 100)}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">{children}</div>
    </div>
  );
}

function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="font-display text-2xl font-bold text-primary tracking-tight">{title}</h2>
      {href && <a href={href} className="text-accent text-sm font-semibold">{linkLabel}</a>}
    </div>
  );
}

const RAIL = 'flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
const TILE = 'snap-start flex-none rounded-[26px] bg-surface border border-border-token';

export default function MobileDashboard({ dashboard }: { dashboard: DashboardData }) {
  const {
    loading,
    player: playerData,
    homeStore,
    selectedStore,
    selectStore,
    refreshPlayer,
    storeConfig,
    banners,
    passStatus,
    favoriteGameIds: favoriteGames,
    upcomingEvents,
    specialEvents,
    storeUpdates,
    friendActivity,
    prizeHighlights,
    spin,
    claimDailySpin,
  } = dashboard;
  const { hasSpunToday, isSpinning, message: spinMessage } = spin;

  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Alerts moved from the tab bar to the avatar badge, so Home reads the unread count itself.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/notifications?unread=true&limit=1');
        if (res.ok && !cancelled) setUnreadCount((await res.json()).unreadCount ?? 0);
      } catch {
        // badge is optional
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Legacy players may have no home store yet — force switcher open
  useEffect(() => {
    if (playerData && !playerData.homeStoreId && !homeStore) {
      setShowStoreSwitcher(true);
    }
  }, [playerData, homeStore]);

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
        monthlyThreshold: gxp.monthlyThreshold || (slug === 'one_piece' ? 5 : 3),
        monthlyBonus: gxp.monthlyBonus || 30,
        earnedMonthlyBonus: gxp.earnedMonthlyBonus || false,
        achievementName: gxp.achievementName || (slug === 'one_piece' ? "Pirate's Life" : 'The Regular'),
      };
    });

  // Filter to favorite games (if any), sort by XP, show top 3
  // Always include 'general' (Guild Points) — it's not a favoritable game but always relevant
  const filteredGames = favoriteGames.length > 0
    ? games
        .filter(g => g.id === 'general' || favoriteGames.includes(g.id))
        .sort((a, b) => b.xp - a.xp)
    : games.sort((a, b) => b.xp - a.xp);
  
  // Transform activity for display
  const recentActivity = (playerData?.recentActivity || []).map((a: any) => ({
    id: a.id,
    text: a.description || a.source?.replace(/_/g, ' ') || 'XP Earned',
    xp: a.final_xp || a.base_xp || 0,
    time: new Date(a.created_at).toLocaleDateString(),
    storeTag: a.store_short_id ?? null,
    icon: '⭐',
  }));

  const handleSpin = () => {
    void claimDailySpin();
  };

  if (loading) return <HomeSkeleton />;

  const avatar = playerData?.avatar || {};

  const avatarForComponent = {
    type: (avatar.photoUrl || avatar.photo_url) ? 'photo' as const : 'emoji' as const,
    base: avatar.base || avatar.emoji || '😎',
    photoUrl: avatar.photoUrl || avatar.photo_url || null,
    background: avatar.background || '#3b82f6',
    frame: avatar.frame || 'none',
    badge: avatar.badge || null,
  };

  const storeForPill = selectedStore ?? homeStore;
  const spendable = passStatus?.prizePoints ?? playerData?.gems ?? 0;
  const guildPoints = filteredGames.find((g) => g.id === 'general') ?? null;
  const artGames = filteredGames.filter((g) => g.id !== 'general');
  const selectedGame = filteredGames.find((g) => g.id === expandedGame) ?? null;

  return (
    <div className="min-h-full px-4 pt-3 pb-4">
      {/* Title row */}
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <PageTitle
            sub={storeForPill && (
              <button
                onClick={() => setShowStoreSwitcher(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border-token pl-2.5 pr-3 py-1.5 text-[13px] font-semibold text-secondary"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: storeForPill.color ?? '#3ddc6a' }} />
                {storeForPill.name}
                {storeForPill.is_flagship && <span className="text-[10px] uppercase tracking-wide text-xp">Flagship</span>}
              </button>
            )}
          >
            Home
          </PageTitle>
        </div>
        <a
          href="/dashboard/notifications"
          aria-label={unreadCount > 0 ? `Alerts, ${unreadCount} unread` : 'Alerts'}
          className="relative flex-none"
        >
          <Avatar avatar={avatarForComponent} size="md" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold grid place-items-center border-2 border-base">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </a>
      </header>

      {/* Store Switcher Modal */}
      {showStoreSwitcher && (
        <StoreSwitcherModal
          currentStoreId={selectedStore?.id ?? null}
          homeStoreId={homeStore?.id ?? null}
          required={!homeStore}
          onSwitch={(store) => {
            selectStore(store);
            setShowStoreSwitcher(false);
            // Null-home-store case: modal already PATCHed /api/player/home-store;
            // refresh player data so homeStore state updates and required=true clears.
            if (!homeStore) refreshPlayer();
          }}
          onClose={() => setShowStoreSwitcher(false)}
        />
      )}

      {/* Hero: level, points, spin */}
      <section className="relative isolate overflow-hidden mt-5 rounded-[30px] bg-elevated border border-border-token p-5 shadow-xl">
        <HeroBackdrop
          storeId={(selectedStore ?? homeStore)?.id}
          gameId={parseBackdrop(playerData?.heroBackdrop).gameId ?? pickBackdropGame(favoriteGames)}
          src={parseBackdrop(playerData?.heroBackdrop).uploadUrl}
        />
        <div className="flex items-center gap-5">
          <Ring pct={levelProgress} size={112} stroke={9} color="var(--accent)">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">Level</span>
            <span className="text-[40px] leading-none font-extrabold tabular-nums text-white">{level}</span>
          </Ring>
          <div className="min-w-0">
            <div className="text-lg font-bold text-white truncate">{playerData?.displayName || 'Player'}</div>
            <div className="text-[13px] text-white/70 tabular-nums">{levelProgress} of 100 XP to Level {level + 1}</div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl leading-none font-extrabold tabular-nums text-xp">{spendable.toLocaleString()}</span>
              <span className="text-[13px] font-semibold text-white/70">{passStatus ? 'Prize Points' : storeConfig.currency_name}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            onClick={handleSpin}
            disabled={hasSpunToday || isSpinning}
            className="relative h-[50px] rounded-2xl bg-accent text-accent-fg font-bold text-[15px] disabled:opacity-60"
          >
            {hasSpunToday ? (spinMessage || 'Claimed!') : isSpinning ? 'Spinning…' : 'Daily spin'}
            {!hasSpunToday && !isSpinning && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500" />}
          </button>
          <a
            href="/dashboard/prize-wall"
            className="h-[50px] rounded-2xl bg-base border border-border-token text-primary font-bold text-[15px] grid place-items-center"
          >
            Prize Wall
          </a>
        </div>
        {spinMessage && !hasSpunToday && <p className="text-center text-xs text-accent mt-2">{spinMessage}</p>}

        {passStatus && (
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[13px] text-white/70">
            <span>
              {passStatus.tier === 'free'
                ? `${passStatus.prizePoints.toLocaleString()} / 720 pts to unlock Prize Wall`
                : `${PASS_MULTIPLIER[passStatus.tier] ?? '1x'} XP on every event`}
            </span>
            <span className="font-bold uppercase tracking-wider text-xs text-xp">{passStatus.tier} Pass</span>
          </div>
        )}
      </section>

      {/* Getting Started checklist — shown to new players */}
      <div className="mt-4">
        <GettingStartedCard />
      </div>

      {/* Banner Carousel */}
      {banners.length > 0 && (
        <div className="mt-4 -mx-4">
          <BannerCarousel banners={banners} />
        </div>
      )}

      {/* Special Events */}
      {specialEvents.length > 0 && (
        <div className="mt-6">
          <SpecialEvents events={specialEvents} />
        </div>
      )}

      {/* Up next */}
      <section className="mt-8">
        <SectionHeader title="Up next" href="/dashboard/events" linkLabel="Calendar" />
        {upcomingEvents.length === 0 ? (
          <div className="rounded-[26px] bg-surface border border-border-token p-5 text-sm text-secondary">No upcoming events</div>
        ) : (
          <div className={RAIL}>
            {upcomingEvents.map((event: any) => (
              <a key={event.id} href="/dashboard/events" className={`${TILE} w-[280px] overflow-hidden`}>
                <CoverImage gameId={event.game?.id ?? event.game_id} storeId={event.storeId} color={event.game?.color || '#3b82f6'} className="h-[170px]">
                  {event.isFree && (
                    <span className="absolute left-3 top-3 text-xs font-bold text-white bg-black/50 backdrop-blur px-2.5 py-1 rounded-full">Free</span>
                  )}
                  <div className="absolute inset-x-4 bottom-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-white/70">{event.date}, {event.time}</div>
                    <div className="mt-0.5 text-lg font-extrabold leading-tight text-white line-clamp-2">{event.name}</div>
                  </div>
                </CoverImage>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Your games */}
      <section className="mt-8">
        <SectionHeader title="Your games" />
        {filteredGames.length > 0 ? (
          <>
            {artGames.length > 0 && (
              <div className={RAIL}>
                {artGames.map((game) => {
                  const toNext = 50 - (game.xp % 50);
                  const goal = game.monthlyThreshold || (game.id === 'one_piece' ? 5 : 3);
                  const visits = Math.min(game.monthlyAttendance || 0, goal);
                  return (
                    <button
                      key={game.id}
                      onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                      aria-pressed={expandedGame === game.id}
                      className={`${TILE} w-[150px] overflow-hidden text-left ${expandedGame === game.id ? 'border-accent' : ''}`}
                    >
                      <CoverImage gameId={game.id} storeId={(selectedStore ?? homeStore)?.id} color={game.color} className="h-[212px]">
                        <span className="absolute right-3 top-3 text-xs font-extrabold text-white bg-black/55 backdrop-blur px-2.5 py-1 rounded-full tabular-nums">Lv {game.level}</span>
                        <div className="absolute inset-x-3.5 bottom-3.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/85">
                            <span className="truncate">{game.earnedMonthlyBonus ? '✓ ' : ''}{game.achievementName}</span>
                            <span className="flex gap-[3px] ml-auto" aria-label={`${visits} of ${goal} events this month`}>
                              {Array.from({ length: goal }).map((_, i) => (
                                <span key={i} className="h-[6px] w-[6px] rounded-full" style={{ background: game.earnedMonthlyBonus || i < visits ? game.color : 'rgba(255,255,255,0.28)' }} />
                              ))}
                            </span>
                          </div>
                          <div className="mt-1.5 text-base font-extrabold leading-tight text-white line-clamp-2">{game.name}</div>
                          <div className="mt-0.5 flex justify-between text-xs font-semibold tabular-nums text-white/75">
                            <span>{game.xp.toLocaleString()} XP</span>
                            <span>{toNext} to Lv {game.level + 1}</span>
                          </div>
                          <div className="mt-2 h-[5px] rounded-full bg-white/25 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${((game.xp % 50) / 50) * 100}%`, background: game.color }} />
                          </div>
                        </div>
                      </CoverImage>
                    </button>
                  );
                })}
              </div>
            )}
            {guildPoints && (
              <button
                onClick={() => setExpandedGame(expandedGame === guildPoints.id ? null : guildPoints.id)}
                aria-pressed={expandedGame === guildPoints.id}
                className={`${artGames.length > 0 ? 'mt-3' : ''} inline-flex items-center gap-2 rounded-full bg-surface border px-3.5 py-2 text-xs font-bold text-secondary tabular-nums ${expandedGame === guildPoints.id ? 'border-accent' : 'border-border-token'}`}
              >
                <span>{guildPoints.icon}</span> Guild Points · Level {guildPoints.level}
              </button>
            )}
            {selectedGame && (
              <div className="mt-3">
                <GameXpCard game={selectedGame} isExpanded onClick={() => setExpandedGame(null)} />
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[26px] bg-surface border border-border-token p-5 text-sm text-secondary text-center">
            No game XP yet. Attend events to start earning!
          </div>
        )}
      </section>

      {/* Card of the Day */}
      <div className="mt-8">
        <CardOfTheDayCompact />
      </div>

      {/* Prize Wall */}
      {prizeHighlights.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Prize Wall" href="/dashboard/prize-wall" linkLabel="See all" />
          <div className={RAIL}>
            {prizeHighlights.map((item: any) => {
              const cost = item.xp_cost ?? 0;
              const canAfford = spendable >= cost;
              return (
                <a key={item.id} href="/dashboard/prize-wall" className={`${TILE} w-[168px] overflow-hidden`}>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-[104px] object-contain bg-elevated"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-[104px] grid place-items-center text-secondary bg-elevated"><Gift size={30} strokeWidth={1.5} /></div>
                  )}
                  <div className="px-3.5 pt-3 pb-3.5">
                    <div className="text-sm font-bold truncate text-primary">{item.name}</div>
                    <div className="mt-1 flex items-center justify-between text-[13px] font-bold tabular-nums">
                      <span className={canAfford ? 'text-xp' : 'text-tertiary'}>{cost.toLocaleString()} pts</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${canAfford ? 'bg-xp/15 text-xp' : 'bg-elevated text-secondary'}`}>
                        {canAfford ? 'Redeem' : `${(cost - spendable).toLocaleString()} to go`}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Activity: yours, then friends */}
      <section className="mt-8">
        <SectionHeader title="Activity" href="/dashboard/community" linkLabel="Community" />
        <div className="rounded-[26px] bg-surface border border-border-token overflow-hidden divide-y divide-border-token">
          {recentActivity.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`flex-none w-[38px] h-[38px] rounded-full grid place-items-center text-[13px] font-extrabold tabular-nums bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] ${a.xp >= 0 ? 'text-accent' : 'text-danger'}`}>
                {a.xp >= 0 ? '+' : ''}{a.xp}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-primary truncate">{a.text}</div>
                <div className="text-xs text-secondary">{a.time}{a.storeTag ? ` · @ ${a.storeTag}` : ''}</div>
              </div>
            </div>
          ))}
          {friendActivity.map((item: any, i: number) => (
            <div key={`f${i}`} className="flex items-start gap-3 px-4 py-3.5">
              <span className="flex-none w-[38px] h-[38px] rounded-full grid place-items-center text-base bg-elevated">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-primary leading-snug">{item.headline}</div>
                {item.subtext && <div className="text-xs text-secondary mt-0.5">{item.subtext}</div>}
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && friendActivity.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-secondary">
              No activity yet. Check in to events, or <a href="/dashboard/community" className="text-accent font-semibold">find players</a>.
            </div>
          )}
        </div>
      </section>

      {/* Store Updates */}
      {storeUpdates.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Store updates" />
          <div className="rounded-[26px] bg-surface border border-border-token overflow-hidden divide-y divide-border-token">
            {storeUpdates.map((update: any, i: number) => (
              <div
                key={i}
                className={`flex items-start gap-3 px-4 py-3.5 ${update.link ? 'cursor-pointer' : ''}`}
                onClick={() => update.link && (window.location.href = update.link)}
              >
                <span className="flex-none w-[38px] h-[38px] rounded-full grid place-items-center text-lg bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]">{update.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-accent uppercase tracking-wide font-bold mb-0.5">{update.label}</div>
                  <div className="text-sm font-semibold leading-snug text-primary">{update.headline}</div>
                  {update.subtext && <div className="text-xs text-secondary mt-0.5">{update.subtext}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
