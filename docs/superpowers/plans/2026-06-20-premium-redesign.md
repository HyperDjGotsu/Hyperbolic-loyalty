# Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AI-slop aesthetic (neon glows, floating particles, Orbitron font, cyan/purple radial gradients) with a premium warm-dark UI built on a CSS design token system that stores can theme.

**Architecture:** CSS custom properties define all visual values on `<html data-theme data-tone>`. Tailwind reads from these via `var()`. Pages import only semantic token classes — no hardcoded hex values anywhere in components. Store themes override only `--accent` and `--accent-fg`.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3, Google Fonts (Fraunces + Plus Jakarta Sans), Clerk (appearance override)

## Global Constraints

- Never use hardcoded hex colors in component JSX after Task 1 — always `var(--token-name)` or a Tailwind class that maps to one
- No `glow-*`, `pulse-glow`, `float`, `bounce-subtle` animation classes anywhere after Task 3
- No `font-orbitron` or `font-rajdhani` class after Task 2
- Lavender (`--accent`) used **only** in landing, sign-in, sign-up, onboarding pages
- Every task ends with `npm run build` passing and a visual check at the relevant URL
- Commit after every task — small, focused commits
- DailyGacha component is out of scope — do not touch it
- Game-specific colors (bounty theme, One Piece red) are preserved

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `tailwind.config.ts` | Modify | Add token-mapped colors, remove hyper.* colors, remove slop animations |
| `app/globals.css` | Rewrite | Define all CSS token variables for all 6 theme/tone combos, remove slop classes |
| `app/layout.tsx` | Modify | Swap fonts, update Clerk appearance, set default `data-theme`/`data-tone` on `<html>` |
| `components/ui/index.tsx` | Modify | Delete FloatingParticles, rewrite Button/Card/Badge, add ThemeToggle |
| `app/page.tsx` | Modify | Landing page redesign — lavender accent, premium layout |
| `app/sign-in/[[...sign-in]]/page.tsx` | Modify | Auth page — lavender accent |
| `app/sign-up/[[...sign-up]]/page.tsx` | Modify | Auth page — lavender accent |
| `app/onboarding/page.tsx` | Modify | Onboarding — lavender accent, clean step flow |
| `app/dashboard/layout.tsx` | Modify | Sidebar + bottom nav — neutral, no accent |
| `app/dashboard/page.tsx` | Modify | Main dashboard — neutral cards, clean XP display |
| `app/dashboard/profile/page.tsx` | Modify | Profile page |
| `app/dashboard/community/page.tsx` | Modify | Leaderboard |
| `app/dashboard/events/page.tsx` | Modify | Events calendar |
| `app/dashboard/shop/page.tsx` | Modify | Shop UI |
| `app/event/[id]/page.tsx` | Modify | Public event share page |
| `app/checkin/page.tsx` | Modify | Check-in flow |
| `app/hq/page.tsx` | Modify | Staff HQ — neutral, high contrast |
| `app/kiosk/page.tsx` | Modify | Kiosk — large type, high contrast |

---

### Task 1: Token System — Tailwind + CSS Variables

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

**What this does:** Establishes the full CSS token system. After this task, every color in the app can be expressed as a Tailwind class like `bg-surface`, `text-primary`, `border-token` that maps to a CSS variable. All 6 theme/tone combos defined.

- [ ] **Step 1: Rewrite `tailwind.config.ts`**

