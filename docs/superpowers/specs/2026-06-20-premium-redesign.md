# Hyperbolic XP — Premium Redesign Spec
**Date:** 2026-06-20  
**Status:** Approved for implementation

---

## Goal

Replace the current "AI slop" aesthetic (neon cyan/purple glows, floating particles, radial gradients, Orbitron font) with a premium, minimal dark UI that:

1. Feels like a professional product, not a gaming fan site
2. Provides a clean design token layer stores can theme on top of
3. Supports light and dark modes with tone presets per mode
4. Uses lavender as a front-door accent only (landing, auth, onboarding) — neutral inside the app

---

## What Gets Removed

- `FloatingParticles` component — deleted entirely
- All `glow-cyan`, `glow-purple`, `pulse-glow` CSS classes
- High-opacity box shadows (anything above `rgba(x,x,x,0.08)`)
- Radial gradient backgrounds on dashboard pages
- `text-gradient` and `text-gradient-cyan` classes
- Orbitron and Rajdhani fonts
- Inset highlight shadows (`inset 0 1px 0 rgba(255,255,255,0.1)`)
- Cyan border accents (`border-[#00c8ea]/20`) throughout the app interior
- Floating particle colors (`['#22d3ee', '#a855f7', '#ec4899', '#f97316']`)
- `hyper-gradient`, `card-gradient` Tailwind backgrounds

---

## Design Token System

All visual values live in CSS custom properties on `:root`. Tailwind reads from these via `var()`. Store themes override only these properties — no component code changes needed.

### Color Tokens

```css
/* MODE: Dark — Warm (default) */
:root[data-theme="dark"][data-tone="warm"] {
  --bg-base:        #111009;   /* page background */
  --bg-surface:     #1a1810;   /* cards, panels */
  --bg-elevated:    #222018;   /* modals, dropdowns */
  --bg-input:       #1e1c14;   /* inputs */

  --text-primary:   #f2efe8;   /* main text */
  --text-secondary: #8a8070;   /* muted labels */
  --text-tertiary:  #5a5448;   /* placeholders, disabled */

  --border:         rgba(242,239,232,0.07);   /* subtle dividers */
  --border-strong:  rgba(242,239,232,0.13);   /* card edges */

  --accent:         #c4b5fd;   /* store accent — lavender default */
  --accent-fg:      #111009;   /* text on accent bg */
}

/* MODE: Dark — Slate */
:root[data-theme="dark"][data-tone="slate"] {
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

/* MODE: Dark — Ink */
:root[data-theme="dark"][data-tone="ink"] {
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

/* MODE: Light — Paper (warm) */
:root[data-theme="light"][data-tone="paper"] {
  --bg-base:        #faf8f4;
  --bg-surface:     #f2efe8;
  --bg-elevated:    #ffffff;
  --bg-input:       #f5f2ec;
  --text-primary:   #1a1810;
  --text-secondary: #6b6258;
  --text-tertiary:  #9a9288;
  --border:         rgba(26,24,16,0.08);
  --border-strong:  rgba(26,24,16,0.14);
  --accent:         #7c3aed;   /* deeper purple for light mode contrast */
  --accent-fg:      #ffffff;
}

/* MODE: Light — Cloud */
:root[data-theme="light"][data-tone="cloud"] {
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

/* MODE: Light — Pure */
:root[data-theme="light"][data-tone="pure"] {
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

/* Semantic tokens — same across all themes */
:root {
  --success:      #22c55e;
  --warning:      #f59e0b;
  --danger:       #ef4444;
  --xp:           #f4c542;   /* XP gold — kept, used sparingly */
}
```

### Store Theming Override

Stores set only `--accent` and `--accent-fg`. Everything else stays from the base theme.

```css
/* Example: a store with red branding */
:root[data-store="example-store"] {
  --accent:    #dc2626;
  --accent-fg: #ffffff;
}
```

Store config stored in Supabase `stores` table: `{ accent_color, accent_fg, logo_url, store_name, font_preference, tone }`.

---

## Typography

### Fonts

| Role | Font | Weights |
|------|------|---------|
| Display (headings, XP numbers, player names, leaderboard ranks) | **Fraunces** | 700, 900 |
| Body (all UI text, labels, buttons, inputs) | **Plus Jakarta Sans** | 400, 500, 600, 700 |

Both loaded from Google Fonts. Replace current `font-orbitron` and `font-rajdhani` references.

### Scale

```css
--text-xs:   0.75rem;    /* 12px — badges, timestamps */
--text-sm:   0.875rem;   /* 14px — secondary labels */
--text-base: 1rem;       /* 16px — body default */
--text-lg:   1.125rem;   /* 18px — card titles */
--text-xl:   1.25rem;    /* 20px — section headers */
--text-2xl:  1.5rem;     /* 24px — page titles */
--text-3xl:  1.875rem;   /* 30px — hero headings */
--text-4xl:  2.25rem;    /* 36px — XP display numbers */
--text-5xl:  3rem;       /* 48px — leaderboard rank #1 */
```

