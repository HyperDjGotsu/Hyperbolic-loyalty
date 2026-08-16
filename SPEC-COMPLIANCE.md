# PlayerPass Spec Compliance Matrix
> Last verified: 2026-08-16 against production codebase + live Supabase schema (gdyksfarqpzfvymzifxr)
> Re-verified independently from code — do not trust prior session memory counts.

---

## Frozen Spec — Economy Rules

| Rule | Frozen Spec Value | Source |
|------|------------------|--------|
| Event attendance Lifetime XP | 35 LXP (flat, no multiplier ever) | checkin/route.ts:9 |
| Event attendance Prize Points (base) | 35 PP × tier multiplier | checkin/route.ts:10 |
| Win bonus Lifetime XP | 5 LXP per round (flat) | checkin/route.ts:11 |
| Win bonus Prize Points (base) | 5 PP per round × tier multiplier | checkin/route.ts:12 |
| Max rounds per event | 3 | checkin/route.ts:13 |
| Referral LXP (to referrer, on refereed's first event) | 50 LXP flat | checkin/route.ts:14 |
| Referral PP (to referrer, on referred's first event) | 100 PP flat, no multiplier | checkin/route.ts:15 |
| Bronze trial gate | 720 Lifetime XP | claim-trial/route.ts:7 |
| Bronze trial duration | 30 days | claim-trial/route.ts:8 |
| Sign-up bonus | 30 LXP, referral code required | player/link/route.ts |
| Daily spin prizes | 5/10/25/50/100 LXP (weights 40/31/20/8/1%) | xp/daily-spin/route.ts |
| Free multiplier | 1.0× | points.ts |
| Bronze multiplier (DB: `access`) | 1.25× | points.ts |
| Silver multiplier (DB: `player`) | 1.5× | points.ts |
| Gold multiplier (DB: `all_access`, `shadow_vip`) | 2.0× | points.ts |
| Diamond multiplier (DB: `diamond`) | 2.0× | points.ts |

---

## Compliance Matrix

Legend: ✅ CORRECT · ⚠️ PARTIAL · ❌ MISSING/BROKEN · 🔒 RESERVED (out of scope) · 🟡 PRODUCT DECISION PENDING

---

### Core Multiplier Rules

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Free (none) = 1.0× event PP | 1.0× | `TIER_MULTIPLIERS['none'] = 1.0` | ✅ | — | |
| Bronze (access) = 1.25× event PP | 1.25× | `TIER_MULTIPLIERS['access'] = 1.25` *(fixed 2026-08-16)* | ✅ | — | Was broken — key mismatch fixed in P0-B |
| Silver (player) = 1.5× event PP | 1.5× | `TIER_MULTIPLIERS['player'] = 1.5` *(fixed 2026-08-16)* | ✅ | — | Was broken — key mismatch fixed in P0-B |
| Gold (all_access) = 2.0× event PP | 2.0× | `TIER_MULTIPLIERS['all_access'] = 2.0` *(fixed 2026-08-16)* | ✅ | — | Was broken — key mismatch fixed in P0-B |
| Gold legacy (shadow_vip) = 2.0× | 2.0× | `TIER_MULTIPLIERS['shadow_vip'] = 2.0` *(fixed 2026-08-16)* | ✅ | — | |
| Diamond = 2.0× event PP | 2.0× | `TIER_MULTIPLIERS['diamond'] = 2.0` | ✅ | — | |
| Lifetime XP NEVER multiplied | Always flat | `multiplier: 1` hardcoded at insert; checkin:213 comment confirms | ✅ | — | |
| Referral PP is flat (no multiplier) | 100 PP flat | Awarded without TIER_MULTIPLIERS lookup; checkin:15 comment confirms | ✅ | — | |
| Multiplier applies to HQ XP tiles too | Yes | hq/xp:282-284 fetches tier + applies TIER_MULTIPLIERS *(now fixed)* | ✅ | — | |

---

### DB Enum & Type System

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| `diamond` valid in DB enum | Required for HQ assignment | Added via migration 20260816 *(2026-08-16)* | ✅ | — | Was P0-A; CONFIRMED FIXED |
| `database.types.ts` Enums union | Include `diamond` | Updated at line 2538 | ✅ | — | |
| `database.types.ts` Constants array | Include `diamond` | Updated at line 2681 | ✅ | — | Codex flagged; fixed |
| `normalizeTier()` handles `diamond` | Map to `'diamond'` | Added in pass-status/route.ts:28 | ✅ | — | |

---

### Event Award Flow

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Max 3 rounds per event check-in | 3 wins max | `MAX_ROUNDS = 3` enforced in checkin/route.ts:13 | ✅ | — | |
| HQ XP tile TILE_PP allows 4 wins | 3 wins max | `TILE_PP` has `'4 Wins': 20` at hq/xp route | ❌ | P1 | Staff can manually over-award a 4-win tile violating the 3-round cap |
| Referral bonus awarded once | One-time | `referral_bonus_paid` guard in both paths | ✅ | — | |

---

### Referral System

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Referrer gets 50 LXP when referred attends first event | 50 LXP | Path A (checkin): awards 50 LXP ✅ · Path B (hq/xp): awards 50 LXP ✅ | ✅ | — | |
| Referrer gets 100 PP when referred attends first event | 100 PP | Path A (checkin): awards 100 PP ✅ · Path B (hq/xp): awards **0 PP** ❌ | ⚠️ | P1 | If hq/xp fires first (manual award), referrer misses 100 PP and flag is set → checkin path skips |
| `referral_bonus_paid` guard prevents double-award | Yes | Both paths check flag; checkin:29, hq/xp:100 | ✅ | — | Guard works but ordering bug means P1 above |
| New player gets 30 LXP on signup with referral | 30 LXP, code required | player/link route awards 30 LXP if code provided | ✅ | — | |
| New player gets 30 LXP universally on signup | Unconfirmed — may be referral-only by design | player/link awards ONLY with referral code | 🟡 | P1/DECISION | P1-A: Is universal sign-up bonus intended? |
| Profile referral hint shows "+50 XP + 100 PP" | Full reward shown | Currently shows "+50 XP" only (100 PP omitted) | ⚠️ | P3 | UI copy only |

---

### Sign-Up Bonus

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Sign-up bonus without referral code | 30 LXP universal (unverified) | No bonus awarded without referral code | 🟡 | P1 | **DECISION NEEDED**: Is universal bonus intended? Or referral-only by design? |
| Sign-up bonus with referral code | 30 LXP | 30 LXP awarded correctly | ✅ | — | |

---

### Teaching Mechanic

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Teaching bonus (20 LXP) | Mentioned in spec | Zero implementation — no route, no UI, no DB trigger | ❌ | P1 | P1-B |

---

### Claim-Trial Gate (P0-C → Reclassified)

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Gate value | TBD (design decision) | 720 Lifetime XP | 🟡 | P2/DECISION | Reclassified from P0 — gate on LXP may be intentional design |
| Which balance is checked | TBD | Lifetime XP (xp_ledger sum) | 🟡 | P2/DECISION | Not Prize Points |
| Balance spent? | TBD | No — eligibility check only, XP retained | 🟡 | P2/DECISION | |
| Daily spin contribution to gate | — | 5-100 LXP/day (avg ~15.1 LXP); gate reachable in ~47 days of spins alone | 🟡 | — | Info for decision |
| Event attendance contribution | — | 35 LXP base + 5 per win | 🟡 | — | Info for decision |
| Prize Points spent to claim? | TBD | No PP required | 🟡 | P2/DECISION | |
| Can player claim multiple times? | TBD | No: blocked while `pass_tier != 'none'` | ✅ | — | Guard exists |
| Trial tier granted | Bronze | `pass_tier = 'access'` (Bronze DB value) for 30 days | ✅ | — | |

---

### Tier Benefits (Beyond Multiplier)

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Bronze: 5% singles discount | Yes | Zero implementation | ❌ | P1 | P1-C — no discount logic anywhere |
| Silver: early event registration | Yes | Zero implementation — all events open to all tiers | ❌ | P1 | P1-D |
| Gold: priority/circuit access | Yes | Zero implementation | ❌ | P1 | P1-E |
| Diamond: event entry benefit | Yes | Schema columns exist (`diamond_entry_used_this_month`, `diamond_entry_reset_at`) in `player_pass_subscriptions` — zero reads or writes in API layer | 🔒 | P1/Reserved | P1-F — schema reserved, not implemented |

---

### Daily Check-In vs Daily Spin

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Daily check-in XP | Spec says 3 LXP | Route awards 5 LXP | 🟡 | P2/DECISION | Intentional increase? |
| Daily spin (separate mechanic?) | Unclear — replacement or addition | Daily spin is entirely separate API (`/api/xp/daily-spin`); both can trigger | 🟡 | P2/DECISION | Is spin a replacement for check-in or additive? |

---

### Prize Wall Formula

| Requirement | Frozen Spec | Production State | Status | Priority | Notes |
|-------------|-------------|-----------------|--------|----------|-------|
| Auto-compute prize values from config | Yes (economy_config table) | `economy_config` divisor/floor/buffer are dead config; staff manually enters all prize values in HQ | 🟡 | P2/DECISION | Keep manual or enforce formula? |

---

### Reserved Mechanics (Out of Scope for Launch)

| Mechanic | Status |
|----------|--------|
| Diamond event entry gate (schema exists) | 🔒 Schema reserved, no code |
| Social OAuth (Google/Apple) | 🔒 Parked |
| Redemption expiry | 🔒 Parked |
| V4 visual redesign | 🔒 Parked |
| Cron jobs | 🔒 Hobby plan limitation |

---

## Summary by Priority

| Priority | Count | Items |
|----------|-------|-------|
| **FIXED this session** | 2 | P0-A (diamond enum), P0-B (multiplier key mismatch) |
| **P1 — Pre-launch, needs fix or explicit WONTFIX** | 5 | `4 Wins` HQ tile, Referral Path B missing 100 PP, Sign-up bonus decision, Teaching mechanic (20 LXP), Bronze/Silver/Gold/Diamond tier benefits |
| **P2 — Product decisions needed** | 4 | Claim-trial gate design, Daily check-in 5 vs 3 LXP, Daily spin vs check-in (additive?), Prize Wall formula enforcement |
| **P3 — Polish** | 1 | Profile referral hint missing 100 PP copy |
| **Reserved** | 5 | Diamond entry gate, Social OAuth, Redemption expiry, V4, Crons |

---

## Decisions Log

| Date | Item | Decision | By |
|------|------|----------|----|
| 2026-08-16 | P0-C claim-trial gate | Reclassified to P2/DECISION — LXP gate may be intentional design | Darrell |
| 2026-08-16 | P0-A diamond enum | Fixed — `diamond` added to DB enum | — |
| 2026-08-16 | P0-B multiplier key mismatch | Fixed — TIER_MULTIPLIERS now includes all DB enum value keys | — |
