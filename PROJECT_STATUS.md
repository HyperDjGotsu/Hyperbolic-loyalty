# Hyperbolic Loyalty System - Project Status

**Last Updated:** January 26, 2026  
**Project Owner:** DjGotsu  
**Store:** Games of Martinez (Hyperbolic Games)

---

## 🎯 Project Vision

A gamified loyalty system where players earn XP across multiple TCGs, unlock themed ranks, compete on leaderboards, and flex their stats via NFC card taps. The system rewards engagement (event attendance, match wins, purchases, community contribution) and creates competitive seasons.

---

## ✅ Current Deployed State

### Legacy System (Netlify + Airtable) - PRODUCTION
**Live URL:** https://tangerine-brigadeiros-d910c6.netlify.app

| File | Purpose | Status |
|------|---------|--------|
| `player-tap.html` | Player profile (NFC tap destination) | ✅ Live |
| `admin.html` | Staff XP management portal | ✅ Live |
| `checkin.html` | Event check-in station | ✅ Live |

### New System (Next.js + Supabase) - PRODUCTION
**Live URL:** https://hyperbolic-loyalty.vercel.app

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Landing page | ✅ Working |
| `/dashboard` | Main player dashboard | ✅ Working |
| `/dashboard/community` | Leaderboards, friends | ✅ Working |
| `/dashboard/events` | Event calendar | ✅ Working |
| `/dashboard/shop` | Cosmetics shop | ✅ UI working |
| `/dashboard/profile` | Profile, settings, referrals | ✅ Working |
| `/onboarding` | New player signup with referral code | ✅ Working |
| `/hq` | Staff admin dashboard | ✅ Working |
| `/event/[id]` | Public shareable event page | ✅ Working |

**Tech Stack:** Next.js 14, Clerk, Supabase, Vercel, Tailwind CSS

---

## 🔗 Public Event Sharing (NEW - Jan 26, 2026) ✅ COMPLETE

### Features
- Shareable event links: `https://hyperbolic-loyalty.vercel.app/event/{event-id}`
- Shows event details: name, date/time (Pacific timezone), entry fee, XP rewards, prizing
- Displays interested count from community
- Share button with native share API fallback to clipboard
- CTA to join the loyalty system

### Key Files
| File | Purpose |
|------|---------|
| `app/event/[id]/page.tsx` | Public event page UI |
| `app/api/events/[id]/public/route.ts` | Public event API (no auth required) |

### Important Technical Note
The public event API **must use explicit column selection** instead of `select('*')` to get correct data from Supabase. This was a major debugging issue - `select('*')` returned stale/incorrect values while explicit columns work correctly.

```typescript
// ❌ WRONG - returns incorrect data
.select('*')

// ✅ CORRECT - returns accurate data
.select(`
  id,
  name,
  game_id,
  attendance_xp,
  win_xp,
  ...
`)
```

---

## 🎁 Referral System ✅ COMPLETE

### How It Works
- **New player** uses referral code during signup → Gets **+30 XP** (General) immediately
- **Referrer** gets **+50 XP** (General) when their referral attends first event
- Each player gets a unique code: `REF-XXXXXXXX`
- Share link: `https://hyperbolic-loyalty.vercel.app/onboarding?ref=REF-XXXXXXXX`

