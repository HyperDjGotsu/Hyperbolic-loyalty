'use client';

import React from 'react';

// ========== FLOATING PARTICLES ==========
export const FloatingParticles = () => {
  // Generate particles on client side only to avoid hydration mismatch
  const [particles, setParticles] = React.useState<Array<{
    left: string;
    top: string;
    width: string;
    height: string;
    background: string;
    animationDelay: string;
    animationDuration: string;
  }>>([]);

  React.useEffect(() => {
    const colors = ['#22d3ee', '#a855f7', '#ec4899', '#f97316'];
    setParticles(
      [...Array(20)].map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${Math.random() * 4 + 2}px`,
        height: `${Math.random() * 4 + 2}px`,
        background: colors[Math.floor(Math.random() * 4)],
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${Math.random() * 3 + 4}s`,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={particle}
        />
      ))}
    </div>
  );
};

// ========== AVATAR OPTIONS ==========
export const avatarOptions = {
  bases: ['😎', '🥷', '🧙', '👽', '🤖', '🦊', '🐲', '👾', '🎭', '🦁', '🐺', '🦅'],
  backgrounds: [
    { id: 'blue', color: '#3b82f6' },
    { id: 'purple', color: '#8b5cf6' },
    { id: 'pink', color: '#ec4899' },
    { id: 'red', color: '#ef4444' },
    { id: 'orange', color: '#f97316' },
    { id: 'green', color: '#22c55e' },
    { id: 'cyan', color: '#22d3ee' },
    { id: 'slate', color: '#64748b' },
  ],
  frames: [
    { id: 'none', name: 'None', style: 'border-transparent', cost: 0 },
    { id: 'silver', name: 'Silver', style: 'border-slate-400', cost: 100 },
    { id: 'gold', name: 'Gold', style: 'border-yellow-500', cost: 250 },
    { id: 'diamond', name: 'Diamond', style: 'border-cyan-400', cost: 500 },
  ],
  badges: ['🏴‍☠️', '⚡', '🔥', '💎', '👑', '🌟', '🎮', '🏆', '🎯', '💀', '🐉', '✨'],
};

// ========== AVATAR TYPES ==========
export interface AvatarData {
  type: 'emoji' | 'photo';
  base: string;
  photoUrl?: string | null;
  background: string;
  frame: string;
  badge?: string | null;
}

// ========== AVATAR COMPONENT ==========
interface AvatarProps {
  avatar: AvatarData;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  isOnline?: boolean | null;
  onClick?: () => void;
}

export const Avatar = ({
  avatar,
  size = 'md',
  showBadge = true,
  isOnline = null,
  onClick,
}: AvatarProps) => {
  const sizes = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-3xl',
    xl: 'w-28 h-28 text-4xl',
  };
  
  const frameStyles = avatarOptions.frames.find((f) => f.id === avatar.frame)?.style || '';

  return (
    <div className="relative inline-block" onClick={onClick}>
      <div
        className={`${sizes[size]} rounded-full p-0.5 cursor-pointer transition-transform hover:scale-105`}
        style={{
          background: `linear-gradient(135deg, ${avatar.background}, ${avatar.background}88)`,
        }}
      >
        <div
          className={`w-full h-full rounded-full bg-slate-900 flex items-center justify-center border-3 ${frameStyles} overflow-hidden`}
        >
          {avatar.type === 'photo' && avatar.photoUrl ? (
            <img src={avatar.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            avatar.base
          )}
        </div>
      </div>
      {showBadge && avatar.badge && (
        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-700 text-sm">
          {avatar.badge}
        </div>
      )}
      {isOnline !== null && (
        <div
          className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
            isOnline ? 'bg-green-500 animate-online' : 'bg-slate-600'
          }`}
        />
      )}
    </div>
  );
};

// ========== GLOW BUTTON ==========
interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  color?: 'cyan' | 'purple' | 'green' | 'orange';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export const GlowButton = ({
  children,
  onClick,
  color = 'cyan',
  disabled = false,
  className = '',
  type = 'button',
}: GlowButtonProps) => {
  const colors = {
    cyan: 'from-cyan-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
    green: 'from-emerald-500 to-cyan-500',
    orange: 'from-orange-500 to-yellow-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative bg-gradient-to-r ${colors[color]} text-white font-bold rounded-xl shadow-lg ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
      } transition-all ${className}`}
    >
      <div className="relative">{children}</div>
    </button>
  );
};

// ========== GAME XP CARD ==========
interface Game {
  id: string;
  name: string;
  xpName: string;
  icon: string;
  xp: number;
  level: number;
  color: string;
  rank: string;
}

interface GameXpCardProps {
  game: Game;
  isExpanded: boolean;
  onClick: () => void;
}

export const GameXpCard = ({ game, isExpanded, onClick }: GameXpCardProps) => (
  <div
    onClick={onClick}
    className={`bg-slate-800/80 rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${
      isExpanded ? 'border-cyan-500' : 'border-transparent'
    }`}
    style={{ borderLeftColor: game.color, borderLeftWidth: '4px' }}
  >
    <div className="p-3 flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ backgroundColor: `${game.color}30` }}
      >
        {game.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{game.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            Lv.{game.level || 1}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(game.xp || 0) % 100}%`, backgroundColor: game.color }}
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">{(game.xp || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
    {isExpanded && (
      <div className="px-3 pb-3 pt-1 border-t border-slate-700/50">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">
            Rank: <span className="text-white">{game.rank}</span>
          </span>
          <span className="text-slate-400">
            {game.xpName}: <span style={{ color: game.color }}>{(game.xp || 0).toLocaleString()}</span>
          </span>
        </div>
      </div>
    )}
  </div>
);

// ========== STREAM BUTTONS ==========
interface StreamButtonsProps {
  hasStream: boolean;
  streamStarting?: boolean;
  size?: 'sm' | 'md';
}

export const StreamButtons = ({ hasStream, streamStarting, size = 'sm' }: StreamButtonsProps) => {
  if (!hasStream) return null;
  const cls = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <div className="flex gap-2">
      <button className={`flex items-center gap-1 ${cls} bg-purple-600 text-white rounded-lg`}>
        📺 Twitch{' '}
        {streamStarting && <span className="w-2 h-2 bg-red-500 rounded-full animate-live" />}
      </button>
      <button className={`flex items-center gap-1 ${cls} bg-red-600 text-white rounded-lg`}>
        ▶️ YouTube
      </button>
    </div>
  );
};

// ========== STAT CARD ==========
interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

export const StatCard = ({ icon, label, value, color }: StatCardProps) => (
  <div className="bg-slate-900/50 rounded-xl p-2 flex items-center gap-2">
    <span className="text-xl">{icon}</span>
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-bold ${color || 'text-white'}`}>{value}</div>
    </div>
  </div>
);

// ========== RARITY COLORS ==========
export const rarityColors = {
  common: { primary: '#64748b', glow: '#94a3b8', name: 'Common' },
  uncommon: { primary: '#22c55e', glow: '#4ade80', name: 'Uncommon' },
  rare: { primary: '#3b82f6', glow: '#60a5fa', name: 'Rare' },
  epic: { primary: '#a855f7', glow: '#c084fc', name: 'Epic' },
  legendary: { primary: '#fbbf24', glow: '#fcd34d', name: 'Legendary' },
};
