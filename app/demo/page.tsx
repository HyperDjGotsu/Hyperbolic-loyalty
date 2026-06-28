'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Scouter-style number counting component
function ScouterNumber({ 
  value, 
  duration = 800,
  className = '',
  trigger = 0
}: { 
  value: number; 
  duration?: number;
  className?: string;
  trigger?: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const isAnimatingRef = useRef(false);
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (!isAnimatingRef.current) {
      setDisplayValue(value);
    }
  }, [value]);

  const animateCount = useCallback((targetValue: number) => {
    if (targetValue === 0 || isAnimatingRef.current) return;
    
    isAnimatingRef.current = true;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
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

  useEffect(() => {
    if (trigger > 0 && trigger !== lastTriggerRef.current && value > 0) {
      lastTriggerRef.current = trigger;
      animateCount(value);
    }
  }, [trigger, value, animateCount]);

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
    </span>
  );
}

// Helper functions
function formatPlacement(placement: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = placement % 100;
  return placement + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function formatPlayingSince(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Type definitions
interface GameStats {
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
}

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
  earnedMonthlyBonus?: boolean;
  achievementName?: string;
  stats?: GameStats;
  leaderboardRank?: number;
  leaderboardTotal?: number;
  nextEvent?: {
    name: string;
    date: string;
    time: string;
  };
}

// Achievement definitions
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

// Game Card Component
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

  const hasRichStats = stats.matches > 0 || stats.bestPlacement !== null || stats.wins > 0;

  // Calculate earned achievements
  const earnedAchievements = getEarnedAchievements(game.stats);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
    onExpand();
  };

  useEffect(() => {
    if (!isExpanded && isFlipped) {
      setIsFlipped(false);
    }
  }, [isExpanded, isFlipped]);

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
          className="bg-base border border-border-token rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] relative overflow-hidden group h-full"
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
                className="text-[28px] font-bold text-cyan-400"
              />
              <span className="text-xs text-tertiary">{game.xpName}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-tertiary uppercase tracking-wide">Next Rank</span>
              <span className="text-[10px] text-secondary">{xpToNextRank} {game.xpName} to go</span>
            </div>
            <div className="h-[6px] bg-elevated rounded overflow-hidden">
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
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-semibold" style={{ color: game.color }}>
                {game.achievementName}
              </span>
              {game.earnedMonthlyBonus && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">
                  ✓ Complete!
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-[5px] bg-base rounded overflow-hidden">
                <div 
                  className="h-full rounded"
                  style={{ 
                    background: game.earnedMonthlyBonus ? '#22c55e' : game.color,
                    width: `${Math.min((game.monthlyAttendance || 0) / (game.monthlyThreshold || 4) * 100, 100)}%`
                  }}
                />
              </div>
              <span className="text-[11px] text-secondary font-medium whitespace-nowrap">
                {game.monthlyAttendance || 0}/{game.monthlyThreshold || 4}
              </span>
            </div>
          </div>
          
          <div className="absolute bottom-2 right-2 text-[10px] text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
            Click for stats
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 bg-base border border-border-token rounded-2xl p-5 cursor-pointer overflow-hidden flex flex-col"
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
              className="text-xs text-tertiary hover:text-primary transition-colors px-3 py-1.5 rounded-lg bg-elevated hover:bg-input"
              onClick={handleClick}
            >
              ✕ Close
            </button>
          </div>

          {hasRichStats ? (
            <>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-elevated rounded-lg p-2.5">
                  <div className="text-[9px] text-tertiary uppercase mb-1">XP</div>
                  <div className="text-base font-bold" style={{ color: game.color }}>{game.xp.toLocaleString()}</div>
                </div>
                <div className="bg-elevated rounded-lg p-2.5">
                  <div className="text-[9px] text-tertiary uppercase mb-1">Events</div>
                  <div className="text-base font-bold text-cyan-400">{stats.totalEvents}</div>
                </div>
                <div className="bg-elevated rounded-lg p-2.5">
                  <div className="text-[9px] text-tertiary uppercase mb-1">Win Rate</div>
                  <div className="text-base font-bold text-green-400">{stats.winRate}%</div>
                </div>
                <div className="bg-elevated rounded-lg p-2.5">
                  <div className="text-[9px] text-tertiary uppercase mb-1">Streak</div>
                  <div className="text-base font-bold text-yellow-400">🔥{stats.currentStreak}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-elevated rounded-lg p-2.5 flex justify-between items-center">
                  <span className="text-[10px] text-tertiary">Matches</span>
                  <span className="text-sm font-bold">{stats.matches}</span>
                </div>
                <div className="bg-elevated rounded-lg p-2.5 flex justify-between items-center">
                  <span className="text-[10px] text-tertiary">Best</span>
                  <span className="text-sm font-bold">🏆 {stats.bestPlacement || '—'}</span>
                </div>
                <div className="bg-elevated rounded-lg p-2.5 flex justify-between items-center">
                  <span className="text-[10px] text-tertiary">Since</span>
                  <span className="text-sm font-bold">{stats.firstPlayed || '—'}</span>
                </div>
              </div>

              <div className="bg-elevated rounded-lg p-2.5 mb-3 flex justify-between items-center">
                <span className="text-[10px] text-tertiary">Record</span>
                <span className="text-sm">
                  <span className="text-green-400 font-bold">{stats.wins}W</span>
                  <span className="text-tertiary mx-1">-</span>
                  <span className="text-red-400 font-bold">{stats.losses}L</span>
                </span>
              </div>

              {/* Achievements */}
              {earnedAchievements.length > 0 && (
                <div className="mb-3">
                  <div className="text-[9px] text-tertiary uppercase mb-2">Achievements</div>
                  <div className="flex flex-wrap gap-1.5">
                    {earnedAchievements.slice(0, 6).map((achievement) => (
                      <div 
                        key={achievement.id}
                        className="bg-elevated rounded-lg px-2 py-1 flex items-center gap-1.5 group relative"
                        title={achievement.description}
                      >
                        <span className="text-sm">{achievement.icon}</span>
                        <span className="text-[10px] font-medium text-secondary">{achievement.name}</span>
                      </div>
                    ))}
                    {earnedAchievements.length > 6 && (
                      <div className="bg-elevated rounded-lg px-2 py-1 text-[10px] text-tertiary">
                        +{earnedAchievements.length - 6} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Leaderboard Rank & Next Event Row */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Leaderboard Rank */}
                <div className="bg-elevated rounded-lg p-2.5">
                  <div className="text-[9px] text-tertiary uppercase mb-1">Leaderboard</div>
                  {game.leaderboardRank ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-bold" style={{ color: game.color }}>#{game.leaderboardRank}</span>
                      <span className="text-[10px] text-tertiary">of {game.leaderboardTotal}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-tertiary">—</div>
                  )}
                </div>

                {/* Next Event */}
                <div className="bg-elevated rounded-lg p-2.5">
                  <div className="text-[9px] text-tertiary uppercase mb-1">Next Event</div>
                  {game.nextEvent ? (
                    <div>
                      <div className="text-[11px] font-medium text-primary truncate">{game.nextEvent.name}</div>
                      <div className="text-[10px] text-secondary">{game.nextEvent.date} • {game.nextEvent.time}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-tertiary">No upcoming events</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-elevated rounded-lg p-3">
                  <div className="text-[10px] text-tertiary uppercase mb-1">Total XP</div>
                  <div className="text-xl font-bold" style={{ color: game.color }}>{game.xp.toLocaleString()}</div>
                </div>
                <div className="bg-elevated rounded-lg p-3">
                  <div className="text-[10px] text-tertiary uppercase mb-1">Events</div>
                  <div className="text-xl font-bold text-cyan-400">{stats.totalEvents}</div>
                </div>
              </div>
              
              <div className="bg-elevated/50 rounded-lg p-3 mb-4 text-center">
                <div className="text-tertiary text-xs">Play in tournaments to unlock detailed stats!</div>
              </div>
            </>
          )}

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

// MOCK DATA - Simulating veteran players with lots of stats
const MOCK_GAMES: GameDisplay[] = [
  {
    id: 'one_piece',
    name: 'One Piece',
    xpName: 'Berries',
    icon: '🏴‍☠️',
    xp: 2847,
    level: 57,
    color: '#E63946',
    rank: 'Yonko Commander',
    monthlyAttendance: 7,
    monthlyThreshold: 8,
    earnedMonthlyBonus: false,
    achievementName: "Pirate's Life",
    leaderboardRank: 3,
    leaderboardTotal: 47,
    nextEvent: {
      name: 'One Piece Local',
      date: 'Sat, Jan 25',
      time: '1:00 PM',
    },
    stats: {
      totalEvents: 47,
      totalWins: 89,
      totalLosses: 34,
      winRate: 72,
      bestPlacement: 1,
      undefeatedCount: 8,
      currentStreak: 5,
      playingSince: '2024-03-15',
      monthlyEvents: 7,
      monthlyXp: 450,
    },
  },
  {
    id: 'pokemon',
    name: 'Pokemon',
    xpName: 'Pokepoints',
    icon: '⚡',
    xp: 1523,
    level: 31,
    color: '#FACC15',
    rank: 'Ace Trainer',
    monthlyAttendance: 3,
    monthlyThreshold: 4,
    earnedMonthlyBonus: false,
    achievementName: 'Hyperlife',
    leaderboardRank: 8,
    leaderboardTotal: 32,
    nextEvent: {
      name: 'Pokemon League',
      date: 'Sun, Jan 26',
      time: '2:00 PM',
    },
    stats: {
      totalEvents: 28,
      totalWins: 42,
      totalLosses: 21,
      winRate: 67,
      bestPlacement: 2,
      undefeatedCount: 3,
      currentStreak: 2,
      playingSince: '2024-06-01',
      monthlyEvents: 3,
      monthlyXp: 180,
    },
  },
  {
    id: 'mtg',
    name: 'Magic: The Gathering',
    xpName: 'Mana Marks',
    icon: '✨',
    xp: 3200,
    level: 64,
    color: '#8B5CF6',
    rank: 'Planeswalker',
    monthlyAttendance: 4,
    monthlyThreshold: 4,
    earnedMonthlyBonus: true,
    achievementName: 'Hyperlife',
    leaderboardRank: 1,
    leaderboardTotal: 58,
    nextEvent: {
      name: 'Commander Night',
      date: 'Fri, Jan 24',
      time: '6:00 PM',
    },
    stats: {
      totalEvents: 52,
      totalWins: 156,
      totalLosses: 67,
      winRate: 70,
      bestPlacement: 1,
      undefeatedCount: 12,
      currentStreak: 8,
      playingSince: '2023-11-20',
      monthlyEvents: 4,
      monthlyXp: 320,
    },
  },
  {
    id: 'gundam',
    name: 'Gundam',
    xpName: 'Pilot Points',
    icon: '🤖',
    xp: 890,
    level: 18,
    color: '#3B82F6',
    rank: 'Ensign',
    monthlyAttendance: 2,
    monthlyThreshold: 4,
    earnedMonthlyBonus: false,
    achievementName: 'Hyperlife',
    leaderboardRank: 12,
    leaderboardTotal: 24,
    nextEvent: {
      name: 'Gundam Card Game',
      date: 'Sat, Jan 25',
      time: '4:00 PM',
    },
    stats: {
      totalEvents: 12,
      totalWins: 18,
      totalLosses: 14,
      winRate: 56,
      bestPlacement: 3,
      undefeatedCount: 1,
      currentStreak: 0,
      playingSince: '2024-09-10',
      monthlyEvents: 2,
      monthlyXp: 90,
    },
  },
  {
    id: 'star_wars',
    name: 'Star Wars Unlimited',
    xpName: 'Holopoints',
    icon: '🌟',
    xp: 425,
    level: 9,
    color: '#00d4ff',
    rank: 'Padawan',
    monthlyAttendance: 1,
    monthlyThreshold: 4,
    earnedMonthlyBonus: false,
    achievementName: 'Hyperlife',
    leaderboardRank: 18,
    leaderboardTotal: 29,
    nextEvent: {
      name: 'SWU Weekly',
      date: 'Thu, Jan 23',
      time: '6:00 PM',
    },
    stats: {
      totalEvents: 5,
      totalWins: 6,
      totalLosses: 8,
      winRate: 43,
      bestPlacement: 4,
      undefeatedCount: 0,
      currentStreak: 1,
      playingSince: '2024-12-01',
      monthlyEvents: 1,
      monthlyXp: 45,
    },
  },
  {
    id: 'lorcana',
    name: 'Lorcana',
    xpName: 'XP',
    icon: '🪄',
    xp: 150,
    level: 3,
    color: '#EC4899',
    rank: 'Apprentice',
    monthlyAttendance: 1,
    monthlyThreshold: 4,
    earnedMonthlyBonus: false,
    achievementName: 'Hyperlife',
    // No leaderboard or next event for this one - minimal stats player
    stats: {
      totalEvents: 2,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      bestPlacement: null,
      undefeatedCount: 0,
      currentStreak: 0,
      playingSince: '2025-01-10',
      monthlyEvents: 1,
      monthlyXp: 50,
    },
  },
];

export default function MockDemoPage() {
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-base text-primary p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🎮 Mock Data Demo</h1>
          <p className="text-secondary">Preview of game cards with rich stats data. Click cards to flip!</p>
          <div className="mt-4 p-4 bg-elevated rounded-xl border border-border-token">
            <h3 className="text-sm font-semibold text-cyan-400 mb-2">Legend:</h3>
            <ul className="text-xs text-secondary space-y-1">
              <li>• <span className="text-green-400">One Piece, Pokemon, MTG, Gundam, Star Wars</span> — Have match history → Expands 2x2</li>
              <li>• <span className="text-pink-400">Lorcana</span> — No wins/matches → Stays 1x1 compact flip</li>
            </ul>
          </div>
        </div>

        {/* Games Grid */}
        <div className="bg-surface border border-border-token rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🎮 My Games
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {MOCK_GAMES.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onClick={() => console.log('View leaderboard:', game.name)}
                isExpanded={expandedGameId === game.id}
                onExpand={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
              />
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 p-4 bg-elevated rounded-xl border border-border-token">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">Mock Player Summary:</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-400">146</div>
              <div className="text-xs text-tertiary">Total Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">311</div>
              <div className="text-xs text-tertiary">Total Wins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">9,035</div>
              <div className="text-xs text-tertiary">Total XP</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">67%</div>
              <div className="text-xs text-tertiary">Avg Win Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