Replace the entire file with:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic design tokens — all map to CSS variables
        base:     'var(--bg-base)',
        surface:  'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        input:    'var(--bg-input)',
        primary:  'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        'border-token': 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent:   'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        // Preserved semantic colors
        xp:       '#f4c542',
        success:  '#22c55e',
        warning:  '#f59e0b',
        danger:   '#ef4444',
        // One Piece bounty theme (preserved)
        bounty: {
          wood:   '#8B4513',
          dark:   '#654321',
          border: '#5D3A1A',
          text:   '#2D1B0E',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans:    ['var(--font-sans)', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      animation: {
        'shine': 'shine 1.5s ease-in-out',
      },
      keyframes: {
        shine: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Rewrite `app/globals.css`**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Fonts ─────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

:root {
  --font-display: 'Fraunces', serif;
  --font-sans:    'Plus Jakarta Sans', sans-serif;
}

/* ── Dark / Warm (default) ──────────────────────────────── */
:root,
[data-theme="dark"][data-tone="warm"] {
  --bg-base:        #111009;
  --bg-surface:     #1a1810;
  --bg-elevated:    #222018;
  --bg-input:       #1e1c14;
  --text-primary:   #f2efe8;
  --text-secondary: #8a8070;
  --text-tertiary:  #5a5448;
  --border:         rgba(242,239,232,0.07);
  --border-strong:  rgba(242,239,232,0.13);
  --accent:         #c4b5fd;
  --accent-fg:      #111009;
}

/* ── Dark / Slate ───────────────────────────────────────── */
[data-theme="dark"][data-tone="slate"] {
  --bg-base:        #0f1014;
  --bg-surface:     #16181e;
  --bg-elevated:    #1e2028;
  --bg-input:       #1a1c24;
  --text-primary:   #eef0f6;
  --text-secondary: #7880a0;
  --text-tertiary:  #50587a;
  --border:         rgba(238,240,246,0.07);
  --border-strong:  rgba(238,240,246,0.13);
  --accent:         #c4b5fd;
  --accent-fg:      #0f1014;
}

/* ── Dark / Ink ─────────────────────────────────────────── */
[data-theme="dark"][data-tone="ink"] {
  --bg-base:        #090909;
  --bg-surface:     #111111;
  --bg-elevated:    #1a1a1a;
  --bg-input:       #141414;
  --text-primary:   #f0f0f0;
  --text-secondary: #707070;
  --text-tertiary:  #484848;
  --border:         rgba(240,240,240,0.07);
  --border-strong:  rgba(240,240,240,0.13);
  --accent:         #c4b5fd;
  --accent-fg:      #090909;
}

/* ── Light / Paper ──────────────────────────────────────── */
[data-theme="light"][data-tone="paper"] {
  --bg-base:        #faf8f4;
  --bg-surface:     #f2efe8;
  --bg-elevated:    #ffffff;
  --bg-input:       #f5f2ec;
  --text-primary:   #1a1810;
  --text-secondary: #6b6258;
  --text-tertiary:  #9a9288;
  --border:         rgba(26,24,16,0.08);
  --border-strong:  rgba(26,24,16,0.14);
  --accent:         #7c3aed;
  --accent-fg:      #ffffff;
}

/* ── Light / Cloud ──────────────────────────────────────── */
[data-theme="light"][data-tone="cloud"] {
  --bg-base:        #f6f7f9;
  --bg-surface:     #eef0f4;
  --bg-elevated:    #ffffff;
  --bg-input:       #f0f2f5;
  --text-primary:   #111318;
  --text-secondary: #60687a;
  --text-tertiary:  #8890a4;
  --border:         rgba(17,19,24,0.08);
  --border-strong:  rgba(17,19,24,0.14);
  --accent:         #7c3aed;
  --accent-fg:      #ffffff;
}

/* ── Light / Pure ───────────────────────────────────────── */
[data-theme="light"][data-tone="pure"] {
  --bg-base:        #ffffff;
  --bg-surface:     #f4f4f5;
  --bg-elevated:    #ffffff;
  --bg-input:       #f8f8f8;
  --text-primary:   #09090b;
  --text-secondary: #52525b;
  --text-tertiary:  #a1a1aa;
  --border:         rgba(9,9,11,0.08);
  --border-strong:  rgba(9,9,11,0.14);
  --accent:         #7c3aed;
  --accent-fg:      #ffffff;
}

/* ── Base Styles ────────────────────────────────────────── */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans), sans-serif;
  background-color: var(--bg-base);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Scrollbar ──────────────────────────────────────────── */
::-webkit-scrollbar       { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }

/* ── Utility Classes ────────────────────────────────────── */
@layer utilities {
  .font-display { font-family: var(--font-display), serif; }
  .font-sans    { font-family: var(--font-sans), sans-serif; }

  /* Card — the one reusable surface pattern */
  .card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .card-elevated {
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    border-radius: 12px;
  }

  /* XP number — Fraunces + gold */
  .xp-number {
    font-family: var(--font-display), serif;
    font-weight: 900;
    color: #f4c542;
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app
npm run build 2>&1 | tail -20
```

Expected: Build completes. TypeScript errors are acceptable here since component classes haven't been updated yet — look for fatal compilation failures only.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: design token system — CSS vars for all 6 theme/tone combos"
```

---

### Task 2: Font Swap + Layout

**Files:**
- Modify: `app/layout.tsx`

**What this does:** Removes Orbitron/Rajdhani font references, sets `data-theme="dark" data-tone="warm"` on `<html>`, updates Clerk appearance to match new palette.

- [ ] **Step 1: Update `app/layout.tsx`**

Replace the entire file with:

```tsx
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hyperbolic XP',
  description: 'Level up your TCG journey. Earn XP, unlock rewards, and compete with the community.',
  keywords: ['TCG', 'loyalty', 'gaming', 'One Piece', 'Pokemon', 'MTG'],
  authors: [{ name: 'Hyperbolic Games' }],
  openGraph: {
    title: 'Hyperbolic XP',
    description: 'Level up your TCG journey',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#111009',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary:          '#c4b5fd',
          colorBackground:       '#1a1810',
          colorInputBackground:  '#1e1c14',
          colorText:             '#f2efe8',
          colorTextSecondary:    '#8a8070',
          borderRadius:          '10px',
          fontFamily:            'Plus Jakarta Sans, sans-serif',
        },
      }}
    >
      <html lang="en" data-theme="dark" data-tone="warm">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Build and spot-check**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: swap to Fraunces + Plus Jakarta Sans, set warm-dark theme on html"
```

---

### Task 3: Base UI Components

**Files:**
- Modify: `components/ui/index.tsx`

**What this does:** Deletes `FloatingParticles`. Rewrites `Button`, `Card`, `Badge`. Adds a `ThemeToggle` component. Preserves `Avatar` and `GameXpCard` (they'll be touched in dashboard tasks).

- [ ] **Step 1: Replace `components/ui/index.tsx`**

Replace the entire file with:

```tsx
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

// ── Avatar (preserved — updated to use token colors) ───────────────────────

const AVATAR_BASES = ['🏴‍☠️','⚔️','🎴','🐉','🌊','🔥','⚡','🎯','🎪','🏆','🎭','🌙'];
const AVATAR_COLORS = ['#374151','#1e3a5f','#3b1e5f','#1e4a3b','#5f3b1e','#4a1e1e','#1e4a4a','#3d3d1e'];
const AVATAR_FRAMES: Record<string, string> = {
  none:    '',
  silver:  'ring-2 ring-[#94a3b8]',
  gold:    'ring-2 ring-xp',
  diamond: 'ring-2 ring-[#67e8f9]',
};

interface AvatarConfig { base?: string; color?: string; frame?: string; }

export const Avatar: React.FC<{
  config?: AvatarConfig;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  badge?: string;
  online?: boolean;
  className?: string;
}> = ({ config = {}, size = 'md', badge, online, className = '' }) => {
  const sizes = { sm: 'w-8 h-8 text-base', md: 'w-10 h-10 text-xl', lg: 'w-14 h-14 text-3xl', xl: 'w-20 h-20 text-5xl' };
  const base  = config.base  || AVATAR_BASES[0];
  const color = config.color || AVATAR_COLORS[0];
  const frame = AVATAR_FRAMES[config.frame || 'none'];
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center ${frame}`}
        style={{ background: color }}
      >
        <span style={{ lineHeight: 1 }}>{base}</span>
      </div>
      {badge && (
        <span className="absolute -bottom-0.5 -right-0.5 text-xs leading-none">{badge}</span>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-base" />
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
  className?: string;
}> = ({ label, value, sublabel, className = '' }) => (
  <Card className={`p-4 ${className}`}>
    <p className="text-xs font-medium text-tertiary uppercase tracking-wide mb-1">{label}</p>
    <p className="font-display text-3xl font-black text-primary">{value}</p>
    {sublabel && <p className="text-xs text-secondary mt-0.5">{sublabel}</p>}
  </Card>
);
```

- [ ] **Step 2: Build and check for errors**

```bash
npm run build 2>&1 | grep -E "^.*error.*$" | head -20
```

Fix any TypeScript errors caused by renamed exports (e.g. if any page imports `FloatingParticles`, remove those imports now).

- [ ] **Step 3: Search and remove all FloatingParticles usage**

```bash
grep -r "FloatingParticles" /home/djgotsu/hyperbolic/projects/hyperbolic-app/app --include="*.tsx" -l
```

For each file found, remove the import and the `<FloatingParticles />` JSX element.

- [ ] **Step 4: Commit**

```bash
git add components/ui/index.tsx app/
git commit -m "feat: base components — Button/Card/Badge/Input/ThemeToggle, delete FloatingParticles"
```

---

### Task 4: Landing Page

**Files:**
- Modify: `app/page.tsx`

**What this does:** Replaces the landing page with a clean premium layout. Lavender accent is used here (this is front-door). No glows, no particles, no radial gradients.

- [ ] **Step 1: Read current landing page**

```bash
cat /home/djgotsu/hyperbolic/projects/hyperbolic-app/app/page.tsx
```

Note what content exists (taglines, CTAs, feature list) — preserve the copy, replace only the visual design.

- [ ] **Step 2: Rewrite `app/page.tsx`**

```tsx
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base text-primary flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-token">
        <span className="font-display text-xl font-bold tracking-tight">Hyperbolic XP</span>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-secondary hover:text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-accent text-accent-fg px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-2xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-xs font-medium px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Now live at Games of Martinez
        </div>

        <h1 className="font-display text-5xl font-black leading-tight mb-6">
          Earn XP.<br />
          Climb the ranks.<br />
          Own your game.
        </h1>

        <p className="text-lg text-secondary max-w-md mb-10">
          Hyperbolic XP rewards you for every event, match, and purchase. Track your progress, compete on the leaderboard, and unlock rewards.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mx-auto">
          <Link
            href="/sign-up"
            className="flex-1 text-center bg-accent text-accent-fg font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Create account
          </Link>
          <Link
            href="/sign-in"
            className="flex-1 text-center border border-strong text-primary font-semibold px-6 py-3 rounded-lg hover:bg-elevated transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-token py-16 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: '🏆', title: 'Earn XP', body: 'Every event, match win, and purchase earns you points toward your rank.' },
            { icon: '📊', title: 'Leaderboards', body: 'Compete weekly and monthly. See where you stand in every game.' },
            { icon: '🎁', title: 'Rewards', body: 'Unlock cosmetics, badges, and store perks as you level up.' },
          ].map((f) => (
            <div key={f.title} className="card p-5">
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="font-semibold text-primary mb-1">{f.title}</h3>
              <p className="text-sm text-secondary">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-token py-6 px-6 text-center">
        <p className="text-xs text-tertiary">© 2026 Hyperbolic Creative. All rights reserved.</p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Visual check**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Warm dark background
- Clean sans-serif body text
- Fraunces display font for h1
- Lavender accent on pill badge, buttons
- No glow effects
- No floating particles

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing page redesign — premium warm dark, lavender accent"
```

---

### Task 5: Auth Pages

**Files:**
- Modify: `app/sign-in/[[...sign-in]]/page.tsx`
- Modify: `app/sign-up/[[...sign-up]]/page.tsx`

**What this does:** Wraps Clerk auth components in a clean centered layout with lavender accent. Removes any background gradients or glow wrappers.

- [ ] **Step 1: Read current auth pages**

```bash
cat /home/djgotsu/hyperbolic/projects/hyperbolic-app/app/sign-in/\[\[...sign-in\]\]/page.tsx
cat /home/djgotsu/hyperbolic/projects/hyperbolic-app/app/sign-up/\[\[...sign-up\]\]/page.tsx
```

- [ ] **Step 2: Rewrite sign-in page**

```tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <span className="font-display text-2xl font-bold text-primary">Hyperbolic XP</span>
        <p className="text-sm text-secondary mt-1">Welcome back</p>
      </div>
      <SignIn />
      <p className="mt-6 text-xs text-tertiary text-center">
        © 2026 Hyperbolic Creative
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite sign-up page**

```tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <span className="font-display text-2xl font-bold text-primary">Hyperbolic XP</span>
        <p className="text-sm text-secondary mt-1">Create your account</p>
      </div>
      <SignUp />
      <p className="mt-6 text-xs text-tertiary text-center">
        © 2026 Hyperbolic Creative
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/sign-in app/sign-up
git commit -m "feat: auth pages — clean centered layout, Clerk styled via token vars"
```

---

### Task 6: Dashboard Layout

**Files:**
- Modify: `app/dashboard/layout.tsx`

**What this does:** Redesigns the sidebar (desktop) and bottom nav (mobile). Removes all cyan accent classes, emoji nav icons replaced with SVG, active state uses left border + elevated bg only.

- [ ] **Step 1: Read current layout**

```bash
cat /home/djgotsu/hyperbolic/projects/hyperbolic-app/app/dashboard/layout.tsx
```

- [ ] **Step 2: Rewrite `app/dashboard/layout.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui';

const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/events',
    label: 'Events',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/community',
    label: 'Community',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/shop',
    label: 'Shop',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

function NavItem({ item, pathname }: { item: typeof navItems[0]; pathname: string }) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${isActive
          ? 'bg-elevated text-primary border-l-2 border-accent pl-[10px]'
          : 'text-secondary hover:text-primary hover:bg-elevated/50'
        }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function MobileNavItem({ item, pathname }: { item: typeof navItems[0]; pathname: string }) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center gap-1 py-2 px-3 flex-1 transition-colors
        ${isActive ? 'text-primary' : 'text-tertiary hover:text-secondary'}`}
    >
      {item.icon}
      <span className="text-[10px] font-medium">{item.label}</span>
      {isActive && <span className="absolute bottom-0 h-0.5 w-6 bg-accent rounded-full" />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-base text-primary">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 bg-surface border-r border-token z-30">
        <div className="px-4 py-5 border-b border-token flex items-center justify-between">
          <span className="font-display font-bold text-lg text-primary">Hyperbolic XP</span>
          <ThemeToggle />
        </div>
        <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="p-4 border-t border-token">
          <Link
            href="/hq"
            className="text-xs text-tertiary hover:text-secondary transition-colors"
          >
            Staff HQ →
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-56 pb-20 lg:pb-0">
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-token sticky top-0 bg-base/95 backdrop-blur-sm z-20">
          <h1 className="text-base font-semibold text-primary capitalize">
            {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
          </h1>
        </div>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-token z-30">
        <div className="flex items-center relative">
          {navItems.map((item) => (
            <MobileNavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Visual check**

Navigate to `http://localhost:3000/dashboard`. Verify:
- Clean sidebar with SVG icons, no emojis
- Active item has left border, not a glowing bg
- No cyan text anywhere in nav
- Bottom nav visible on mobile (resize browser)

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: dashboard layout — SVG nav icons, token-based active states, ThemeToggle"
```

---

### Task 7: Dashboard Main Page

**Files:**
- Modify: `app/dashboard/page.tsx`

**What this does:** Cleans up the main dashboard. Preserves data/functionality. Removes GSAP count-up animations, radial gradient headers, cyan stat highlights. XP numbers use Fraunces (`font-display`). Cards use the `card` utility class.

- [ ] **Step 1: Read the current page**

```bash
wc -l /home/djgotsu/hyperbolic/projects/hyperbolic-app/app/dashboard/page.tsx
cat /home/djgotsu/hyperbolic/projects/hyperbolic-app/app/dashboard/page.tsx
```

- [ ] **Step 2: Apply these specific changes throughout the file**

Search and replace the following patterns (do not change data-fetching logic, only visual classes):

| Remove | Replace with |
|--------|-------------|
| `font-orbitron` | `font-display` |
| `font-rajdhani` | `font-sans` |
| `text-[#00c8ea]` or `text-hyper-cyan` | `text-secondary` |
| `bg-hyper-dark` | `bg-base` |
| `bg-hyper-card` | `bg-surface` |
| `bg-hyper-surface` | `bg-elevated` |
| `border-white/[0.06]` or `border-white/10` | `border-token` |
| `shadow-[0_4px_24px_rgba(0,200,234,0.15)]` | `shadow-sm` |
| `radial-gradient(ellipse at ...` | remove entirely |
| `<FloatingParticles />` | remove |
| XP number color classes like `text-[#f4c542]` | `text-xp` |

- [ ] **Step 3: Remove GSAP imports if present**

```bash
grep -n "gsap\|GSAP\|useGSAP" /home/djgotsu/hyperbolic/projects/hyperbolic-app/app/dashboard/page.tsx
```

If found, replace animated count-up with static display of the number. GSAP can be re-added later as an enhancement if wanted.

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep "error" | head -10
```

- [ ] **Step 5: Visual check at `/dashboard`**

Verify: warm dark background, Fraunces font on XP numbers, no cyan/purple glows, cards are clean `card` class surfaces.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: dashboard page — token classes, remove GSAP and glows"
```

---

### Task 8: Profile + Community + Events + Shop Pages

**Files:**
- Modify: `app/dashboard/profile/page.tsx`
- Modify: `app/dashboard/community/page.tsx`
- Modify: `app/dashboard/events/page.tsx`
- Modify: `app/dashboard/shop/page.tsx`

**What this does:** Apply the same find-and-replace cleanup from Task 7 to all remaining dashboard pages. Each gets its own commit.

- [ ] **Step 1: Apply token substitutions to profile page**

Apply the same pattern table from Task 7 Step 2 to `app/dashboard/profile/page.tsx`. Build and check.

```bash
git add app/dashboard/profile/page.tsx
git commit -m "feat: profile page — token classes, no glows"
```

- [ ] **Step 2: Apply to community page**

```bash
git add app/dashboard/community/page.tsx
git commit -m "feat: community page — token classes, no glows"
```

- [ ] **Step 3: Apply to events page**

```bash
git add app/dashboard/events/page.tsx
git commit -m "feat: events page — token classes, no glows"
```

- [ ] **Step 4: Apply to shop page**

```bash
git add app/dashboard/shop/page.tsx
git commit -m "feat: shop page — token classes, no glows"
```

---

### Task 9: Public-Facing Pages

**Files:**
- Modify: `app/event/[id]/page.tsx`
- Modify: `app/checkin/page.tsx`
- Modify: `app/onboarding/page.tsx`

**What this does:** Public event share page and check-in page get token cleanup. Onboarding keeps lavender accent (it's front-door).

- [ ] **Step 1: Apply token substitutions to `app/event/[id]/page.tsx`**

Remove glows. Keep game-specific colors (event game color is set dynamically from DB — preserve that). Apply `font-display` for event name/title.

```bash
git add app/event
git commit -m "feat: public event page — token classes"
```

- [ ] **Step 2: Apply to `app/checkin/page.tsx`**

```bash
git add app/checkin/page.tsx
git commit -m "feat: checkin page — token classes"
```

- [ ] **Step 3: Clean up `app/onboarding/page.tsx`** (keep lavender CTAs)

Apply token classes. Lavender accent stays on step indicators and primary CTA buttons — this is front-door.

```bash
git add app/onboarding/page.tsx
git commit -m "feat: onboarding — token classes, lavender accent preserved"
```

---

### Task 10: HQ Page

**Files:**
- Modify: `app/hq/page.tsx`

**What this does:** Staff HQ cleanup. HQ is operational, not decorative — high contrast, readable, no color noise. The file is large (~2700 lines) so work section by section.

- [ ] **Step 1: Replace header/nav section glows**

Search for the tab bar section. Replace active tab styles:

Old pattern: `bg-[#00c8ea]/20 text-[#00c8ea] border-[#00c8ea]/30`
New: `bg-elevated text-primary border-border-strong`

- [ ] **Step 2: Replace card backgrounds throughout**

```bash
sed -i 's/bg-\[#0f0f1a\]/bg-surface/g; s/bg-\[#14141f\]/bg-elevated/g; s/border-white\/\[0\.07\]/border-token/g' app/hq/page.tsx
```

- [ ] **Step 3: Remove glow shadows**

```bash
sed -i "s/shadow-\[0_4px_24px_rgba(0,200,234,0\.15)\]//g" app/hq/page.tsx
```

- [ ] **Step 4: Swap font classes**

```bash
sed -i 's/font-orbitron/font-display/g; s/font-rajdhani/font-sans/g' app/hq/page.tsx
```

- [ ] **Step 5: Build and visual check at `/hq`**

```bash
npm run build 2>&1 | grep "error" | head -10
```

Visually confirm HQ tabs are readable, player cards look clean.

- [ ] **Step 6: Commit**

```bash
git add app/hq/page.tsx
git commit -m "feat: HQ page — token classes, high contrast, no glows"
```

---

### Task 11: Kiosk Page

**Files:**
- Modify: `app/kiosk/page.tsx`

**What this does:** Kiosk is a special case — it needs high contrast and large type for readability at distance. It keeps energy in the check-in feedback (bold Fraunces XP number, success green) but removes the slop.

- [ ] **Step 1: Apply targeted changes to `app/kiosk/page.tsx`**

| Remove | Replace with |
|--------|-------------|
| `bg-slate-950` | `bg-base` |
| `bg-slate-900` | `bg-surface` |
| `border-slate-800` | `border-token` |
| `text-slate-500` | `text-secondary` |
| `text-slate-600` | `text-tertiary` |
| `text-cyan-400` | `text-xp` (for XP number) |

Keep: the game-color dot and event name use the event's `game.color` from the DB — that's intentional store-specific branding, not slop.

The feedback overlay XP number (`+{xpAwarded} XP`) should use `font-display font-black text-xp`.

- [ ] **Step 2: Build and check**

```bash
npm run build 2>&1 | grep "error" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add app/kiosk/page.tsx
git commit -m "feat: kiosk — token classes, Fraunces for XP feedback, high contrast"
```

---

### Task 12: Final Slop Audit + Deploy

**Files:** All

**What this does:** Sweep the entire codebase for any remaining slop patterns. Verify build. Deploy.

- [ ] **Step 1: Scan for remaining old patterns**

```bash
grep -r "font-orbitron\|font-rajdhani" app/ components/ --include="*.tsx" -l
grep -r "glow-cyan\|glow-purple\|pulse-glow" app/ components/ --include="*.tsx" -l
grep -r "hyper-gradient\|card-gradient" app/ components/ --include="*.tsx" -l
grep -r "FloatingParticles" app/ components/ --include="*.tsx" -l
grep -r "#00c8ea\|#00f0ff\|#080810\|#0f0f1a" app/ components/ --include="*.tsx" | grep -v "DailyGacha\|bounty"
```

Fix any remaining hits.

- [ ] **Step 2: Final build**

```bash
npm run build
```

Build must pass with 0 errors.

- [ ] **Step 3: Quick visual tour**

Start dev server and spot-check these URLs:
- `/` — landing, lavender accent visible
- `/sign-in` — clean Clerk form, no glow
- `/dashboard` — warm dark, Fraunces XP number, SVG nav
- `/dashboard/community` — leaderboard, no cyan highlights
- `/hq` — staff panel, high contrast
- `/kiosk` — if event is active, check-in UI visible

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "feat: premium redesign complete — token system, Fraunces/Jakarta fonts, no AI slop"
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ CSS token system for all 6 theme/tone combos — Task 1
- ✅ Font swap (Fraunces + Plus Jakarta Sans) — Tasks 1 & 2
- ✅ FloatingParticles deleted — Task 3
- ✅ All glow/gradient classes removed — Tasks 3, 7-11 + Task 12 audit
- ✅ Lavender only on landing/auth/onboarding — Tasks 4, 5, 9
- ✅ Store theming via `--accent` override — defined in token system (Task 1), implementation in future phase
- ✅ Light mode defined — Task 1 (ThemeToggle wires it in Task 3)
- ✅ Dashboard layout SVG icons — Task 6
- ✅ HQ and Kiosk — Tasks 10, 11
- ✅ Backup branch created before start — already done (`backup-pre-redesign`)

**Out of scope (confirmed):** DailyGacha visuals, store theme editor UI, onboarding page deep redesign beyond token cleanup.
