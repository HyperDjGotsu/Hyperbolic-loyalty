'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Avatar } from '@/components/ui';
import { CardOfTheDay } from '@/components/CardOfTheDay';
import NotificationBell from '@/components/NotificationBell';
import type { Banner } from '@/lib/types';

// Scouter-style number counting component - only animates on hover trigger
function ScouterNumber({ 
  value, 
  duration = 800,
  className = '',
  style = {},
  trigger = 0
}: { 
  value: number; 
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  trigger?: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const isAnimatingRef = useRef(false);
  const lastTriggerRef = useRef(0);

  // Keep displayValue in sync with value when not animating
  useEffect(() => {
    if (!isAnimatingRef.current) {
      setDisplayValue(value);
    }
  }, [value]);

  const animateCount = useCallback((targetValue: number) => {
    if (targetValue === 0 || isAnimatingRef.current) {
      return;
    }
    
    isAnimatingRef.current = true;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Fast & frantic: mostly random jumps, then settle at the end
      if (progress < 0.85) {
        const baseValue = targetValue * progress;
        const variance = targetValue * 0.3 * (1 - progress);
        const randomOffset = (Math.random() - 0.5) * variance;
        setDisplayValue(Math.max(0, Math.floor(baseValue + randomOffset)));
      } else {
        const finalProgress = (progress - 0.85) / 0.15;
        const eased = 1 - Math.pow(1 - finalProgress, 3);
        const currentDisplay = Math.floor(targetValue * 0.85 + (targetValue * 0.15 * eased));
        setDisplayValue(Math.min(currentDisplay, targetValue));
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
        isAnimatingRef.current = false;
      }
    };
    
    requestAnimationFrame(animate);
  }, [duration]);

  // Animate when trigger changes (from parent hover)
  useEffect(() => {
    if (trigger > 0 && trigger !== lastTriggerRef.current && value > 0) {
      lastTriggerRef.current = trigger;
      animateCount(value);
    }
  }, [trigger, value, animateCount]);

  return (
    <span className={className} style={style}>
      {displayValue.toLocaleString()}
    </span>
  );
}

// Hero stat card - just displays the value, no animation
function HeroStatCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon?: string;
}) {
  return (
    <div className="bg-surface border border-border-token rounded-2xl px-6 py-4 text-center min-w-[100px] transition-all hover:border-accent/30 hover:-translate-y-1 hover:shadow-[0_4px_24px_rgba(0,200,234,0.12)]">
      <div className="text-[28px] font-extrabold text-accent">
        {value.toLocaleString()}
      </div>
      <div className="text-[11px] text-secondary uppercase tracking-wide mt-0.5 flex items-center justify-center gap-1">
        {icon && (
          icon.startsWith('http')
            ? <img src={icon} alt="" className="w-4 h-4 object-contain" />
            : <span>{icon}</span>
        )}
        {label}
      </div>
    </div>
  );
}

