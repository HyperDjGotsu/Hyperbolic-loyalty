# Player Pass — Launch Acceptance Test
> Date: 2026-08-16 through 2026-08-17  
> Tester: Darrell (manual) + Claude (Playwright / API / code review)  
> Production URL: https://playerpass.gg  
> Mobile: com.gshc.playerpass (EAS production channel, OTA a97efa1)

---

## 🟢 DECISION: GO — INTERNAL STAFF PILOT

**Signed off: 2026-08-17**

All launch-blocking issues resolved. All critical paths manually validated by Darrell in real production environment. Remaining items are non-blocking and documented under POST-LAUNCH / V2 below.

---

Legend: ✅ PASS · ❌ FAIL · ⚠️ PARTIAL · 🚫 NOT TESTABLE · 📋 PREVIOUSLY VALIDATED

---

## Persona 1 — Brand-New Player

| Workflow | Result | Notes |
|---------|--------|-------|
| App launches from signed-out state | ✅ | playerpass.gg loads clean dark landing |
| Create account / onboarding | ✅ | Manually validated by Darrell |
| Dashboard loads correctly | ✅ | Manually validated by Darrell |
| Responsive desktop + narrow web | ✅ | Manually validated by Darrell |
| Avatar / photo behavior | ✅ | Manually validated by Darrell |
| Events tab: understandable and functional | ✅ | Public event page loads; XP values confirmed correct (+35/+5) |
| Community / friend functionality | ✅ | Manually validated by Darrell |
| Prize Wall / redemption | 📋 | Previously validated end-to-end |
| QR / mobile event check-in | 🚫 NOT TESTABLE | No currently synced event available — NOT a FAIL; validate when first synced event goes live |
| Android E2E | 📋 | Previously completed |

## Persona 2 — Returning Player

| Workflow | Result | Notes |
|---------|--------|-------|
| Sign out → sign in | ✅ | Manually validated |
| Balances / XP persist across session | ✅ | Manually validated |
| Profile / avatar persists | ✅ | Manually validated |
| Friends list / requests behave correctly | ✅ | Manually validated |
| Prize Wall loads with correct balance | 📋 | Previously validated |

## Persona 3 — Ordinary Staff

| Workflow | Result | Notes |
|---------|--------|-------|
| Staff invitation created and delivered | ✅ | Real Resend email delivered; link functional |
| Invitation email acceptance flow | ✅ | Token-in-path survives Clerk session-handshake; manually validated |
| HQ access after staff login | ✅ | Manually validated — Trade Emporium staff account |
| Store-scoped staff authorization | ✅ | Staff sees only their store's data; cross-store event End blocked with correct 403 |
| Network-wide player lookup | ✅ | Intentional — player identity is network-wide; discovery ≠ administration |
| Staff point award + store provenance | ✅ | PP awarded; store short ID (TEM/GGOB etc.) appears in activity feed |
| Cross-store administration blocked | ✅ | requireStoreAccess() enforced on all mutation routes |

## Persona 4 — Network Admin

| Workflow | Result | Notes |
|---------|--------|-------|
| Network admin HQ access | ✅ | Manually validated |
| Staff invitation creation | ✅ | Invite created, email delivered, accepted as TEM staff |
| Event administration | ✅ | End Event — old stuck active event closed successfully |
| Store-scoped active event display | ✅ | Each HQ store view shows only that store's active event |
| Network admin functions inaccessible to ordinary staff | ✅ | requireNetworkAdmin() on all network-level routes |

---

## Findings

### BLOCKERS
*(none at GO)*

### FIXED BEFORE LAUNCH

| Commit | Fix |
|--------|-----|
| 426301a | effectivePassTier() — pass expiry enforcement across checkin, hq/xp, pass-status, claim-trial |
| 426301a | xp_awarded alias in checkin response for mobile |
| 426301a | Onboarding retry on store load failure |
| a5a523e | XP constants centralized — events display now matches what checkin awards (was mismatch) |
| d2d9ed1 | COTD POST/DELETE guarded with requireAnyStaff() — was unauthenticated XP write risk |
| ea9880e | Player DELETE elevated to requireNetworkAdmin() — any staff could delete any player |
| ea9880e | Staff invite emails rebranded to Player Pass |
| ea9880e | Cross-store player PATCH restricted |
| e17703c | Public event page — all 4 hardcoded "Games of Martinez" strings replaced with dynamic store join |
| (overnight) | F1 store-scoped search reverted — network-wide lookup is intentional product design |
| (overnight) | Invite token moved from query param to URL path segment — survives Clerk session-handshake redirect |
| 3d89987 | Store attribution in XP activity feed — store short_id (TEM/GGOB/etc.) shown in activity |
| 62d4cc2 | End Event fixed — active endpoint now store-scoped; activate route verifies row was updated |

---

## Authorization Model — As of 2026-08-19

### Staff Role Hierarchy