Display font (Fraunces) used at `text-2xl` and above, or for any number that should feel significant (XP totals, rank positions, check-in counts on kiosk).

---

## Component Principles

### Cards
- Background: `var(--bg-surface)`
- Border: `1px solid var(--border)`
- Border-radius: `12px`
- No box-shadow by default. Elevated state (hover/focus): `0 2px 8px rgba(0,0,0,0.15)` — one shadow, low opacity
- No glow, no colored borders

### Buttons

**Primary** (accent-filled):
```
bg: var(--accent)
color: var(--accent-fg)
hover: 8% opacity overlay
no shadow, no glow
```

**Secondary** (outline):
```
border: 1px solid var(--border-strong)
color: var(--text-primary)
hover: bg var(--bg-elevated)
```

**Ghost** (text only):
```
color: var(--text-secondary)
hover: color var(--text-primary)
```

### Inputs
- Background: `var(--bg-input)`
- Border: `1px solid var(--border)`
- Focus border: `1px solid var(--accent)`
- No glow on focus. Border color change only.

### XP Display
- Number in Fraunces, `font-black`
- Color: `var(--xp)` (#f4c542) only for the number itself
- Label "XP" in Plus Jakarta Sans, `text-secondary`, smaller

### Badges / Tags
- Filled with low-opacity version of relevant color: `rgba(x,x,x,0.12)` bg, `color` for text
- No border, no glow
- Rounded: `rounded-full`

### Navigation (Dashboard Sidebar / Bottom Nav)
- Active state: background `var(--bg-elevated)`, text `var(--text-primary)`, left border `2px solid var(--accent)` (sidebar) or top border (bottom nav)
- No filled highlight color, no glow, no emoji icons (replace with simple SVG icons)

---

## Pages — Redesign Priority Order

### Phase 1: Foundation
1. `tailwind.config.ts` — wire in CSS token variables
2. `globals.css` — define all tokens, remove slop classes
3. `app/layout.tsx` — swap fonts
4. `components/ui/index.tsx` — rebuild Card, Button, Badge, Input primitives. Delete FloatingParticles.

### Phase 2: Front Door (Lavender accent active here)
5. `app/page.tsx` — landing page
6. `app/sign-in/` and `app/sign-up/` — auth pages
7. `app/onboarding/page.tsx` — onboarding flow

### Phase 3: Core Player Experience (Neutral, no accent)
8. `app/dashboard/layout.tsx` — sidebar + bottom nav redesign
9. `app/dashboard/page.tsx` — main dashboard
10. `app/dashboard/profile/page.tsx`
11. `app/dashboard/community/page.tsx`
12. `app/dashboard/events/page.tsx`
13. `app/dashboard/shop/page.tsx`

### Phase 4: Other Player-Facing
14. `app/event/[id]/page.tsx` — public event share page
15. `app/checkin/page.tsx`

### Phase 5: Staff + Kiosk
16. `app/hq/page.tsx`
17. `app/kiosk/page.tsx`

### Phase 6: Store Theming
18. Add `data-store` attribute injection based on Supabase store config
19. Build store theme editor UI in HQ

---

## Lavender Usage Rules

Lavender (`#c4b5fd` dark / `#7c3aed` light) appears **only** on:
- Landing page hero CTA button
- Sign-in / sign-up page accents
- Onboarding step indicators

Inside the dashboard and all app pages: **no lavender**. Accent color inside the app only appears when a store has set one. Default store accent = none (everything neutral).

The one exception: the mode/theme toggle can use a subtle lavender dot as the "Hyperbolic" brand identifier.

---

## Light / Dark Mode Implementation

- Toggle stored in `localStorage` + `<html data-theme="dark|light" data-tone="warm|slate|ink|paper|cloud|pure">`
- Default: `dark` + `warm`
- User preference persisted in Supabase `players` table: `{ theme, tone }`
- Server-side: read from cookie for SSR to avoid flash

---

## What The Kiosk + HQ Keep

These are staff/operational surfaces. Redesign applies (remove glows, swap fonts) but they don't need the full premium treatment. Key constraint: **legibility at a distance** (kiosk is read from across a counter). Keep large type, high contrast. The XP confirmation screen on the kiosk can keep some energy (bold color, large Fraunces number).

---

## Out of Scope for This Redesign

- Gacha card visuals (`DailyGacha.tsx`) — complex SVG system, separate redesign
- Game-specific color theming (One Piece bounty colors, etc.) — preserved as-is
- Backend / data changes
- New features

---

## Success Criteria

- No `glow-*` CSS classes remain in the codebase
- No `FloatingParticles` component
- No Orbitron or Rajdhani font references
- All pages use tokens from `--bg-base`, `--text-primary`, etc.
- App looks correct in both dark (warm) and light (paper) mode
- A store theme can be applied by changing only `--accent` and `--accent-fg`
- Lavender appears only on landing, auth, and onboarding pages
