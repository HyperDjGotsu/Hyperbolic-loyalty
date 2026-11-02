// Legacy static palette for screens that haven't moved to useTheme() yet. Values are the web's Dark / Warm tone.
import { TONES } from '@/lib/tokens';
const W = TONES.warm.palette;

export const C = {
  bgBase:        W.bgBase,
  bgSurface:     W.bgSurface,
  bgElevated:    W.bgElevated,
  bgInput:       W.bgInput,
  textPrimary:   W.textPrimary,
  textSecondary: W.textSecondary,
  textTertiary:  W.textTertiary,
  accent:        W.accent,
  accentFg:      W.accentFg,
  xp:            W.xp,
  border:        W.border,
  borderStrong:  W.borderStrong,
  orange:        '#f97316',
  yellow:        '#eab308',
  success:       W.success,
  danger:        W.danger,
} as const;

// One level per 100 XP, same as the web Home and Profile.
const XP_PER_LEVEL = 100;

export function getLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function getXpProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

export function getXpToNext(xp: number): number {
  return XP_PER_LEVEL - (xp % XP_PER_LEVEL);
}
