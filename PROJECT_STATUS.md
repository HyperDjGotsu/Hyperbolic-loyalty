# Hyperbolic Loyalty System - Project Status

**Last Updated:** November 7, 2026 (evening)  
**Project Owner:** DjGotsu  
**Store:** Games of Martinez (Hyperbolic Games)

---

## 🆕 Nov 7, 2026 (later) — titles, fresh-start wipe, private store pitch, store accounts (`main` head `7326d9c`)

**Player titles (live).** `player_titles` table (service role only; a removed title keeps a `revoked_at` marker) plus `store_config.title_settings` and the locked function `award_title_capped` (atomic cap). Titles: Founding Member and Beta Tester (+100 XP once, first grant only), Administrator (no XP). Founding Member is awarded automatically when a player is verified, until the cap (default 100, editable) and never re-awarded after a removal; network admins give/remove any title from HQ → Settings → Titles by public player ID. Shown as chips on the profile (own profile and the Community profile card), icons on leaderboard rows (not for anonymous players) and a chip in the kiosk check-in greeting. DjGotsu (HYP-NCTE64) holds Administrator. Not on mobile yet (needs the next mobile build).

**Fresh-start wipe (done).** Database wiped to two accounts (DjGotsu = main/network admin, Dj = dev instance) with their data reset; the other 15 players, 3 staff records and all activity are gone; events, stores, join codes and settings kept. Snapshot of the old data is in schema `backup_20261107` (drop after launch). Clerk users are being deleted by hand (live: keep dp2526@yahoo.com; dev: keep the Dj account). Scripts are in `~/playerpass-wipe/` (outside the repo). Paul needs a fresh Pleasant Hill manager invite.

**Store pitch is private.** The landing page and sign-in no longer link to the store pitch (`SHOW_STORE_PITCH` in `lib/site-flags.ts` flips it back), `/pitch` and `/demo` are noindex and sit behind a shared password: set `PITCH_PASSWORD` in Vercel (Production) and redeploy; until it is set both pages are locked for everyone. Unlock page `/pitch-access`, 30-day cookie, rate limited. No password or hash is stored in the repo.

**Branding.** "PlayerPass" is one word everywhere (app copy, metadata, emails, mobile app name, Clerk application name); the global Player ID Prefix setting is gone (each store has its own prefix).

**App Store / Google Play.** Apple Developer (Organization, HYPERBOLIC CREATIVE INC) submitted and in review. Google Play organization account created under darrell@playerpass.gg; identity and organization documents submitted and in review; phone verification and Create app unlock after approval.

**Still open:** set `PITCH_PASSWORD`; finish the Clerk deletions and send Paul his invite; Apple and Google approvals; Home banner for unverified players; staff vouching; mobile build (scan-to-check-in, tour question, titles); Clerk support email and sender domain; Digimon/UVS icon backgrounds; revoke the old Vercel bypass token; drop `backup_20261107` after launch.

---

## 🆕 Nov 7, 2026 update — store join codes, kiosk token, misuse alerts MERGED TO `main` (head `4bd0869`), live on playerpass.gg

**Store join codes + verified home store.** Each store has a rotatable 6-character join code (`store_join_codes`, service role only). HQ → Settings has a card with the QR, code, Copy link, Print sign and New code (managers). Public `/join/<slug>?c=<code>` page; onboarding has an optional code field; changing home store needs the code. `players.home_store_verified_at` (NULL = unverified): set by join code or by a *staff* check-in (a player's own check-in can't prove presence). Unverified players can't claim the trial or redeem prizes (403 `store_unverified`) and are hidden from leaderboards, One Piece standings, bounty list, search, friends, friend requests, friend activity and public profiles (`lib/player-visibility.ts`, fails closed). HQ, kiosk and circuit results still list them. All 17 existing players were grandfathered as verified.

**Players table lockdown.** `anon`/`authenticated` write access and the open RLS policies on `players` were removed (migration `20261106230100`). The app only uses the service role.

