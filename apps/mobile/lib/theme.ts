export const C = {
  bgBase:        '#111009',
  bgSurface:     '#1a1810',
  bgElevated:    '#222018',
  bgInput:       '#1e1c14',
  textPrimary:   '#f2efe8',
  textSecondary: '#a89f90',
  textTertiary:  '#7a7060',
  accent:        '#c4b5fd',
  accentFg:      '#111009',
  xp:            '#f4c542',
  border:        'rgba(242,239,232,0.08)',
  borderStrong:  'rgba(242,239,232,0.14)',
  orange:        '#f97316',
  yellow:        '#eab308',
  success:       '#22c55e',
  danger:        '#ef4444',
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
