'use client';

import React from 'react';

// ── Button ─────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  loading?: boolean;
}

const buttonBase = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:   'bg-accent text-accent-fg hover:opacity-90 active:opacity-80',
  secondary: 'border border-strong bg-transparent text-primary hover:bg-elevated active:bg-surface',
  ghost:     'bg-transparent text-secondary hover:text-primary active:text-primary',
  danger:    'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

// ── Card ───────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({ elevated, className = '', children, ...props }) => (
  <div
    className={`${elevated ? 'card-elevated' : 'card'} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// ── Badge ──────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'xp';

const badgeColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--border-strong)] text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger:  'bg-danger/10 text-danger',
  accent:  'bg-accent/10 text-accent',
  xp:      'bg-xp/10 text-xp',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', className = '', children, ...props }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColors[variant]} ${className}`}
    {...props}
  >
    {children}
  </span>
);

// ── Input ──────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-secondary">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full bg-input border border-token rounded-lg px-3 py-2 text-sm text-primary placeholder:text-tertiary
          focus:outline-none focus:border-accent transition-colors duration-150 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ── Divider ────────────────────────────────────────────────────────────────

export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`border-t border-token ${className}`} />
);

// ── ThemeToggle ────────────────────────────────────────────────────────────

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const tone = next === 'light' ? 'paper' : 'warm';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.setAttribute('data-tone', tone);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center justify-center w-8 h-8 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
};

// ── Avatar (preserved — dashboard tasks will refactor this) ───────────────

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
            isOnline ? 'bg-green-500' : 'bg-slate-600'
          }`}
        />
      )}
    </div>
  );
};

// ── GlowButton (deprecated alias — use Button variant="primary") ───────────
export const GlowButton = Button;

// ── StatCard ───────────────────────────────────────────────────────────────

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: string;
  color?: string;
  className?: string;
}> = ({ label, value, sublabel, icon, color, className = '' }) => (
  <Card className={`p-4 ${className}`}>
    {icon && <p className="text-lg mb-1">{icon}</p>}
    <p className="text-xs font-medium text-tertiary uppercase tracking-wide mb-1">{label}</p>
    <p className={`font-display text-3xl font-black ${color || 'text-primary'}`}>{value}</p>
    {sublabel && <p className="text-xs text-secondary mt-0.5">{sublabel}</p>}
  </Card>
);

// ── GameXpCard (preserved) ─────────────────────────────────────────────────

interface Game {
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
}

interface GameXpCardProps {
  game: Game;
  isExpanded: boolean;
  onClick: () => void;
}

export const GameXpCard = ({ game, isExpanded, onClick }: GameXpCardProps) => {
  const attendance = game.monthlyAttendance || 0;
  const threshold = game.monthlyThreshold || (game.id === 'one_piece' ? 6 : 3);
  const achievementName = game.achievementName || (game.id === 'one_piece' ? "Pirate's Life" : 'Hyperlife');
  const earned = game.earnedMonthlyBonus || false;
  const progress = Math.min(attendance, threshold);
  const isComplete = attendance >= threshold;
  const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });

  return (
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
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs">{game.id === 'one_piece' ? '🏴' : '⏳'}</span>
            <div className="flex gap-0.5">
              {[...Array(threshold)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < progress
                      ? earned
                        ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50'
                        : isComplete
                          ? 'bg-green-400 shadow-sm shadow-green-400/50'
                          : 'bg-cyan-400'
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <span className={`text-xs ${earned ? 'text-yellow-400' : isComplete ? 'text-green-400' : 'text-slate-500'}`}>
              {earned ? `✓ ${achievementName}` : `${progress}/${threshold} ${currentMonth}`}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-700/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">
              Rank: <span className="text-white">{game.rank}</span>
            </span>
            <span className="text-slate-400">
              {game.xpName}: <span style={{ color: game.color }}>{(game.xp || 0).toLocaleString()}</span>
            </span>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{game.id === 'one_piece' ? '🏴' : '⏳'}</span>
                <span className="text-xs font-medium text-white">{achievementName}</span>
              </div>
              {earned ? (
                <span className="text-xs text-yellow-400 font-medium">+30 XP Earned!</span>
              ) : isComplete ? (
                <span className="text-xs text-green-400 font-medium">Complete! +30 XP pending</span>
              ) : (
                <span className="text-xs text-slate-400">{threshold - progress} more to go</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Attend {threshold} events this month to earn +30 bonus XP
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── avatarOptions (preserved for backward compat) ──────────────────────────

export const avatarOptions = {
  bases: ['😎', '🥷', '🧙', '👽', '🤖', '🦊', '🐲', '👾', '🎭', '🦁', '🐺', '🦅'],
  backgrounds: [
    { id: 'blue',   color: '#3b82f6' },
    { id: 'purple', color: '#8b5cf6' },
    { id: 'pink',   color: '#ec4899' },
    { id: 'red',    color: '#ef4444' },
    { id: 'orange', color: '#f97316' },
    { id: 'green',  color: '#22c55e' },
    { id: 'cyan',   color: '#22d3ee' },
    { id: 'slate',  color: '#64748b' },
  ],
  frames: [
    { id: 'none',    name: 'None',    style: 'border-transparent', cost: 0 },
    { id: 'silver',  name: 'Silver',  style: 'border-slate-400',   cost: 100 },
    { id: 'gold',    name: 'Gold',    style: 'border-yellow-500',  cost: 250 },
    { id: 'diamond', name: 'Diamond', style: 'border-cyan-400',    cost: 500 },
  ],
  badges: ['🏴‍☠️', '⚡', '🔥', '💎', '👑', '🌟', '🎮', '🏆', '🎯', '💀', '🐉', '✨'],
};

// ── AvatarData type (preserved for backward compat) ────────────────────────

export interface AvatarData {
  type: 'emoji' | 'photo';
  base: string;
  photoUrl?: string | null;
  background: string;
  frame: string;
  badge?: string | null;
}