| Role | Scope | Source Table | Capability |
|------|-------|-------------|-----------|
| `store_staff` | Per-store | `staff_store_roles` | Operational awards (server-calculated, whitelist-only), kiosk check-in, read staff roster for own store |
| `store_manager` | Per-store | `staff_store_roles` | All store_staff + event creation, broadcast, store calendar, redemption void, discretionary XP corrections |
| `network_admin` | Network-wide | `network_staff_roles` | All manager + COTD, Prize Point manual adjustment, player delete, staff promotion |

**Policy**: Store Staff = operations. Store Managers = store configuration and correction. Network Admins = economic and network control.

### Key Authorization Boundaries (hardened 2026-08-18, commit 5e5cca8)

- **COTD read**: requireAnyStaff (was unauthenticated GET)
- **COTD write/delete**: requireNetworkAdmin
- **Event creation**: requireStoreManager (store-scoped) or requireNetworkAdmin
- **Store calendar PATCH**: requireStoreManager
- **Broadcast POST (store-scoped)**: requireStoreManager
- **Prize Point manual adjustment**: requireNetworkAdmin (merged both branches)
- **Redemption void**: requireStoreManager inline check added
- **Kiosk check-in auth**: replaced `players.is_staff` boolean with `getStaffContext()` role-table check
- **HQ XP tile awards** → `/api/hq/xp/operational` (requireAnyStaff, server-computed amounts, whitelist-only labels)
- **HQ XP discretionary corrections** → `/api/hq/xp` (requireStoreManager)

### XP Operational Award Whitelist (commit 502e138)

```
Attended, +1 Win, Undefeated, First Timer, Returner, Signed Up, Taught Player
```

Amounts are server-computed from `xp-constants.ts` — staff cannot supply amounts directly.

### Prize Point RPC Invariant (migration 20260818000000, commit 8a7f462) — LIVE ✅

Applied to production 2026-08-19. Verified in live DB: `pg_advisory_xact_lock` and non-negative balance guard both present.

`adjust_prize_points` now:
1. Acquires a transaction-scoped advisory lock per player (`pg_advisory_xact_lock`)
2. Reads current balance before inserting
3. Rejects deductions that would produce a negative balance (returns error JSON with shortfall detail, no INSERT)

`create_prize_redemption` is independent — has its own balance check, does not call this function.

### Acknowledged Technical Debt

**`players.is_staff` attribution** (checkin route line ~181): The `staffId` attribution still reads from `authedPlayer.is_staff` as a shortcut to get the staff player's DB id for the `awarded_by` field. This is attribution-only (not an auth gate). The actual gate above it uses `getStaffContext()`. Can be cleaned up when `staff_store_roles` is joined to return the player id directly.

**Manager Prize Point correction limits**: No per-player/per-day cap on network admin Prize Point manual adjustments. Intentionally deferred — requires per-player/per-day limit design discussion.

---

### POST-LAUNCH / V2 (non-blocking)

**P1 — Game tile labels truncate in onboarding**  
"Magic: The Gath...", "Star Wars Unlimi..." — cosmetic only.

**P2 — CSP allows *.clerk.com but Clerk loads from clerk.playerpass.gg**  
Report-only mode; nothing blocked. Update CSP to include `clerk.playerpass.gg` before enabling enforcement.

**P3 — Avatar route photo_url accepts any Supabase storage URL**  
Only affects caller's own display; no cross-user write. Harden to namespace check post-launch.

**P4 — Resend click tracking (awstrack.me)**  
Transactional emails route through Resend's shared tracking domain. Token is now path-based so tracking redirects don't break invite flow. Disable tracking at domain level in Resend dashboard once playerpass.gg domain is configured.

**P5 — ALREADY_ACCEPTED branch in accept-invite page uses substring match**  
`data.error?.includes('already been accepted')` — functional but `data.code` check would be more robust. Not a security issue.

**P6 — Store attribution only applies to new XP ledger entries**  
Historical entries without store_id won't show location tags. Expected behavior; no backfill needed for pilot.

**P7 — Simultaneous multi-store active events**  
`/api/events/active` returns 1 event per query (limit 1). If two stores run simultaneous events, each HQ only sees its own store's event. Network admin unscoped view returns the oldest. Track for post-pilot if needed.

---

## Immediate Operational Items Before Pilot

### Required Before First Staff Invite

1. **Configure playerpass.gg in Resend**
   - Log in to Resend → Domains → Add `playerpass.gg`
   - Add DNS TXT + MX records via GoDaddy (ns63 / ns64 nameservers, NOT Cloudflare)
   - Update sender in `apps/web/app/api/hq/staff-invitations/route.ts`: `onboarding@resend.dev` → `noreply@playerpass.gg`
   - Until then: invitations arrive from Resend's shared domain — functional but may land in spam

### Remaining Verification (when opportunity arises)

2. **Real QR / event check-in test**  
   Requires a synced Google Calendar event to be live. Walk through: staff starts event in HQ → player scans QR → check-in recorded → XP + PP awarded → staff sees attendance count update. NOT a launch blocker.
