"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CardOfTheDayCompact } from '@/components/CardOfTheDay';
import { EventCreditCard } from '@/components/EventCreditCard';
import { FriendsMini } from '@/components/FriendsMini';
import { PassesSheet } from '@/components/PassesSheet';
import type { DashboardData } from './useDashboardData';
import { Loader } from '@/components/Loader';
import { CoverImage, HeroBackdrop, pickBackdropGame } from '@/components/CoverImage';
import { parseBackdrop } from '@/lib/games';
import { PASS_MEDALS, type PassTierKey } from '@/lib/pass-tiers';

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

const PANEL = 'rounded-[22px] border border-border-token bg-surface';
const TIER_NAMES: Record<PassTierKey, string> = { free: 'Free', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };

function Stat({ value, label, icon }: { value: string | number; label: string; icon?: string }) {
  return (
    <div className="relative min-w-[84px] rounded-[20px] border border-white/15 bg-black/30 px-4 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
      <div className="flex items-center justify-center gap-1.5 font-display text-[22px] font-extrabold text-white">
        {icon && icon.startsWith('http') && <img src={icon} alt="" className="h-5 w-5 object-contain" />}
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}

function PanelTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h3 className="font-display text-lg font-bold tracking-[-0.02em]">{title}</h3>
      {action && <button type="button" onClick={onAction} className="text-xs font-semibold text-accent hover:underline">{action}</button>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid flex-1 place-items-center px-2 text-center text-xs text-tertiary">{children}</div>;
}

export default function DesktopDashboard({ dashboard }: { dashboard: DashboardData }) {
  const router = useRouter();
  const {
    loading,
    player: playerData,
    storeConfig,
    banners,
    gameStats,
    upcomingEvents,
    specialEvents,
    storeUpdates,
    friendActivity,
    favoriteGameIds: favoriteGames,
    passStatus,
    homeStore,
    selectedStore,
    spin,
    claimDailySpin,
  } = dashboard;
  const { hasSpunToday, isSpinning, message: spinMessage } = spin;
  const [showPasses, setShowPasses] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const artStoreId = selectedStore?.id ?? homeStore?.id ?? null;

  React.useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setBannerIndex(i => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);
  const liveBanner = banners[bannerIndex % Math.max(banners.length, 1)];

  const totalXp = playerData?.xp || 0;
  const level = Math.floor(totalXp / 100) + 1;
  const levelProgress = totalXp % 100;
  const nextLevelXp = level * 100;

  const games = (playerData?.gameXP || [])
    .filter((gxp: any) => gxp && gxp.game_id)
    .map((gxp: any) => {
      const slug = gxp.game_id || 'unknown';
      const config = GAME_CONFIG[slug] || { icon: '🎮', color: '#64748b' };
      const xpValue = gxp.game_xp || gxp.total_xp || gxp.xp || 0;
      const stats = gameStats[slug];
      return {
        id: slug as string,
        name: (slug === 'general' ? 'Guild Points' : slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())) as string,
        xpName: (gxp.xpName || (slug === 'one_piece' ? 'Berries' : slug === 'general' ? 'Guild Points' : 'XP')) as string,
        xp: xpValue as number,
        color: config.color as string,
        rank: (gxp.rank || 'Newcomer') as string,
        monthlyAttendance: (stats?.monthlyEvents ?? gxp.monthlyAttendance ?? 0) as number,
        monthlyThreshold: (gxp.monthlyThreshold || (slug === 'one_piece' ? 5 : 3)) as number,
        earnedMonthlyBonus: !!gxp.earnedMonthlyBonus,
        achievementName: (gxp.achievementName || (slug === 'one_piece' ? "Pirate's Life" : 'The Regular')) as string,
      };
    })
    .sort((a: { xp: number }, b: { xp: number }) => b.xp - a.xp);
  const displayedGames = games.slice(0, 6);
  // The monthly achievement follows the player's favorite game (primary game, then first favorite), falling back to their top game
  const featuredGame =
    games.find((g: { id: string }) => g.id === playerData?.primaryGameId) ??
    games.find((g: { id: string }) => favoriteGames.includes(g.id)) ??
    games[0];

  const activity = (playerData?.recentActivity || []).slice(0, 4).map((a: any) => ({
    id: a.id,
    text: a.description || a.source?.replace(/_/g, ' ') || 'XP Earned',
    xp: a.final_xp || a.base_xp || 0,
    time: new Date(a.created_at).toLocaleDateString(),
  }));

  const avatar = playerData?.avatar || {};
  const avatarPhoto = avatar.photoUrl || avatar.photo_url || null;
  const avatarBase = avatar.base || avatar.emoji || '😎';
  const avatarBackground = avatar.background || '#3b82f6';
  const HERO_FRAME_COLORS: Record<string, string> = {
    none: 'var(--accent)', silver: '#94a3b8', gold: '#eab308', diamond: '#22d3ee',
    fire: '#f97316', pirate: '#dc2626', electric: '#facc15', legendary: '#a855f7',
  };
  const heroBorderColor = HERO_FRAME_COLORS[avatar.frame || 'none'] ?? 'var(--accent)';

  const tier: PassTierKey = passStatus?.tier ?? 'free';
  const multiplier = passStatus?.multiplier ?? 1;
  const monthName = new Date().toLocaleDateString('en-US', { month: 'short' });
  const nextEvent = upcomingEvents[0];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-base">
        <Loader label="Loading" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] min-h-[780px] bg-base text-primary">
      <div className="grid h-full grid-cols-12 grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-4 py-5">
        {/* Hero */}
        <section className="relative isolate col-span-6 flex items-center gap-5 overflow-hidden rounded-[28px] border border-white/10 p-4 text-white">
          <HeroBackdrop
            gameId={parseBackdrop(playerData?.heroBackdrop).gameId ?? pickBackdropGame(favoriteGames)}
            src={parseBackdrop(playerData?.heroBackdrop).uploadUrl}
          />
          <div className="relative shrink-0">
            <div
              className="grid h-14 w-14 place-items-center overflow-hidden rounded-3xl border-[3px] text-[28px]"
              style={{ borderColor: heroBorderColor, background: avatarPhoto ? undefined : avatarBackground }}
            >
              {avatarPhoto ? <img src={avatarPhoto} alt="" className="h-full w-full object-cover" /> : avatarBase}
            </div>
          </div>
          <div className="relative z-10 min-w-0 flex-1">
            <div className="flex items-baseline gap-3">
              <h1 className="truncate font-display text-[26px] font-extrabold leading-none tracking-[-0.03em]">{playerData?.displayName || 'Player'}</h1>
              <span className="shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 px-2.5 py-0.5 text-xs font-bold">Level {level}</span>
            </div>
            {playerData?.status && <div className="mt-1.5 truncate text-sm text-white/80">{playerData.status}</div>}
            <div className="mt-2 h-2.5 max-w-[340px] overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${levelProgress}%` }} /></div>
            <div className="mt-1 text-xs text-white/70">{totalXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</div>
          </div>
          <div className="relative z-10 flex gap-2.5">
            <Stat value={games.length} label="Games" />
            <Stat value={totalXp} label="Total XP" />
            <Stat value={playerData?.gems || 0} label={storeConfig.currency_name} icon={storeConfig.currency_icon} />
          </div>
        </section>

        {/* Pass */}
        <section className={`relative col-span-4 flex flex-col justify-center overflow-hidden p-4 ${PANEL}`}>
          <div className="relative flex items-center gap-3">
            {tier !== 'free' ? (
              <div
                className={`h-11 w-11 shrink-0 shadow-lg ${tier === 'diamond' ? '' : 'rounded-full'}`}
                style={{
                  background: PASS_MEDALS[tier].face,
                  border: tier === 'diamond' ? undefined : `3px solid ${PASS_MEDALS[tier].ring}`,
                  clipPath: tier === 'diamond' ? 'polygon(50% 0,100% 38%,50% 100%,0 38%)' : undefined,
                }}
              />
            ) : (
              <div className="h-11 w-11 shrink-0 rounded-full border-2 border-dashed border-border-strong" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wide text-secondary">Your pass</div>
              <div className="font-display text-xl font-extrabold leading-tight tracking-[-0.02em]">{TIER_NAMES[tier]}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-extrabold text-accent">{multiplier}x</div>
              <div className="text-[10px] uppercase tracking-wide text-secondary">Prize Points</div>
            </div>
          </div>
          <div className="relative">
            {tier === 'diamond' ? (
              <EventCreditCard />
            ) : (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-elevated px-3 py-2.5">
                <div className="text-xs text-secondary">{tier === 'free' ? 'A pass is needed to spend Prize Points' : 'Compare passes and perks'}</div>
                <button type="button" onClick={() => setShowPasses(true)} className="pp-press shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-fg">View passes</button>
              </div>
            )}
          </div>
        </section>

        {/* Monthly achievement */}
        <section className={`col-span-2 flex flex-col justify-center p-4 ${PANEL}`}>
          {featuredGame ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold uppercase tracking-wide text-secondary">{monthName} · {featuredGame.name}</div>
                  <div className="font-display text-lg font-bold leading-tight tracking-[-0.02em]">{featuredGame.achievementName}</div>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums">{featuredGame.earnedMonthlyBonus ? '✓' : `${Math.min(featuredGame.monthlyAttendance, featuredGame.monthlyThreshold)}/${featuredGame.monthlyThreshold}`}</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {Array.from({ length: featuredGame.monthlyThreshold }).map((_, i) => (
                  <span key={i} className={`h-2 flex-1 rounded-full ${featuredGame.earnedMonthlyBonus || i < featuredGame.monthlyAttendance ? 'bg-accent' : 'bg-elevated'}`} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-secondary">Play an event to start a monthly achievement.</div>
          )}
        </section>

        {/* Banner / next event */}
        <section className="relative col-span-5 min-h-0 overflow-hidden rounded-[28px] border border-white/10">
          {liveBanner ? (
            <>
              <div
                key={`banner-bg-${liveBanner.id}`}
                className="absolute inset-0"
                style={{
                  background: liveBanner.backgroundImage ? `url('${liveBanner.backgroundImage}')` : `linear-gradient(135deg, ${liveBanner.colorFrom}, ${liveBanner.colorTo})`,
                  backgroundSize: (liveBanner as any).bgSize || 'cover',
                  backgroundPosition: (liveBanner as any).bgPosition || 'center',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
              {liveBanner.badge && (
                <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{liveBanner.badge}</div>
              )}
              <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em]" style={{ color: (liveBanner as any).textColor || '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>{liveBanner.title}</div>
                  {liveBanner.subtitle && <div className="mt-1.5 text-sm font-medium" style={{ color: (liveBanner as any).textColor || '#ffffff', textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>{liveBanner.subtitle}</div>}
                </div>
                {liveBanner.hasStream && (
                  <div className="flex shrink-0 gap-2">
                    {liveBanner.twitchUrl && <a href={liveBanner.twitchUrl} target="_blank" rel="noopener noreferrer" className="pp-press rounded-xl bg-[#9146ff] px-4 py-2 text-sm font-semibold text-white shadow-xl hover:brightness-110">Twitch</a>}
                    {liveBanner.youtubeUrl && <a href={liveBanner.youtubeUrl} target="_blank" rel="noopener noreferrer" className="pp-press rounded-xl bg-[#ff0000] px-4 py-2 text-sm font-semibold text-white shadow-xl hover:brightness-110">YouTube</a>}
                  </div>
                )}
              </div>
              {banners.length > 1 && (
                <div className="absolute right-5 top-5 flex gap-1.5">
                  {banners.map((_, i) => (<button key={i} type="button" aria-label={`Banner ${i + 1}`} onClick={() => setBannerIndex(i)} className={`h-1.5 rounded-full transition-all ${i === bannerIndex % banners.length ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />))}
                </div>
              )}
            </>
          ) : nextEvent ? (
            <button type="button" onClick={() => router.push('/dashboard/events')} className="absolute inset-0 text-left">
              <CoverImage gameId={nextEvent.game?.id} storeId={nextEvent.storeId ?? artStoreId} color={nextEvent.game?.color || '#64748b'} src={nextEvent.imageUrl} className="h-full w-full">
                <div className="absolute inset-x-5 bottom-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-white/70">Up next</div>
                  <div className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] text-white">{nextEvent.name}</div>
                  <div className="mt-1.5 text-sm text-white/75">{nextEvent.date} · {nextEvent.time}</div>
                </div>
              </CoverImage>
            </button>
          ) : (
            <div className={`grid h-full place-items-center text-sm text-secondary ${PANEL}`}>No events scheduled yet</div>
          )}
        </section>

        {/* My Games */}
        <section className={`col-span-4 flex min-h-0 flex-col p-4 ${PANEL}`}>
          <PanelTitle title="My Games" action={`View all (${games.length}) →`} onAction={() => router.push('/dashboard/profile')} />
          {displayedGames.length === 0 ? (
            <Empty>Check in to an event to start your first game.</Empty>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-3">
              {displayedGames.map((g: (typeof displayedGames)[number]) => {
                const rankProgress = Math.min(((g.xp % 500) / 500) * 100, 100);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/community?game=${g.id}`)}
                    className="group relative min-h-0 overflow-hidden rounded-2xl text-left transition-transform duration-200 ease-out hover:-translate-y-0.5"
                  >
                    <CoverImage gameId={g.id} storeId={artStoreId} color={g.color} className="absolute inset-0 h-full w-full">
                      <div className="absolute inset-x-3 bottom-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: g.color }}>{g.name}</div>
                        <div className="flex items-baseline gap-1"><span className="font-display text-xl font-extrabold leading-none text-white">{g.xp.toLocaleString()}</span><span className="truncate text-[10px] text-white/70">{g.xpName}</span></div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full" style={{ width: `${rankProgress}%`, background: g.color }} /></div>
                        <div className="mt-1 truncate text-[10px] text-white/70">{g.rank}</div>
                      </div>
                    </CoverImage>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Bonus + Card of the Day */}
        <div className="col-span-3 flex min-h-0 flex-col gap-4">
          <button
            type="button"
            onClick={() => void claimDailySpin()}
            disabled={hasSpunToday || isSpinning}
            className={`pp-press relative flex items-center gap-4 p-4 text-left disabled:opacity-60 ${PANEL}`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{isSpinning ? 'Claiming…' : hasSpunToday ? 'Claimed' : 'Daily bonus ready'}</div>
              <div className="truncate text-xs text-secondary">{spinMessage || (hasSpunToday ? 'Come back tomorrow' : 'Tap to claim your bonus')}</div>
            </div>
            {!hasSpunToday && !isSpinning && <span className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-fg">Claim</span>}
          </button>
          <section className={`flex min-h-0 flex-1 flex-col overflow-hidden p-4 ${PANEL}`}>
            <PanelTitle title="Card of the Day" />
            <div className="flex min-h-0 flex-1 items-center overflow-y-auto"><div className="w-full"><CardOfTheDayCompact /></div></div>
          </section>
        </div>

        {/* Bottom row */}
        <section className={`col-span-3 flex min-h-0 flex-col overflow-hidden p-4 ${PANEL}`}>
          <PanelTitle title="This week" action="Calendar →" onAction={() => router.push('/dashboard/events')} />
          {upcomingEvents.length === 0 && specialEvents.length === 0 ? (
            <Empty>No upcoming events. Check back soon.</Empty>
          ) : (
            <div className="flex flex-1 flex-col justify-between gap-2">
              {[...specialEvents.slice(0, 1), ...upcomingEvents].slice(0, 3).map((e: any) => (
                <button key={e.id} type="button" onClick={() => router.push('/dashboard/events')} className="pp-press flex items-center gap-3 rounded-2xl bg-elevated p-2 text-left">
                  <CoverImage gameId={e.game?.id} storeId={e.storeId ?? artStoreId} color={e.game?.color || '#64748b'} src={e.imageUrl} className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{e.name}</div><div className="truncate text-xs text-secondary">{e.date} · {e.time}</div></div>
                  {e.entryFee && <span className={`shrink-0 text-xs font-bold ${e.isFree ? 'text-accent' : ''}`}>{e.entryFee}</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={`col-span-3 flex min-h-0 flex-col overflow-hidden p-4 ${PANEL}`}>
          <PanelTitle title="Recent Activity" action="View all →" onAction={() => router.push('/dashboard/profile')} />
          {activity.length === 0 ? (
            <Empty>No activity yet. Attend events to start earning XP.</Empty>
          ) : (
            <ul className="flex flex-1 flex-col justify-between divide-y divide-border-token">
              {activity.map((a: { id: string; text: string; xp: number; time: string }) => (
                <li key={a.id} className="flex flex-1 items-center justify-between gap-3">
                  <div className="min-w-0"><div className="truncate text-sm font-medium">{a.text}</div><div className="text-xs text-tertiary">{a.time}</div></div>
                  <span className={`shrink-0 text-sm font-bold ${a.xp >= 0 ? 'text-accent' : 'text-red-400'}`}>{a.xp >= 0 ? '+' : ''}{a.xp}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`col-span-3 flex min-h-0 flex-col overflow-hidden p-4 ${PANEL}`}>
          <PanelTitle title="Friends" action="Find players →" onAction={() => router.push('/dashboard/community')} />
          <FriendsMini activity={friendActivity} />
        </section>

        <section className={`col-span-3 flex min-h-0 flex-col overflow-hidden p-4 ${PANEL}`}>
          <PanelTitle title="From the store" />
          {storeUpdates.length === 0 ? (
            <Empty>Nothing new from the store.</Empty>
          ) : (
            <ul className="flex flex-1 flex-col justify-between divide-y divide-border-token">
              {storeUpdates.slice(0, 3).map((u: any, i: number) => (
                <li key={i} className={`flex flex-1 items-center gap-2.5 ${u.link ? 'cursor-pointer' : ''}`} onClick={() => u.link && (window.location.href = u.link)}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-sm">{u.icon}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{u.headline}</div>{u.subtext && <div className="truncate text-xs text-secondary">{u.subtext}</div>}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {showPasses && <PassesSheet currentTier={tier} onClose={() => setShowPasses(false)} />}
    </div>
  );
}
