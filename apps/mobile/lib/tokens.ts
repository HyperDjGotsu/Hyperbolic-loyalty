// Design tokens, mirroring apps/web/app/globals.css. Same six tones, same names.
// Dark / Warm is the default, as on the web.

export type ThemeMode = 'dark' | 'light';
export type ToneKey = 'warm' | 'slate' | 'ink' | 'paper' | 'cloud' | 'pure';

export type Palette = {
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgInput: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentFg: string;
  // Fixed across tones, like the web's preserved semantic colors
  xp: string;
  success: string;
  warning: string;
  danger: string;
};

const FIXED = { xp: '#f4c542', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444' } as const;
const DARK_ACCENT = { accent: '#3ddc6a', accentFg: '#06140a' } as const;
const LIGHT_ACCENT = { accent: '#15803d', accentFg: '#ffffff' } as const;

export const TONES: Record<ToneKey, { label: string; mode: ThemeMode; palette: Palette }> = {
  warm: {
    label: 'Warm', mode: 'dark',
    palette: {
      bgBase: '#1f1e1b', bgSurface: '#292824', bgElevated: '#34322d', bgInput: '#2b2a26',
      textPrimary: '#f2efe8', textSecondary: '#a89f90', textTertiary: '#7a7060',
      border: 'rgba(242,239,232,0.14)', borderStrong: 'rgba(242,239,232,0.40)', ...DARK_ACCENT, ...FIXED,
    },
  },
  slate: {
    label: 'Slate', mode: 'dark',
    palette: {
      bgBase: '#0f1014', bgSurface: '#16181e', bgElevated: '#1e2028', bgInput: '#1a1c24',
      textPrimary: '#eef0f6', textSecondary: '#7880a0', textTertiary: '#50587a',
      border: 'rgba(238,240,246,0.14)', borderStrong: 'rgba(238,240,246,0.40)', ...DARK_ACCENT, ...FIXED,
    },
  },
  ink: {
    label: 'Ink', mode: 'dark',
    palette: {
      bgBase: '#090909', bgSurface: '#111111', bgElevated: '#1a1a1a', bgInput: '#141414',
      textPrimary: '#f0f0f0', textSecondary: '#707070', textTertiary: '#484848',
      border: 'rgba(240,240,240,0.14)', borderStrong: 'rgba(240,240,240,0.40)', ...DARK_ACCENT, ...FIXED,
    },
  },
  paper: {
    label: 'Paper', mode: 'light',
    palette: {
      bgBase: '#e8e3d8', bgSurface: '#ddd8cc', bgElevated: '#ede9e0', bgInput: '#e4dfd4',
      textPrimary: '#1a1810', textSecondary: '#6b6258', textTertiary: '#9a9288',
      border: 'rgba(0,0,0,0.28)', borderStrong: 'rgba(0,0,0,0.45)', ...LIGHT_ACCENT, ...FIXED,
    },
  },
  cloud: {
    label: 'Cloud', mode: 'light',
    palette: {
      bgBase: '#f6f7f9', bgSurface: '#eef0f4', bgElevated: '#ffffff', bgInput: '#f0f2f5',
      textPrimary: '#111318', textSecondary: '#60687a', textTertiary: '#8890a4',
      border: 'rgba(0,0,0,0.28)', borderStrong: 'rgba(0,0,0,0.45)', ...LIGHT_ACCENT, ...FIXED,
    },
  },
  pure: {
    label: 'Pure', mode: 'light',
    palette: {
      bgBase: '#ffffff', bgSurface: '#f4f4f5', bgElevated: '#ffffff', bgInput: '#f8f8f8',
      textPrimary: '#09090b', textSecondary: '#52525b', textTertiary: '#a1a1aa',
      border: 'rgba(0,0,0,0.28)', borderStrong: 'rgba(0,0,0,0.45)', ...LIGHT_ACCENT, ...FIXED,
    },
  },
};

export const DEFAULT_TONE: ToneKey = 'warm';
