# PlayerPass Spec Compliance Matrix
> Last verified: 2026-08-16 against production codebase + live Supabase schema (gdyksfarqpzfvymzifxr)
> Re-verified independently from code — do not trust prior session memory counts.

---

## Frozen Spec — Economy Rules

| Rule | Canonical Value | Source |
|------|----------------|--------|
| Event attendance Lifetime XP | 35 LXP flat (no multiplier ever) | checkin/route.ts:9 |
| Event attendance Prize Points (base) | 35 PP × tier multiplier | checkin/route.ts:10 |
| Win bonus Lifetime XP | 5 LXP per round (flat) | checkin/route.ts:11 |
| Win bonus Prize Points (base) | 5 PP per round × tier multiplier | checkin/route.ts:12 |
| Max rounds per event (checkin path) | 3 | checkin/route.ts:13 |
| HQ win awards | Additive `+ Win` (no cap) — each press = +5 LXP + 5 PP base × multiplier | hq/xp/route.ts TILE_PP — DECISION 2026-08-16 |
| Referral LXP (to referrer, on referred's first event) | 50 LXP flat | checkin/route.ts:14 |
| Referral PP (to referrer, on referred's first event) | **10 PP flat** (supersedes 100 PP) — community recognition, not farming | checkin/route.ts:15 — DECISION 2026-08-16 |
| Welcome bonus (every new account) | 30 LXP, unconditional | player/link/route.ts — DECISION 2026-08-16 |
| Bronze trial gate | 720 Lifetime XP (eligibility only, not spent) | claim-trial/route.ts:7 — DECISION 2026-08-16 |
| Bronze trial duration | 30 days | claim-trial/route.ts:8 |
| Daily spin prizes | 5/10/25/50/100 LXP (weights 40/31/20/8/1%) | xp/daily-spin/route.ts |
| Free multiplier | 1.0× | points.ts |
| Bronze multiplier (DB: `access`) | 1.25× | points.ts |
| Silver multiplier (DB: `player`) | 1.5× | points.ts |
| Gold multiplier (DB: `all_access`, `shadow_vip`) | 2.0× | points.ts |
| Diamond multiplier (DB: `diamond`) | 2.0× | points.ts |
| Daily check-in | **RETIRED** — superseded by Daily Spin | DECISION 2026-08-16 |

---

## Compliance Matrix

Legend: ✅ CORRECT · ⚠️ PARTIAL · ❌ MISSING/BROKEN · 🔒 RESERVED (out of scope) · 🔄 PENDING CODEX REVIEW

---

### Core Multiplier Rules

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Free (none) = 1.0× event PP | 1.0× | `TIER_MULTIPLIERS['none'] = 1.0` | ✅ | — | |
| Bronze (access) = 1.25× event PP | 1.25× | `TIER_MULTIPLIERS['access'] = 1.25` *(fixed 2026-08-16)* | ✅ | — | Was broken — key mismatch fixed P0-B |
| Silver (player) = 1.5× event PP | 1.5× | `TIER_MULTIPLIERS['player'] = 1.5` *(fixed 2026-08-16)* | ✅ | — | Was broken — key mismatch fixed P0-B |
| Gold (all_access) = 2.0× event PP | 2.0× | `TIER_MULTIPLIERS['all_access'] = 2.0` *(fixed 2026-08-16)* | ✅ | — | Was broken — key mismatch fixed P0-B |
| Gold legacy (shadow_vip) = 2.0× | 2.0× | `TIER_MULTIPLIERS['shadow_vip'] = 2.0` *(fixed 2026-08-16)* | ✅ | — | |
| Diamond = 2.0× event PP | 2.0× | `TIER_MULTIPLIERS['diamond'] = 2.0` | ✅ | — | |
| Lifetime XP NEVER multiplied | Always flat | `multiplier: 1` hardcoded at insert; checkin:213 comment confirms | ✅ | — | |
| Referral PP is flat (no multiplier) | 100 PP flat | Awarded without TIER_MULTIPLIERS; checkin:15 comment confirms | ✅ | — | |
| Multiplier applies to HQ XP tiles | Yes | hq/xp:282-284 fetches tier + applies TIER_MULTIPLIERS *(fixed 2026-08-16)* | ✅ | — | |

---

### DB Enum & Type System

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| `diamond` valid in DB enum | Required for HQ assignment | Added via migration 20260816 *(2026-08-16)* | ✅ | — | Was P0-A; FIXED |
| `database.types.ts` Enums union | Include `diamond` | Updated at line 2538 | ✅ | — | |
| `database.types.ts` Constants array | Include `diamond` | Updated at line 2681 | ✅ | — | Codex-flagged; fixed |
| `normalizeTier()` handles `diamond` | Map to `'diamond'` | Added in pass-status/route.ts:28 | ✅ | — | |

---

### Daily Engagement

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Daily Check-In mechanic | **RETIRED** | No generic daily check-in route | ✅ | — | Deliberately superseded by Daily Spin — rewarding same behavior (opening app) twice is redundant |
| Daily Gacha UI | **RETIRED** | `DailyGacha.tsx` removed from Player Pass *(2026-08-16)* | ✅ | — | Card shuffle/reveal animation archived to `archive/daily-gacha` branch + `~/hyperbolic/archive/daily-gacha/` for reuse in future first-party app |
| Daily Spin = sole daily app engagement | Yes | `/api/xp/daily-spin` — 5/10/25/50/100 LXP weighted; direct call in dashboard-desktop + mobile | ✅ | — | Spin mechanic active; gacha animation wrapper retired |
| Event check-in = in-store/community participation | Yes | `/api/events/[id]/checkin` — 35 LXP + PP with tier multiplier | ✅ | — | Separate and distinct from daily spin |

---

### Event Award Flow

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Max 3 rounds per event check-in | 3 wins max | `MAX_ROUNDS = 3` enforced in checkin/route.ts:13 | ✅ | — | |
| HQ win awards | Additive `+ Win` (no hard cap) | `TILE_PP['+1 Win'] = 5`; frontend sends N repeated labels; staff sees live count *(fixed 2026-08-16)* | ✅ | — | P1-G FIXED: numbered 1/2/3/4 Win tiles replaced with additive counter |
| Referral bonus awarded once | One-time lock | Atomic `UPDATE WHERE referral_bonus_paid = false` in both paths *(hardened 2026-08-16)* | ✅ | — | |

---

### Referral System

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Referrer gets 50 LXP on referred's first event | 50 LXP flat | Path A (checkin) ✅ · Path B (hq/xp) ✅ | ✅ | — | |
| Referrer gets 10 PP on referred's first event | **10 PP flat** (supersedes 100 PP) | Both paths ✅ *(fixed 2026-08-16)* | ✅ | — | P1-H FIXED: was Path A=100 PP, Path B=0 PP. Now both=10 PP, atomic claim prevents double-award |
| `referral_bonus_paid` atomic guard | One-time lock | `UPDATE WHERE referral_bonus_paid = false RETURNING id` in both paths; reverts on XP failure *(hardened 2026-08-16)* | ✅ | — | |
| Profile referral hint copy | "+50 XP + 10 Points" | Web + mobile copy updated *(fixed 2026-08-16)* | ✅ | — | Was P3; updated alongside P1-H |

---

### Sign-Up / Welcome Bonus

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Welcome bonus — every new account | 30 LXP unconditional | AFTER INSERT trigger `player_welcome_bonus` awards 30 LXP atomically *(c7e488e)* | ✅ | — | Trigger: SECURITY DEFINER, search_path=pg_catalog, ON CONFLICT targeted, proacl={postgres=X/postgres} |
| Welcome bonus — with referral code | Included in universal award | welcome_bonus awarded regardless; referrer bonus tracked separately via referred_by+referral_bonus_paid | ✅ | — | |
| Welcome bonus — `link_existing` action | No bonus | Trigger is AFTER INSERT only; link_existing does UPDATE, trigger does not fire | ✅ | — | |
| Idempotency — player creation | DB UNIQUE(clerk_user_id) | `players_clerk_user_id_key` confirmed | ✅ | — | |
| Idempotency — welcome XP award | Partial UNIQUE INDEX on xp_ledger(player_id) WHERE source='welcome_bonus' | `xp_ledger_welcome_one_per_player` confirmed in production | ✅ | — | ON CONFLICT DO NOTHING in trigger; atomic with player INSERT |

---

### Teaching Mechanic

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Teaching bonus (20 LXP) | Spec-mentioned | Zero implementation — no route, no UI, no DB trigger | ❌ | P1 | P1-B — needs explicit WONTFIX or implementation decision |

---

### Bronze Trial Gate

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Gate value | 720 LXP | 720 LXP | ✅ | — | DECIDED 2026-08-16: launch with this |
| Which balance checked | Lifetime XP | Lifetime XP (xp_ledger sum) | ✅ | — | |
| Balance spent on claim? | No — eligibility only | XP is NOT deducted | ✅ | — | |
| Daily Spin valid toward gate | Yes | Daily Spin awards LXP; ~47 days avg to reach 720 | ✅ | — | DECIDED: daily engagement is legitimate path to trial |
| Min event attendance required | No | Not enforced | ✅ | — | DECIDED: no minimum-attendance gate at launch; evaluate behavior post-launch |
| PP spent to claim? | No | No PP required | ✅ | — | |
| Multi-claim guard | Single claim | Blocked while `pass_tier != 'none'` | ✅ | — | |
| Trial tier granted | Bronze for 30 days | `pass_tier = 'access'` (Bronze), `pass_expires_at = now + 30d` | ✅ | — | |

---

### Tier Benefits (Beyond Multiplier)

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Bronze: 5% singles discount | Yes | Zero implementation | ❌ | P1 | P1-C |
| Silver: early event registration | Yes | Zero implementation | ❌ | P1 | P1-D |
| Gold: priority/circuit access | Yes | Zero implementation | ❌ | P1 | P1-E |
| Diamond: event entry benefit | Yes | Schema columns reserved; zero API code | 🔒 | Reserved | P1-F — schema exists, launch deferred |

---

### Prize Wall Formula

| Requirement | Canonical Spec | Production State | Status | Priority | Notes |
|-------------|---------------|-----------------|--------|----------|-------|
| Auto-compute prize values from config | economy_config table | economy_config fields dead; staff manually enters all values in HQ | 🔒 | Post-launch | Keep manual for launch — evaluate later |

---

### Reserved Mechanics (Out of Scope for Launch)

| Mechanic | Status |
|----------|--------|
| Diamond event entry gate (schema exists) | 🔒 Schema reserved |
| Bronze/Silver/Gold tier benefits (discount, early reg, priority) | 🔒 Reserved — complex store-ops integration |
| Teaching mechanic (20 LXP) | ❌ P1 — needs WONTFIX decision |
| Prize Wall formula auto-compute | 🔒 Post-launch |
| Social OAuth (Google/Apple) | 🔒 Parked |
| Redemption expiry | 🔒 Parked |
| V4 visual redesign | 🔒 Parked |
| Cron jobs | 🔒 Hobby plan limitation |

---

## Open P1 Items (need fix or explicit WONTFIX before launch)

| ID | Item | Status |
|----|------|--------|
| P1-B | Teaching mechanic (20 LXP) — no implementation | Needs WONTFIX or build decision |
| P1-C | Bronze 5% singles discount | Needs WONTFIX or build decision |
| P1-D | Silver early event registration | Needs WONTFIX or build decision |
| P1-E | Gold priority/circuit access | Needs WONTFIX or build decision |
| P1-G | HQ XP `4 Wins` tile exceeds 3-round max | ✅ FIXED — additive `+ Win` counter replaces numbered tiles; no cap; each press = +5 LXP +5 PP |
| P1-H | Referral Path B (hq/xp) missing 100 PP to referrer | ✅ FIXED — both paths now award 50 LXP + 10 PP (superseded value); atomic claim prevents double-award |
| P1-Welcome | Universal welcome bonus | ✅ FIXED — c7e488e |

---

## Decisions Log

| Date | Item | Decision | By |
|------|------|----------|----|
| 2026-08-16 | P0-A diamond enum | FIXED — `diamond` added to DB enum | — |
| 2026-08-16 | P0-B multiplier key mismatch | FIXED — TIER_MULTIPLIERS covers all DB enum keys | — |
| 2026-08-16 | P0-C / claim-trial gate | ACCEPTED as-is — 720 LXP eligibility, not spent, Daily Spin valid, no min-attendance | Darrell |
| 2026-08-16 | Daily Check-In | RETIRED — superseded by Daily Spin; rewarding same behavior twice is redundant | Darrell |
| 2026-08-16 | Daily Spin economy | UNCHANGED — sole daily app-engagement mechanic | Darrell |
| 2026-08-16 | Welcome bonus | DECIDED — 30 LXP universal on `create_new`, independent of referral code | Darrell |
| 2026-08-16 | P2 Prize Wall formula | DEFERRED — keep manual staff entry for launch | Darrell |
| 2026-08-16 | P1-G HQ win awards | CHANGED — numbered tiles replaced with additive `+ Win`; no arbitrary cap; each press = 1 win | Darrell |
| 2026-08-16 | P1-H Referral PP | SUPERSEDED — 100 PP → 10 PP; community recognition not farming pathway | Darrell |