// Flippable game card component with hover scouter animation and click to flip
function GameCard({ 
  game, 
  onClick,
  isExpanded,
  onExpand,
}: { 
  game: GameDisplay; 
  onClick: () => void;
  isExpanded: boolean;
  onExpand: () => void;
}) {
  const [hoverCount, setHoverCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const rankProgress = Math.min((game.xp % 500) / 500 * 100, 100);
  const xpToNextRank = 500 - (game.xp % 500);

  // Use real stats from API, fallback to placeholder values
  const stats = {
    eventsAttended: game.stats?.monthlyEvents ?? game.monthlyAttendance ?? 0,
    totalEvents: game.stats?.totalEvents ?? 0,
    winRate: game.stats?.winRate ?? 0,
    matches: (game.stats?.totalWins ?? 0) + (game.stats?.totalLosses ?? 0),
    wins: game.stats?.totalWins ?? 0,
    losses: game.stats?.totalLosses ?? 0,
    currentStreak: game.stats?.currentStreak ?? 0,
    bestPlacement: game.stats?.bestPlacement ? formatPlacement(game.stats.bestPlacement) : null,
    firstPlayed: game.stats?.playingSince ? formatPlayingSince(game.stats.playingSince) : null,
    undefeatedCount: game.stats?.undefeatedCount ?? 0,
  };

  // Determine if we have "rich" stats worth expanding for
  const hasRichStats = stats.matches > 0 || stats.bestPlacement !== null || stats.wins > 0;

  // Calculate earned achievements
  const earnedAchievements = getEarnedAchievements(game.stats);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
    onExpand();
  };

  // Sync flip state with expanded state
  useEffect(() => {
    if (!isExpanded && isFlipped) {
      setIsFlipped(false);
    }
  }, [isExpanded]);

  return (
    <div 
      className={`relative transition-all duration-700 ease-in-out ${isExpanded && hasRichStats ? 'col-span-2 row-span-2' : ''}`}
      style={{ perspective: '1500px' }}
    >
      <div
        className={`relative transition-all duration-700 ease-in-out h-full ${isFlipped ? 'z-20' : 'z-10'}`}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of card */}
        <div
          className="bg-surface border border-border-token rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden group h-full"
          style={{ backfaceVisibility: 'hidden' }}
          onClick={handleClick}
          onMouseEnter={() => setHoverCount(c => c + 1)}
        >
          <div 
            className="absolute top-0 left-0 right-0 h-[3px] opacity-70 group-hover:opacity-100 transition-opacity"
            style={{ background: game.color }}
          />

          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px] shrink-0"
              style={{ background: `${game.color}26` }}
            >
              {game.icon}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{game.name}</div>
              <div className="text-xs font-medium" style={{ color: game.color }}>
                {game.rank}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <ScouterNumber 
                value={game.xp} 
                duration={800}
                trigger={hoverCount}
                className="text-[28px] font-bold text-accent"
              />
              <span className="text-xs text-secondary">{game.xpName}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-secondary uppercase tracking-wide">Next Rank</span>
              <span className="text-[10px] text-secondary">{xpToNextRank} {game.xpName} to go</span>
            </div>
            <div className="h-[6px] bg-surface rounded overflow-hidden bar-shine-on-hover">
              <div 
                className="h-full rounded transition-all duration-500"
                style={{ 
                  background: `linear-gradient(90deg, ${game.color}, ${game.color}99)`,
                  width: `${rankProgress}%`
                }}
              />
            </div>
          </div>

          <div 
            className="rounded-xl p-3 border"
            style={{ 
              background: `${game.color}10`,
              borderColor: game.earnedMonthlyBonus ? `${game.color}50` : `${game.color}20`
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-semibold" style={{ color: game.color }}>
                {game.achievementName}
              </span>
              {game.earnedMonthlyBonus && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">
                  ✓ Complete!
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Dot tracker */}
                {Array.from({ length: game.monthlyThreshold || 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full transition-colors"
                    style={{
                      background: i < (game.monthlyAttendance || 0)
                        ? (game.earnedMonthlyBonus ? '#22c55e' : game.color)
                        : 'rgba(255,255,255,0.07)'
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-secondary font-medium whitespace-nowrap">
                {game.monthlyAttendance || 0}/{game.monthlyThreshold || 4} Jan
              </span>
            </div>
          </div>
          
          {/* Click hint */}
          <div className="absolute bottom-2 right-2 text-[10px] text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
            Click for stats
          </div>
        </div>

        {/* Back of card - conditional layout based on stats */}
        <div
          className="absolute inset-0 bg-surface border border-border-token rounded-2xl p-5 cursor-pointer overflow-hidden flex flex-col"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          onClick={handleClick}
        >
          <div 
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: game.color }}
          />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
                style={{ background: `${game.color}26` }}
              >
                {game.icon}
              </div>
              <div>
                <div className="font-bold">{game.name}</div>
                <div className="text-xs font-medium" style={{ color: game.color }}>{game.rank}</div>
              </div>
            </div>
            <button 
              className="text-xs text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-lg bg-elevated hover:bg-elevated"
              onClick={handleClick}
            >
              ✕ Close
            </button>
          </div>

          {hasRichStats ? (
            // Full stats layout for players with match history
            <>
              {/* Stats Grid - fits in 2x2 card */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-surface rounded-lg p-2.5">
                  <div className="text-[9px] text-secondary uppercase mb-1">XP</div>
                  <div className="text-base font-bold" style={{ color: game.color }}>{game.xp.toLocaleString()}</div>
                </div>
                <div className="bg-surface rounded-lg p-2.5">
                  <div className="text-[9px] text-secondary uppercase mb-1">Events</div>
                  <div className="text-base font-bold text-accent">{stats.totalEvents}</div>
                </div>
                <div className="bg-surface rounded-lg p-2.5">
                  <div className="text-[9px] text-secondary uppercase mb-1">Win Rate</div>
                  <div className="text-base font-bold text-green-400">{stats.winRate}%</div>
                </div>
                <div className="bg-surface rounded-lg p-2.5">
                  <div className="text-[9px] text-secondary uppercase mb-1">Streak</div>
                  <div className="text-base font-bold text-yellow-400">🔥{stats.currentStreak}</div>
                </div>
              </div>

              {/* Secondary stats row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-surface rounded-lg p-2.5 flex justify-between items-center">
                  <span className="text-[10px] text-secondary">Matches</span>
                  <span className="text-sm font-bold">{stats.matches}</span>
                </div>
                <div className="bg-surface rounded-lg p-2.5 flex justify-between items-center">
                  <span className="text-[10px] text-secondary">Best</span>
                  <span className="text-sm font-bold">🏆 {stats.bestPlacement || '—'}</span>
                </div>
                <div className="bg-surface rounded-lg p-2.5 flex justify-between items-center">
                  <span className="text-[10px] text-secondary">Since</span>
                  <span className="text-sm font-bold">{stats.firstPlayed || '—'}</span>
                </div>
              </div>

              {/* W/L Record */}
              <div className="bg-surface rounded-lg p-2.5 mb-3 flex justify-between items-center">
                <span className="text-[10px] text-secondary">Record</span>
                <span className="text-sm">
                  <span className="text-green-400 font-bold">{stats.wins}W</span>
                  <span className="text-secondary mx-1">-</span>
                  <span className="text-red-400 font-bold">{stats.losses}L</span>
                </span>
              </div>

              {/* Achievements */}
              {earnedAchievements.length > 0 && (
                <div className="mb-3">
                  <div className="text-[9px] text-secondary uppercase mb-2">Achievements</div>
                  <div className="flex flex-wrap gap-1.5">
                    {earnedAchievements.slice(0, 6).map((achievement) => (
                      <div 
                        key={achievement.id}
                        className="bg-surface rounded-lg px-2 py-1 flex items-center gap-1.5 group relative"
                        title={achievement.description}
                      >
                        <span className="text-sm">{achievement.icon}</span>
                        <span className="text-[10px] font-medium text-primary">{achievement.name}</span>
                      </div>
                    ))}
                    {earnedAchievements.length > 6 && (
                      <div className="bg-surface rounded-lg px-2 py-1 text-[10px] text-secondary">
                        +{earnedAchievements.length - 6} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Leaderboard Rank & Next Event Row */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Leaderboard Rank */}
                <div className="bg-surface rounded-lg p-2.5">
                  <div className="text-[9px] text-secondary uppercase mb-1">Leaderboard</div>
                  {game.leaderboardRank ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-bold" style={{ color: game.color }}>#{game.leaderboardRank}</span>
                      <span className="text-[10px] text-secondary">of {game.leaderboardTotal}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-secondary">—</div>
                  )}
                </div>

                {/* Next Event */}
                <div className="bg-surface rounded-lg p-2.5">
                  <div className="text-[9px] text-secondary uppercase mb-1">Next Event</div>
                  {game.nextEvent ? (
                    <div>
                      <div className="text-[11px] font-medium text-primary truncate">{game.nextEvent.name}</div>
                      <div className="text-[10px] text-secondary">{game.nextEvent.date} • {game.nextEvent.time}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-secondary">No upcoming events</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Compact layout for new players with minimal stats
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-surface rounded-lg p-3">
                  <div className="text-[10px] text-secondary uppercase mb-1">Total XP</div>
                  <div className="text-xl font-bold" style={{ color: game.color }}>{game.xp.toLocaleString()}</div>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <div className="text-[10px] text-secondary uppercase mb-1">Events</div>
                  <div className="text-xl font-bold text-accent">{stats.totalEvents}</div>
                </div>
              </div>
              
              <div className="bg-surface/50 rounded-lg p-3 mb-4 text-center">
                <div className="text-secondary text-xs">Play in tournaments to unlock detailed stats!</div>
              </div>
            </>
          )}

          {/* View Leaderboard button - pushed to bottom */}
          <button 
            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] mt-auto"
            style={{ background: game.color }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            View {game.name} Leaderboard →
          </button>
        </div>
      </div>
      
      {/* Click outside overlay when flipped */}
      {isFlipped && (
        <div 
          className="fixed inset-0 z-10"
          onClick={() => {
            setIsFlipped(false);
            onExpand();
          }}
        />
      )}
    </div>
  );
}

// Helper function to format placement (1 -> "1st", 2 -> "2nd", etc.)
function formatPlacement(placement: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = placement % 100;
  return placement + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// Helper function to format "playing since" date
function formatPlayingSince(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
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
  monthlyAttendance?: number;
  monthlyThreshold?: number;
  monthlyBonus?: number;
  earnedMonthlyBonus?: boolean;
  achievementName?: string;
  // Stats from API
  stats?: {
    totalEvents: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    bestPlacement: number | null;
    undefeatedCount: number;
    currentStreak: number;
    playingSince: string | null;
    monthlyEvents: number;
    monthlyXp: number;
  };
  // Leaderboard position
  leaderboardRank?: number;
  leaderboardTotal?: number;
  // Next event for this game
  nextEvent?: {
    name: string;
    date: string;
    time: string;
  };
}

// Achievement definitions - calculated from stats
interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (stats: GameDisplay['stats']) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: 'First Win', icon: '🏆', description: 'Win your first match', check: (s) => (s?.totalWins ?? 0) >= 1 },
  { id: 'hot_streak', name: 'Hot Streak', icon: '🔥', description: '3+ win streak', check: (s) => (s?.currentStreak ?? 0) >= 3 },
  { id: 'on_fire', name: 'On Fire', icon: '💥', description: '5+ win streak', check: (s) => (s?.currentStreak ?? 0) >= 5 },
  { id: 'champion', name: 'Champion', icon: '👑', description: 'Win a tournament', check: (s) => s?.bestPlacement === 1 },
  { id: 'podium', name: 'Podium Finish', icon: '🥈', description: 'Top 3 finish', check: (s) => (s?.bestPlacement ?? 999) <= 3 },
  { id: 'undefeated', name: 'Undefeated', icon: '💪', description: 'Go undefeated at an event', check: (s) => (s?.undefeatedCount ?? 0) >= 1 },
  { id: 'sharpshooter', name: 'Sharpshooter', icon: '🎯', description: '70%+ win rate', check: (s) => (s?.winRate ?? 0) >= 70 },
  { id: 'regular', name: 'Regular', icon: '📅', description: 'Attend 10+ events', check: (s) => (s?.totalEvents ?? 0) >= 10 },
  { id: 'veteran', name: 'Veteran', icon: '⭐', description: 'Attend 25+ events', check: (s) => (s?.totalEvents ?? 0) >= 25 },
  { id: 'legend', name: 'Local Legend', icon: '🏠', description: 'Attend 50+ events', check: (s) => (s?.totalEvents ?? 0) >= 50 },
];

function getEarnedAchievements(stats: GameDisplay['stats']): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.check(stats));
}

export default function DesktopDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<any>(null);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinMessage, setSpinMessage] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [gameStats, setGameStats] = useState<Record<string, any>>({});
  const [storeConfig, setStoreConfig] = useState({ currency_name: 'Points', currency_icon: '⭐' });

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Run entrance animations after data loads
  useEffect(() => {
    if (loading || !playerData || hasAnimated.current) return;
    hasAnimated.current = true;

    const ctx = gsap.context(() => {
      // Hero card entrance
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
        );
      }

      // Cards staggered entrance
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll('.animate-card');
        gsap.fromTo(
          cards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power2.out',
            delay: 0.3,
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [loading, playerData]);

  // Load player data on mount
  useEffect(() => {
    async function loadPlayer() {
      if (!isLoaded) return;

      if (user) {
        try {
          const response = await fetch('/api/player/by-clerk');
          const data = await response.json();

          if (data.linked) {
            localStorage.setItem('hyperbolic_player_id', data.hyp_id);
            localStorage.setItem('hyperbolic_player_uuid', data.id);
            setPlayerData(data);
            setLoading(false);
            return;
          } else {
            router.push('/onboarding');
            return;
          }
        } catch (error) {
          console.error('Error loading player via Clerk:', error);
        }
      }

      const hypId = localStorage.getItem('hyperbolic_player_id');

      if (!hypId) {
        router.push(user ? '/onboarding' : '/sign-in');
        return;
      }

      try {
        const response = await fetch(`/api/player/${hypId}`);
        const data = await response.json();

        if (response.ok && !data.error) {
          setPlayerData(data);
        } else {
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

  // Load spin status
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

  // Load game stats for flippable cards
  useEffect(() => {
    async function loadGameStats() {
      if (!playerData || !user) return;

      try {
        const response = await fetch('/api/player/game-stats');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            // Convert array to map by gameId
            const statsMap: Record<string, any> = {};
            for (const stat of data.stats) {
              statsMap[stat.gameId] = stat;
            }
            setGameStats(statsMap);
          }
        }
      } catch (error) {
        console.error('Error loading game stats:', error);
      }
    }

    loadGameStats();
  }, [playerData, user]);

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

  // Load banners
  useEffect(() => {
    async function loadBanners() {
      try {
        const res = await fetch('/api/banners');
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
            backgroundImage: b.backgroundImage || null,
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
  }, []);

  // Derive display values
  const totalXp = playerData?.xp || 0;
  const level = Math.floor(totalXp / 100) + 1;
  const levelProgress = (totalXp % 100);
  const nextLevelXp = level * 100;

  // Transform game XP data
  const games: GameDisplay[] = (playerData?.gameXP || [])
    .filter((gxp: any) => gxp && gxp.game_id)
    .map((gxp: any) => {
      const slug = gxp.game_id || 'unknown';
      const config = GAME_CONFIG[slug] || { icon: '🎮', color: '#64748b' };
      const xpValue = gxp.game_xp || gxp.total_xp || gxp.xp || 0;
      const stats = gameStats[slug]; // Get stats for this game
      return {
        id: slug,
        name: slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        xpName: gxp.xpName || (slug === 'one_piece' ? 'Berries' : 'XP'),
        icon: config.icon,
        xp: xpValue,
        level: Math.floor(xpValue / 50) + 1,
        color: config.color,
        rank: gxp.rank || 'Newcomer',
        monthlyAttendance: gxp.monthlyAttendance || 0,
        monthlyThreshold: gxp.monthlyThreshold || (slug === 'one_piece' ? 6 : 3),
        earnedMonthlyBonus: gxp.earnedMonthlyBonus || false,
        achievementName: gxp.achievementName || (slug === 'one_piece' ? "Pirate's Life" : 'Hyperlife'),
        // Include stats from API
        stats: stats ? {
          totalEvents: stats.totalEvents,
          totalWins: stats.totalWins,
          totalLosses: stats.totalLosses,
          winRate: stats.winRate,
          bestPlacement: stats.bestPlacement,
          undefeatedCount: stats.undefeatedCount,
          currentStreak: stats.currentStreak,
          playingSince: stats.playingSince,
          monthlyEvents: stats.monthlyEvents,
          monthlyXp: stats.monthlyXp,
        } : undefined,
        // Leaderboard and next event from API
        leaderboardRank: stats?.leaderboardRank ?? undefined,
        leaderboardTotal: stats?.leaderboardTotal ?? undefined,
        nextEvent: stats?.nextEvent ?? undefined,
      };
    })
    .sort((a: GameDisplay, b: GameDisplay) => b.xp - a.xp);

  const displayedGames = games.slice(0, 6);

  // Transform activity - extended for desktop (show more items)
  const extendedActivity = (playerData?.recentActivity || []).slice(0, 12).map((a: any) => ({
    id: a.id,
    text: a.description || a.source?.replace(/_/g, ' ') || 'XP Earned',
    xp: a.final_xp || a.base_xp || 0,
    time: new Date(a.created_at).toLocaleDateString(),
    icon: getActivityIcon(a.source || a.description || ''),
  }));

  // Helper to get appropriate icon based on activity type
  function getActivityIcon(source: string): string {
    const s = source.toLowerCase();
    if (s.includes('win') || s.includes('undefeated')) return '🏆';
    if (s.includes('bounty')) return '⚔️';
    if (s.includes('referral')) return '🎁';
    if (s.includes('check') || s.includes('attend')) return '📍';
    if (s.includes('spin') || s.includes('gacha')) return '🎰';
    if (s.includes('purchase') || s.includes('buy')) return '🛒';
    if (s.includes('admin')) return '⭐';
    return '🎮';
  }

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

  // Avatar setup
  const avatar = playerData?.avatar || {};
  const avatarForComponent = {
    type: (avatar.photoUrl || avatar.photo_url) ? 'photo' as const : 'emoji' as const,
    base: avatar.base || avatar.emoji || '😎',
    photoUrl: avatar.photoUrl || avatar.photo_url || null,
    background: avatar.background || '#3b82f6',
    frame: avatar.frame || 'none',
    badge: avatar.badge || null,
  };

  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setBannerIndex(i => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);
  const liveBanner = banners[bannerIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🎮</div>
          <div className="text-secondary">Loading your profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-base text-primary overflow-x-hidden">
      {/* Ambient background glow */}

      <div className="min-h-screen relative z-10">
        {/* Main Content - no sidebar, layout provides it */}
        <main className="flex-1">
          {/* Hero Section */}
          <section
            className="px-10 pt-7 pb-10 relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h1 
                className="text-[22px] font-extrabold font-display text-accent"
              >
                HYPERBOLIC GAMES
              </h1>
              <div className="flex gap-2.5 items-center">
                <NotificationBell />
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/profile')}
                  className="w-[42px] h-[42px] bg-surface border border-border-token rounded-xl flex items-center justify-center text-lg transition-all hover:border-accent/30"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {/* Player Hero Card */}
            <div 
              ref={heroRef}
              className="group flex items-center gap-7 bg-surface border border-border-token rounded-3xl p-7 relative overflow-hidden transition-all hover:border-accent/20 hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
            >
              {/* Top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40" />
              <div className="absolute top-0 right-0 w-[300px] h-full bg-[radial-gradient(ellipse_at_right,rgba(0,200,234,0.05)_0%,transparent_70%)] pointer-events-none" />

              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-[100px] h-[100px] rounded-3xl flex items-center justify-center text-[50px] border-[3px] border-accent overflow-hidden"
                  style={avatarForComponent.photoUrl ? {} : { background: 'linear-gradient(135deg, #0a2a3a, #0f3a4a)' }}
                >
                  {avatarForComponent.photoUrl ? (
                    <img src={avatarForComponent.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    avatarForComponent.base
                  )}
                </div>
                <div 
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #eab308)',
                    boxShadow: '0 4px 15px rgba(249, 115, 22, 0.5)'
                  }}
                >
                  ⭐ Level {level}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 relative z-10">
                <h2 className="text-[32px] font-extrabold mb-0.5">
                  {playerData?.displayName || 'Player'}
                </h2>
                <div className="text-accent text-sm font-medium mb-4 tracking-wide">
                  {playerData?.hyp_id}
                </div>

                {/* XP Bar */}
                <div className="max-w-[380px]">
                  <div className="h-2.5 bg-surface rounded overflow-hidden relative bar-shine-on-hover">
                    <div 
                      className="h-full rounded relative"
                      style={{
                        background: 'var(--accent)',
                        width: `${levelProgress}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-secondary">XP to next level</span>
                    <span className="text-accent font-semibold">
                      {totalXp.toLocaleString()} / {nextLevelXp.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-3 relative z-10">
                <HeroStatCard value={games.length} label="Games" />
                <HeroStatCard value={totalXp} label="Total XP" />
                <HeroStatCard value={playerData?.gems || 0} label={storeConfig.currency_name} icon={storeConfig.currency_icon} />
              </div>
            </div>
          </section>

          {/* Content Grid - Two Column Layout */}
          <section ref={cardsRef} className="px-10 pb-10">
            <div className="grid grid-cols-[1fr_360px] gap-6">
              {/* Left Column: Actions, Banner, My Games */}
              <div className="flex flex-col gap-6">
                {/* Daily Spin */}
                <div className="animate-card">
                  <button
                    onClick={handleSpin}
                    disabled={hasSpunToday || isSpinning}
                    className="w-full bg-surface border border-border-token rounded-2xl p-6 flex items-center gap-4 transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(168,85,247,0.2)] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.2)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] relative z-10"
                      style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.1))' }}
                    >
                      🎰
                    </div>
                    <div className="relative z-10 text-left">
                      <div className="text-base font-bold text-primary">
                        {isSpinning ? 'Spinning…' : hasSpunToday ? 'Claimed!' : 'Daily Spin'}
                      </div>
                      <div className="text-xs text-secondary">
                        {spinMessage || (hasSpunToday ? 'Come back tomorrow' : 'Tap to earn XP')}
                      </div>
                    </div>
                    {!hasSpunToday && !isSpinning && (
                      <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    )}
                  </button>
                </div>

                {/* Live Banner */}
                {liveBanner && (
                  <div 
                    className="animate-card rounded-2xl relative overflow-hidden"
                    style={{
                      aspectRatio: '6 / 1',
                      minHeight: '120px',
                      boxShadow: `0 8px 30px ${liveBanner.colorFrom}4d`
                    }}
                  >
                    {/* Background Image or Gradient */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: liveBanner.backgroundImage
                          ? `url('${liveBanner.backgroundImage}')`
                          : `linear-gradient(135deg, ${liveBanner.colorFrom}, ${liveBanner.colorTo})`,
                        backgroundSize: (liveBanner as any).bgSize || 'cover',
                        backgroundPosition: (liveBanner as any).bgPosition || 'center',
                      }}
                    />
                    
                    {/* Icon - Top Left */}
                    <div className="absolute top-4 left-6 text-[48px] animate-bounce drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                      {liveBanner.icon}
                    </div>
                    
                    {/* Badge - Top Right */}
                    {liveBanner.badge && (
                      <div className="absolute top-4 right-6 inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        {liveBanner.badge}
                      </div>
                    )}
                    
                    {/* Title - Top Center */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2">
                      <div
                        className="text-3xl font-bold text-white"
                        style={{
                          textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 10px rgba(0,0,0,0.8)'
                        }}
                      >
                        {liveBanner.title}
                      </div>
                    </div>

                    {/* Subtitle - Center of banner */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div
                        className="text-lg font-medium text-white"
                        style={{
                          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0,0,0,0.8)'
                        }}
                      >
                        {liveBanner.subtitle}
                      </div>
                    </div>

                    {/* Dot indicators */}
                    {banners.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {banners.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setBannerIndex(i)}
                            className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Buttons - Bottom Right */}
                    {liveBanner.hasStream && (
                      <div className="absolute right-6 bottom-4 flex gap-3">
                        {liveBanner.twitchUrl && (
                          <a 
                            href={liveBanner.twitchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#9146ff] text-white flex items-center gap-2 hover:scale-105 transition-transform shadow-xl"
                          >
                            📺 Twitch
                          </a>
                        )}
                        {liveBanner.youtubeUrl && (
                          <a 
                            href={liveBanner.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#ff0000] text-white flex items-center gap-2 hover:scale-105 transition-transform shadow-xl"
                          >
                            ▶️ YouTube
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* My Games - Enhanced Tiles */}
                <div className="animate-card bg-surface border border-border-token rounded-2xl p-6 transition-all hover:border-border-strong">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-[15px] font-semibold flex items-center gap-2">
                      🎮 My Games
                    </h3>
                    <button 
                      onClick={() => router.push('/dashboard/profile')}
                      className="text-accent text-sm hover:underline"
                    >
                      View All ({games.length}) →
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {displayedGames.map((game) => (
                      <GameCard 
                        key={game.id}
                        game={game}
                        onClick={() => router.push(`/dashboard/community?game=${game.id}`)}
                        isExpanded={expandedGameId === game.id}
                        onExpand={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Card of the Day + Recent Activity */}
              <div className="flex flex-col gap-6">
                {/* Card of the Day - Featured at top */}
                <CardOfTheDay />

                {/* Recent Activity - Near other stats */}
                <div className="animate-card bg-surface border border-border-token rounded-2xl p-6 transition-all hover:border-border-strong">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-[15px] font-semibold flex items-center gap-2">
                      📋 Recent Activity
                    </h3>
                    <button 
                      onClick={() => router.push('/dashboard/profile')}
                      className="text-accent text-sm hover:underline"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    {extendedActivity.length > 0 ? (
                      extendedActivity.map((activity: any) => (
                        <div 
                          key={activity.id}
                          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-surface group"
                        >
                          <div className="w-[38px] h-[38px] bg-surface rounded-xl flex items-center justify-center text-base group-hover:bg-surface transition-colors shrink-0">
                            {activity.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{activity.text}</div>
                            <div className="text-[11px] text-secondary">{activity.time}</div>
                          </div>
                          <div className={`text-sm font-bold shrink-0 ${activity.xp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {activity.xp >= 0 ? '+' : ''}{activity.xp}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-secondary">
                        <div className="text-3xl mb-3">📋</div>
                        <p className="text-sm">No activity yet</p>
                        <p className="text-xs text-tertiary mt-1">Attend events to start earning XP!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sections - Full Width */}
            <div className="grid grid-cols-2 gap-6 mt-6">
              {/* Overall Stats Summary */}
              <div className="animate-card bg-surface border border-border-token rounded-2xl p-6 transition-all hover:border-border-strong">
                <h3 className="text-[15px] font-semibold flex items-center gap-2 mb-5">
                  📊 Your Stats
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-elevated border border-border-token rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-accent">{games.length}</div>
                    <div className="text-[10px] text-secondary uppercase mt-1">Games Played</div>
                  </div>
                  <div className="bg-elevated border border-border-token rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{playerData?.totalEventsAttended || 0}</div>
                    <div className="text-[10px] text-secondary uppercase mt-1">Events Attended</div>
                  </div>
                  <div className="bg-elevated border border-border-token rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-accent">{totalXp.toLocaleString()}</div>
                    <div className="text-[10px] text-secondary uppercase mt-1">Total XP</div>
                  </div>
                  <div className="bg-elevated border border-border-token rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">🔥 {playerData?.currentStreak || 0}</div>
                    <div className="text-[10px] text-secondary uppercase mt-1">Week Streak</div>
                  </div>
                </div>
              </div>

              {/* Upcoming Events You're Interested In */}
              <div className="animate-card bg-surface border border-border-token rounded-2xl p-6 transition-all hover:border-border-strong">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-[15px] font-semibold flex items-center gap-2">
                    📅 Your Upcoming Events
                  </h3>
                  <button 
                    onClick={() => router.push('/dashboard/events')}
                    className="text-accent text-sm hover:underline"
                  >
                    View Calendar →
                  </button>
                </div>
                <div className="space-y-3">
                  {/* Placeholder events - will be replaced with real data */}
                  <div className="flex items-center gap-3 p-3 bg-elevated border border-border-token rounded-xl">
                    <div className="w-10 h-10 bg-[#E63946]/20 rounded-lg flex items-center justify-center text-lg">🏴‍☠️</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">One Piece Local</div>
                      <div className="text-xs text-secondary">Saturday, 1:00 PM</div>
                    </div>
                    <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Registered</div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-elevated border border-border-token rounded-xl">
                    <div className="w-10 h-10 bg-[#8B5CF6]/20 rounded-lg flex items-center justify-center text-lg">✨</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">MTG Commander Night</div>
                      <div className="text-xs text-secondary">Friday, 6:00 PM</div>
                    </div>
                    <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">Interested</div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-surface rounded-xl opacity-60">
                    <div className="w-10 h-10 bg-elevated/50 rounded-lg flex items-center justify-center text-lg">📅</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-secondary">No more events this week</div>
                      <div className="text-xs text-tertiary">Check the calendar for more</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-2 gap-6 mt-6">
              {/* Store Highlights */}
              <div className="animate-card bg-surface border border-border-token rounded-2xl p-6 transition-all hover:border-border-strong">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-[15px] font-semibold flex items-center gap-2">
                    🛒 Store Highlights
                  </h3>
                  <button 
                    onClick={() => router.push('/dashboard/shop')}
                    className="text-accent text-sm hover:underline"
                  >
                    Visit Shop →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* Placeholder items - will be replaced with real data */}
                  <div className="bg-elevated border border-border-token rounded-xl p-3 text-center cursor-pointer hover:bg-elevated transition-colors">
                    <div className="text-3xl mb-2">🎨</div>
                    <div className="text-xs font-medium">Custom Avatar Frame</div>
                    <div className="text-[10px] text-accent mt-1">500 XP</div>
                  </div>
                  <div className="bg-elevated border border-border-token rounded-xl p-3 text-center cursor-pointer hover:bg-elevated transition-colors">
                    <div className="text-3xl mb-2">✨</div>
                    <div className="text-xs font-medium">Name Glow Effect</div>
                    <div className="text-[10px] text-accent mt-1">750 XP</div>
                  </div>
                  <div className="bg-elevated border border-border-token rounded-xl p-3 text-center cursor-pointer hover:bg-elevated transition-colors">
                    <div className="text-3xl mb-2">🏆</div>
                    <div className="text-xs font-medium">Trophy Badge</div>
                    <div className="text-[10px] text-accent mt-1">1,000 XP</div>
                  </div>
                </div>
              </div>

              {/* Friends Activity */}
              <div className="animate-card bg-surface border border-border-token rounded-2xl p-6 transition-all hover:border-border-strong">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-[15px] font-semibold flex items-center gap-2">
                    👥 Friends Activity
                  </h3>
                  <button 
                    onClick={() => router.push('/dashboard/community')}
                    className="text-accent text-sm hover:underline"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {/* Placeholder friends - will be replaced with real data */}
                  <div className="flex items-center gap-3 p-3 bg-elevated border border-border-token rounded-xl">
                    <div className="w-8 h-8 bg-accent/20 border border-accent/30 rounded-full flex items-center justify-center text-xs font-bold text-accent">JM</div>
                    <div className="flex-1">
                      <div className="text-sm"><span className="font-medium">JMoney</span> <span className="text-secondary">ranked up to</span> <span className="text-yellow-400">Warlord</span></div>
                      <div className="text-[10px] text-secondary">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-elevated border border-border-token rounded-xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold">SK</div>
                    <div className="flex-1">
                      <div className="text-sm"><span className="font-medium">SailorKing</span> <span className="text-secondary">won</span> <span className="text-green-400">3 matches</span> <span className="text-secondary">in One Piece</span></div>
                      <div className="text-[10px] text-secondary">5 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-elevated border border-border-token rounded-xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-xs font-bold">TC</div>
                    <div className="flex-1">
                      <div className="text-sm"><span className="font-medium">TCGMaster</span> <span className="text-secondary">earned</span> <span className="text-accent">+150 XP</span></div>
                      <div className="text-[10px] text-secondary">Yesterday</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes ambient {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(2%, 1%) rotate(1deg); }
          66% { transform: translate(-1%, 2%) rotate(-1deg); }
        }
        .animate-ambient {
          animation: ambient 20s ease-in-out infinite;
        }
        
        @keyframes bar-sweep {
          0% {
            left: -30%;
          }
          100% {
            left: 100%;
          }
        }
        .bar-shine-on-hover {
          position: relative;
          overflow: hidden;
        }
        .bar-shine-on-hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: -30%;
          width: 30%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          z-index: 1;
        }
        .bar-shine-on-hover > div {
          position: relative;
          z-index: 2;
        }
        .group:hover .bar-shine-on-hover::before {
          animation: bar-sweep 2s ease-in-out forwards;
        }
        
      `}</style>
    </div>
  );
}