**Rotating kiosk token.** Self check-in needs the token in the kiosk QR (`lib/checkin-token.ts`, HMAC of event id + 2-minute block, valid about 4-6 minutes; secret `CHECKIN_TOKEN_SECRET`, falls back to the Supabase service key). Staff check-ins (NFC/by name) skip it. The kiosk fetches `/api/events/[id]/checkin-token` (staff only), draws the QR locally (no third-party QR site), shows "Reconnecting…" then a paused message if offline, and requests a screen wake lock. Mobile: event page button is now "Scan QR to Check In"; the scan carries the token (needs a new mobile build). A kiosk tab opened before the deploy must be reloaded.

**HQ misuse alerts (network admin only).** Settings card with editable limits (`store_config.abuse_alert_settings`, migration `20261107170000`): referral sign-ups per referrer/24h (20), new accounts/hour (30), players verified per store/24h (30), XP per player/24h (1500), days a player may stay unverified (7). Checked live when the card opens; no background job (Vercel plan limits crons).

**Branding and popups.** Brand is "PlayerPass" (one word) in app copy, metadata, emails and the mobile app name; Clerk application name set to PlayerPass; leftover Hyperbolic XP copy removed; the network-wide Player ID Prefix card and HYP defaults removed (sign-up uses each store's own prefix; the original `HYP-NCTE64` account keeps its ID and the kiosk still accepts HYP- cards). First run now asks once "Want a quick tour?" (Show me around / No thanks); per-page tip cards removed; Profile replay links still work. Web and mobile.

**Still open:** Home banner for unverified players (enter code); staff vouching; Emperor crowning doesn't filter unverified players; mobile build with the new check-in flow; Apple Developer (org) and Google Play enrollment; Clerk support email and own sender domain; Digimon/UVS icon backgrounds (ask Maia); revoke Vercel bypass token; daily alert job needs a Vercel plan with more crons.

---

## 🆕 Nov 6, 2026 update — redesign-home MERGED TO `main` (head `8237738`)

**Live on `main`:** all of `redesign-home` (41+ commits: mobile parity, native app, launch hardening, blocking/reports), plus Maia's game icons (`public/game-icons/`, `components/GameIcon.tsx`; shown in favorites, onboarding, leaderboards, mobile Events filter pills; themed light/dark art for Warhammer and Bolt Action; emoji fallback for games with no art), the Events pill overflow fix (`flex-none`), and `.clerk/` in `.gitignore`. Main was merged into the branch first with no conflicts; typecheck and 84 tests pass. A local `next build` can't run without `.env`, so the Vercel build was the real check.

**Speed branches are all on main now** (`batch-cron-notifications`, `home-load-speed` landed as cherry-picks; `speed-events-apis`, `gitignore-clerk-keyless` fully merged). The Nov 5 "pushed, NOT merged" list below is out of date. The leftover remote branches can be deleted.

**Still open:** Digimon and UVS icons have opaque white backgrounds (ask Maia for transparent versions); no art for Blood Bowl or board games; desktop Events filter still shows emoji; older dashboard pages still emoji; wide logos (Star Wars, Vanguard) read small at pill size; optimistic UI; signed-in timing of Home/check-in; rotate the Vercel bypass token; reconcile loyalty numbers (pack 120 vs 350 XP, Gold $25 vs $10/15/20/30, $10 credit 450 vs 350).

---

## 🆕 Nov 5, 2026 update — speed pass (API latency)

**Live on `main`:** Vercel functions pinned to `sfo1` (`apps/web/vercel.json` → `"regions": ["sfo1"]`). They were running in `iad1` (Virginia) while Supabase is `us-west-1`, so every query crossed the country. `/api/events` and `/api/events/active` also run their independent queries with `Promise.all`. Measured on production: `/api/events?status=upcoming` 0.65–2.2s → ~0.3s; `/api/events/active` 1.2–1.6s → ~0.3s. Responses verified byte-identical to the old version (signed-out). `.clerk/` added to `.gitignore` (Clerk keyless dev keys contain a secret key; never committed).

**Pushed, NOT merged (branches off main):**
- `batch-cron-notifications` — `createNotificationsBulk()` in `lib/notifications.ts`; `spin-reminder`, `pass-expiring`, `weekly-summary` stop doing a preference SELECT + single INSERT per player. 6 new unit tests. Scale/cost fix, not user-facing speed. Note `redesign-home` also edits these cron files (fail-closed auth), so expect a small merge conflict.
- `home-load-speed` — Home validates the saved store (`/api/stores`) in parallel with the player lookup instead of after it. Untested signed-in.

**Checked and deliberately left alone:** compression (brotli already on), static pages (`/`, `/terms` are cache hits), `/api/store-config` (no-store on purpose; stale config has caused bugs), check-in route (steps are dependent and use atomic double-award protection).

**Still open:** measure Home and check-in signed-in (browser network tab); optimistic UI for favorites, friend requests, spin, event credit (handlers not read yet); `public.pass_history` has RLS disabled (Supabase critical advisory, 0 rows today; fix is `ALTER TABLE public.pass_history ENABLE ROW LEVEL SECURITY;`, app uses service role so it should be safe); `redesign-home` (41 commits, 107 files incl. native app, launch hardening, blocking/reports) not on main; rotate the Vercel automation bypass token that was pasted in chat.

---

## 🆕 Nov 2, 2026 update — MERGED TO `main` (head `390cd2d`), live on playerpass.gg

Live: desktop Home fixes, own `/sign-in` + `/sign-up`, share cards, staff guides, **Event Credit staff-confirm flow**, HQ Staff store filter, HQ remembers last tab, Calculator (linked in HQ, 404 for non-staff, app-token restyle, 3 sliders + advanced, Diamond $15 credit, pack payouts 1/win, 2/win, 1-3-5, odd player counts pay like next even), HQ Banners empty state, Home walkthrough wording ("What's up next at the store", "Your games"), **`/terms` Terms of Service** (linked from landing + sign-in footers; California law, liability cap, passes sold by stores; needs lawyer review with privacy).

**Notifications (Vercel Pro, 7 crons in `apps/web/vercel.json`)**, Pacific times, DST-safe (two UTC slots, code exits when not the right hour): "Events today" digest 11am (interested players only); "[Event] is happening in an hour" every 15 min (interested players, once per player/event, skips cancelled/completed); daily spin reminder 3pm; Sunday 6pm weekly recap ("You earned +X XP this week. You are now ranked #N at <store>.", store rank by this week's XP, omitted if under 2 players earned XP; no push); pass-expiring 7-day warning (in-app); calendar-sync 6am; expire-events 2am. Reminder route: `app/api/cron/event-reminders?mode=morning|hour`.

Google brand verification done (domain verified via TXT at GoDaddy, branding verified + published). Add `https://playerpass.gg/terms` to the consent screen if not yet.

Decisions: no extra points for 1st-3rd (only undefeated bonus). Bandai TCG+ rank targets undisclosed; don't quote numbers. Weekly recap stays a one-line notification; a Spotify-Wrapped-style Week in Review page and a monthly network-rank notification are saved for later.

Self-award bypass REMOVED (Nov 2): nobody can reward themselves in event wrap-up, Dj included; test wrap-ups need a second staff account. All data wiped at go-live (no Dj/[TEST] cleanup).

Open: verify Clerk form / Google sign-in / light mode on playerpass.gg phone; lawyer review of privacy + Terms; kiosk server-side lock; optional staff push for Event Credits; optional TCG+ rank tracker in HQ; optional weekly recap push.

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


## Nov 2 (evening): Native app brought up to date (branch redesign-home, NOT on main)
- Phase 0: age gate/birthdate, QR check-in parsing + result states, tier labels, 100 XP/level, legal links, push tap routing.
- Phase 1: design tokens (six tones), Fraunces + Plus Jakarta Sans, ThemeProvider, kit (AppText/Card/Button/Skeleton).
- Phase 2-3: Events, Alerts, Prize Wall, Home, Profile (tone picker, status, backdrop, Event Credit), Community rebuilt; Google + Apple sign-in and in-app password reset; welcome overlay, home tour, page intros.
- Safety: player_reports table + /api/community/report (emails REPORTS_EMAIL once set), block API (UUID-validated), blocks enforced in friend requests and leaderboard.
- Universal links: app.json associatedDomains/intentFilters + /.well-known routes (need APPLE_TEAM_ID, ANDROID_CERT_SHA256).
- Open items for Darrell: see MOBILE_LAUNCH_NEEDS.md.
- Not run on device/emulator yet; only tsc + Android bundle export verified.