### Database Schema
```sql
ALTER TABLE players ADD COLUMN referred_by UUID REFERENCES players(id);
ALTER TABLE players ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE players ADD COLUMN referral_bonus_paid BOOLEAN DEFAULT false;
```

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/referral/validate` | GET | Validate referral code, return referrer name |
| `/api/referral/stats` | GET | Get player's referral code, stats, list of referrals |
| `/api/player/link` | POST | Creates player with referral link, awards signup bonus |
| `/api/hq/xp` | POST | Awards referrer bonus on first "Attended" XP |

---

## 🏴‍☠️ Bounty Hunter Night ✅ COMPLETE

### Features
- Monthly event replacing one Saturday local
- Top 5 auto-WANTED (can't opt out)
- Others opt-in as Hunters or stay Civilian
- HQ tab for managing opt-ins and recording results

### Point Stakes (Round 1)
| Outcome | Winner | Loser |
|---------|--------|-------|
| Hunter upsets WANTED | +30 | -25 |
| WANTED defends | +15 | -20 |
| Hunter vs Hunter | +15 | -15 |
| WANTED vs WANTED | +20 | -20 |

---

## 🏆 Pirate's Life / Hyperlife ✅ COMPLETE

### Monthly Attendance Achievements
- **One Piece (Pirate's Life):** Attend 6/8 events → +30 XP bonus
- **All Other Games (Hyperlife):** Attend 3/4 events → +30 XP bonus
- Progress shown on game cards in dashboard
- Auto-awarded when threshold met

---

## ⚠️ TECHNICAL DEBT - Files Using `as any` Casts

These files have `as any` TypeScript casts to bypass type checking. The root cause is that `types/database.types.ts` is out of sync with the actual Supabase database schema.

### Files to Fix
| File | Reason for `as any` |
|------|---------------------|
| `app/api/player/link/route.ts` | `referral_code` field missing from types |
| `app/api/referral/stats/route.ts` | `referral_code`, `referred_by`, `referral_bonus_paid` missing from types |
| `app/api/xp/checkin/route.ts` | `check_in` not in `xp_source` enum |

### How to Fix
Regenerate the Supabase types to match the actual database:
```bash
npx supabase gen types typescript --project-id gdyksfarqpzfvymzifxr > types/database.types.ts
```

If that command doesn't work, manually add these fields to `types/database.types.ts` in the `players` table:
- `referral_code: string | null`
- `referred_by: string | null`
- `referral_bonus_paid: boolean | null`

And add `check_in` to the `xp_source` enum.

---

## 🧹 Cleanup Completed (Jan 26, 2026)

### Supabase Client Consolidation
- **Removed:** `lib/supabase-admin.ts` (renamed to `.old.ts`)
- **Kept:** `lib/supabase.ts` as the single source of truth
- All API routes now import from `@/lib/supabase`

### Files Updated to Use Single Supabase Client
- `app/api/player/create/route.ts`
- `app/api/player/link/route.ts`
- `app/api/player/[id]/route.ts`
- `app/api/referral/stats/route.ts`
- `app/api/xp/checkin/route.ts`
- `app/api/xp/daily-spin/route.ts`
- `app/api/events/[id]/public/route.ts`

### Field Name Corrections
- `avatar_emoji` → `avatar_base` (in player create/link routes)
- `pass_tier: 'free'` → `pass_tier: 'none'` (correct enum value)
- Removed `pass_status: 'inactive'` (not a valid enum value)

---

## 📋 Roadmap Status

### Phase 4: Competition Features ✅ COMPLETE
- [x] Bounty Hunter Night system
- [x] Pirate's Life / Hyperlife achievement tracking
- [x] Referral bonus system
- [x] HQ Players tab redesign (game filter dropdown)
- [ ] Leader diversity tracking (backlogged - needs community input)

### Phase 5: Advanced Features 🚧 IN PROGRESS
- [x] Desktop redesign prototypes (HTML)
- [x] Public event sharing pages
- [ ] Desktop redesign implementation (React)
- [ ] Daily gacha spin (backend)
- [ ] Shop purchase flow (real transactions)
- [ ] Push notifications
- [ ] Event check-in via app

### Phase 6: Commerce Integration
- [ ] Square purchase sync
- [ ] Shopify purchase sync
- [ ] Battle pass system

### Decided NOT to build
- ❌ HQ Events management (keep using Google Calendar sync - less staff work)

---

## 🔑 Key Files Reference

### Public Event Sharing
| File | Purpose |
|------|---------|
| `app/event/[id]/page.tsx` | Public event page UI |
| `app/api/events/[id]/public/route.ts` | Public event API |

### Referral System
| File | Purpose |
|------|---------|
| `app/onboarding/page.tsx` | Signup with referral code input |
| `app/api/referral/validate/route.ts` | Validate codes |
| `app/api/referral/stats/route.ts` | Get referral stats |
| `app/api/player/link/route.ts` | Create player + signup bonus |
| `app/api/hq/xp/route.ts` | XP management + first-event bonus |
| `app/dashboard/profile/page.tsx` | Profile with referral section |

### Dashboard & Layout
| File | Purpose |
|------|---------|
| `app/dashboard/page.tsx` | Main dashboard (has GSAP animations) |
| `app/dashboard/layout.tsx` | Layout with responsive sidebar |

### Bounty Hunter
| File | Purpose |
|------|---------|
| `app/api/bounty-hunter/*` | Bounty hunter API routes |
| `app/hq/page.tsx` | HQ with Bounty Hunter tab |

---

## 💬 How to Resume Work

**Simple start:**
> "Read PROJECT_STATUS.md and let's continue"

**For specific tasks:**
> "Fix the TypeScript types - regenerate from Supabase and remove `as any` casts"

> "Continue the desktop redesign. We have 4 HTML prototypes (v1-v4). V4 was approved direction."

**Git backup branch:**
```bash
git checkout backup-before-redesign  # Safe state before redesign work
```

---

## 🔧 Environment & Deployment

### GitHub
- **Repo:** HyperDjGotsu/Hyperbolic-loyalty
- **Branch:** main (auto-deploys to Vercel)
- **Backup:** `backup-before-redesign` branch

### Deploy Command
```bash
git add -A && git commit -m "message" && git push
```

### Supabase
- Project ID: `gdyksfarqpzfvymzifxr`
- Regenerate types: `npx supabase gen types typescript --project-id gdyksfarqpzfvymzifxr > types/database.types.ts`

---

## 📝 Session Notes

### Jan 26, 2026
- **Major debugging session:** Public event API returning wrong XP values
- Root cause: Using `select('*')` returns incorrect data; must use explicit column selection
- Consolidated Supabase clients - removed `lib/supabase-admin.ts`
- Fixed multiple API routes to use `@/lib/supabase`
- Added `as any` casts to bypass outdated TypeScript types (TECH DEBT)
- Completed public event sharing feature with Pacific timezone support
- Fixed interested count display on public event page

### Jan 20, 2026
- Implemented complete referral system (database, APIs, UI)
- Generated referral codes for all existing players
- Added referral section to profile page
- Started desktop redesign work
- Created 4 HTML prototypes (v1-v4)
- V4 chosen as direction (clean layout + subtle animations)
- Installed GSAP (kept) and Lenis (removed - scroll issues)
- Created responsive layout.tsx (sidebar on desktop, bottom nav on mobile)

### Context Management Tips
- Keep this PROJECT_STATUS.md updated after each session
- Use Project Instructions for persistent context
- Upload files to Project (not chat) for persistence
- Reference specific sections when resuming work

---

This document should be updated whenever major decisions are made or features are completed.

## Session Oct 30, 2026 (branches redesign-home / redesign-desktop; main untouched)
- Pass tiers: Bronze $10 (1x), Silver $15 (1.5x), Gold $20 (2x), Diamond $30 (2x + $15 monthly Event Credit). All passes 5% off singles (staff-applied). Free earns Prize Points; a pass is needed to spend them.
- Event Credit built (table event_credit_redemptions, /api/player/event-credit, Profile card). Staff HQ view of redemptions NOT built yet.
- Prize Wall "View passes" sheet; welcome screens redone (real imagery, new Passes slide, no icon tiles).
- Dragon Ball split into dbs / dbfw with themed ranks; Card of the Day TCGplayer image fallback; Desktop Events rows use game art; Profile stats aligned.
- Bug fixed on redesign-home only: effectivePassTier rejected '+00:00' timestamps (every DB pass read as none). FIX MAIN at next push to main.
- Before merging to main: delete [TEST] events and '[TEST seed]' xp_ledger rows; Dj test account is set to diamond.
- Open: dbs.jpg/dbfw.jpg cover art, calculator doesn't model the Diamond credit cost.

## PRE-LAUNCH BLOCKER (added Oct 31, 2026): under-13 users / COPPA
- Signup has no age check. Onboarding collects phone and real name; /privacy only says the app is "not directed to children under 13".
- TCG stores have many kids, so that is a weak position. Talk to a lawyer before launch.
- Design decision needed: birthdate field, "I'm 13 or older" confirmation, or parent-managed accounts. Then update /privacy to match.
- Applies to all stores, so it also matters for the SaaS version.

---

## Nov 1, 2026 — redesign-home / desktop-polish (main untouched)

Branches `redesign-home` and `desktop-polish` are identical (head `a77eb6c`). Preview: hyperbolic-loyalty-git-redesign-home-hyperbolic1.vercel.app

**Shipped (on branches):**
- Staff HQ: dense two-column layouts, gated tabs, per-tab staff guides (5 views then opt-out; append-only `staff_guide_log`). Drafts exist for Events, Players, Redemptions only.
- Age gate at signup (neutral birthdate screen, 13+, birthdate never stored, `players.age_confirmed_at`).
- Friends mini panel; status privacy rules on leaderboard/search.
- Events/kiosk fixes: active-event lookup never cached; check-in no longer inserts nonexistent `event_attendances.store_id`; several events can be live at once (Start no longer ends others); kiosk scoped by `?store_id=` / `?event_id=` with event picker; QR check-in validates its own event; HQ shows per-event check-in counts; kiosk stacks on mobile.
- Kiosk exit: "Staff: exit" opens a PIN pad. `staff_pins` table (hashed PIN, 5 tries then 5 min lock). PIN set on first HQ visit; managers/admins reset from Staff tab. Fails closed if no PIN. Player check-in error screen has a dashboard link.

**DB migrations applied this session:** `players.age_confirmed_at`, `staff_guide_log`, `staff_pins`.

**Open / TODO:**
- Dj test data to clean before any main merge: `[TEST]` events, `[TEST seed]` xp_ledger rows, Dj's attendance/XP from kiosk tests, reset Dj and remove Dj's staff rows (app_users 3ace1580..., staff_store_roles).
- Fix `effectivePassTier` '+00:00' bug on main if not already there.
- Staff guides for remaining tabs; confirm Redemptions wording matches the real button flow.
- Home-page walkthrough for players (mobile-first, coach marks, replayable) after HQ work.
- Event Credit HQ redemptions screen; missing cover art (dbs/dbfw/general/yugioh); calculator ignores Diamond credit.
- Lawyer review of privacy wording; Profile light mode untested.
- Kiosk PIN is client-side navigation only (no server cookie lock); acceptable since kiosk tablets are not expected to be handed to customers.

### Nov 1, 2026 (later) — shipped to main
- Event wrap-up: after End Event a list of checked-in players opens; staff enter wins / Undefeated / community tiles / placement (logged only). One award per event (`event_results`), changes need the staff member's own PIN and post only the difference; failed saves undo every write; no self-awards; completed events only, 7-day window. "Wrap up recent events" card in HQ Events. Any store staff can run it.
- Floating friends button on all player pages (Activity/Friends sheet). Share a win with a friend: preset card built from your own ledger row, friends only, no text, 20/day (`friend_shares`); red dot + "From friends" strip. No points move between accounts.
- Home walkthrough (spotlight tour, plays once after welcome, replay on Profile) and one-time "about this page" cards (Events, Community, Prize Wall, Profile). Separate replay links on Profile.
- Events page shows checked-in and interested counts (hidden at zero). Cover images stay hidden until loaded; cards no longer remount on star taps. Special events load without snapping the page.
- Mobile Home: Friends section removed (floating button), Activity scrolls inside its card (~5 rows). Store updates open in-app event view.
- Staff PIN (`staff_pins`) required to exit kiosk; set on first HQ visit; shared check in `lib/staff-pin.ts`.
- Age gate wording: "Please enter your birthdate. We will not save or share your birthdate." Privacy page matches. Under-13 blocked.
- Staff guides updated to match real buttons; Events guide v2 includes the wrap-up.
- Migrations this stretch: `staff_pins`, `friend_shares`, `event_results` (plus earlier `players.age_confirmed_at`, `staff_guide_log`).

**Decision:** all player data is reset at go-live, so no Dj/[TEST] cleanup before merge.

**Still to test on production after merge (needs two accounts):** wrap-up end to end, friend shares, Dj2/real-account signup flow, kiosk with two live events.

**Deferred:** kiosk server-side lock / kiosk-only account; per-placement point bonuses; guides for remaining HQ tabs; Event Credit HQ redemptions screen; missing cover art (user has the files); calculator ignores Diamond credit; lawyer review of privacy wording.
