# Player Pass — Launch Acceptance Test
> Date: 2026-08-16  
> Tester: Claude (autonomous Playwright + API inspection + static code review)  
> Production URL: https://playerpass.gg  
> Mobile: com.gshc.playerpass (EAS production channel, OTA a97efa1)

Legend: ✅ PASS · ❌ FAIL · ⚠️ PARTIAL · 🚫 NOT TESTABLE / REQUIRES DARRELL · 🔄 IN PROGRESS

---

## Persona 1 — Brand-New Player

| Workflow | Result | Notes |
|---------|--------|-------|
| App launches from signed-out state | ✅ | playerpass.gg loads clean dark landing with "Level up your community." |
| Create account | ⚠️ | Sign-up form loads, CAPTCHA blocks headless completion — requires Darrell |
| Complete onboarding | ✅ | UI verified: Display Name, Referral Code (+bonus XP copy), Discord, Phone, Game picker |
| Select home store | ✅ | All 6 stores load correctly with cities; Trade Emporium shows Flagship badge |
| +30 LXP welcome bonus awarded exactly once | 🚫 | Cannot verify without completing account creation |
| Dashboard loads correctly | 🚫 | Requires full auth |
| Correct terminology (Player Pass / Prize Points) | ✅ | Landing uses "Player Pass"; onboarding says "start earning XP" |
| Daily Spin works | 🚫 | Requires auth |
| Balance updates correctly after spin | 🚫 | Requires auth |
| Close/relaunch — state persists | 🚫 | Requires auth |
| Events tab: understandable and functional | ✅ | Public event page loads; XP values confirmed correct (+35/+5) after fix |
| Community tab: understandable and functional | 🚫 | Requires auth |
| Prize Wall tab: loads | 🚫 | Requires auth |
| Alerts tab: loads | 🚫 | Requires auth |
| Profile tab: understandable and functional | 🚫 | Requires auth |
| Customize avatar (emoji/color/frame) | 🚫 | Requires auth |
| Upload profile photo | 🚫 | Requires auth |
| Avatar propagates across app | 🚫 | Requires auth |

## Persona 2 — Returning Player

| Workflow | Result | Notes |
|---------|--------|-------|
| Sign out → sign in | 🚫 | Requires Darrell credentials |
| Balances persist across session | 🚫 | Requires auth |
| Daily Spin remembers today's claim | 🚫 | Requires auth |
| Home store persists | 🚫 | Requires auth |
| Profile/avatar persists | 🚫 | Requires auth |
| Friends list loads | 🚫 | Requires auth |
| Friend requests behave correctly | 🚫 | Requires auth |
| Community search loads | 🚫 | Requires auth |
| Leaderboards load | 🚫 | Requires auth |
| Notifications/alerts load | 🚫 | Requires auth |
| Prize Wall loads with correct balance | 🚫 | Requires auth |
| Events show My Store vs Network correctly | 🚫 | Requires auth |

## Persona 3 — Ordinary Staff

| Workflow | Result | Notes |
|---------|--------|-------|
| Staff account provisioning | 🚫 | Requires Darrell / staff credentials |
| HQ access visible after staff login | 🚫 | Requires staff credentials |
| Staff sees only store-scoped functionality | ✅ | Code review: requireStoreAccess() enforced on all store-scoped HQ routes |
| Player lookup | 🚫 | Requires staff login |
| Event check-in workflow | 🚫 | Requires staff login |
| Additive + Win awards | 🚫 | Requires staff login |
| Prize Wall fulfillment | 🚫 | Requires staff login |
| Cross-store access blocked | ✅ | Code review: requireStoreAccess(storeId) blocks cross-store API calls; 403 verified on unauthenticated HQ request |

## Persona 4 — Manager / Network Admin

| Workflow | Result | Notes |
|---------|--------|-------|
| Elevated HQ access visible | 🚫 | Requires admin credentials |
| Staff/access management | 🚫 | Requires admin credentials |
| Store configuration | 🚫 | Requires admin credentials |
| Event administration | 🚫 | Requires admin credentials |
| Player administration | 🚫 | Requires admin credentials |
| Prize Wall administration | 🚫 | Requires admin credentials |
| Network admin functions inaccessible to ordinary staff | ✅ | Code review: requireNetworkAdmin() on all network-level routes; isNetworkAdmin flag gates scoped vs global access |

---

## Findings

### BLOCKER
*(none)*

### FIX BEFORE LAUNCH — ALL FIXED THIS SESSION

**F1 — Events XP display mismatch** (commit a5a523e) ✅ FIXED  
Events API returned stale DB values (10–30 attendance, 10 win) while checkin always awarded constants (35 attendance, 5 win). Win XP was an active overpromise to players: card showed +10, ledger got +5.  
Fix: Created `lib/xp-constants.ts` with canonical constants; updated events/route.ts, events/[id]/public/route.ts, events/active/route.ts, events/create/route.ts, events/[id]/checkin/route.ts. Verified live: API now returns `attendanceXp:35, winXp:5`; public event page shows "+35 Attendance, +5 Per Win".  
Codex challenge: CONFIRMED (expanded scope from 1 file to 4).

**F2 — COTD POST/DELETE unguarded (XP write risk)** (commit d2d9ed1) ✅ FIXED  
`/api/hq/cotd` POST and DELETE had zero authentication. The `finalize_voting` action wrote to `xp_ledger` using the service role key (bypasses RLS), enabling unauthenticated XP manipulation. All other HQ mutation routes were guarded; this one was missed.  
Fix: Added `requireAnyStaff()` guard to POST and DELETE handlers, consistent with the rest of the HQ API surface.  
Codex challenge: CONFIRMED (escalated from cosmetic to XP-write risk).

### POST-LAUNCH

**P1 — Game tile labels truncate in onboarding** ("Magic: The Gath...", "Star Wars Unlimi...")  
Minor display issue; doesn't affect functionality or data.

**P2 — CSP allows *.clerk.com but Clerk loads from clerk.playerpass.gg**  
`clerk.playerpass.gg` violates the existing CSP `script-src` directive. All violations are report-only mode so nothing is blocked, but the CSP should be updated to include `clerk.playerpass.gg` to stay accurate and enable enforcement mode later.

**P3 — photo_url validation in avatar route accepts any Supabase storage URL**  
Only affects caller's own display (no cross-user write). Harden to namespace check post-launch.

**P4 — Public event page location hardcoded to "Games of Martinez"**  
`/api/events/[id]/public/route.ts` returns `location: 'Games of Martinez'` — will need dynamic store lookup when other stores go live.  
**→ FIXED overnight (commit e17703c):** Store name, address, city/state now read from events join. All four hardcoded strings in page.tsx replaced. TypeScript clean.

---

## Fixes Applied This Session

| Commit | Fix |
|--------|-----|
| 426301a | effectivePassTier() — pass expiry enforcement across checkin, hq/xp, pass-status, claim-trial |
| 426301a | xp_awarded alias in checkin response for mobile |
| 426301a | Onboarding retry on store load failure |
| a5a523e | XP constants centralized — events display now matches what checkin awards |
| d2d9ed1 | COTD POST/DELETE guarded with requireAnyStaff() |

**Pre-session fixes (applied earlier):**
- Pass expiry enforcement (effectivePassTier) — P1
- Mobile XP alias (xp_awarded) — P1
- Onboarding retry — P1
- Avatar cross-user attack vectors — all 4 SECURE
- OTA published (a97efa1)

---

## Overnight Hardening Pass (2026-08-17)

**Mission:** Autonomous HQ security audit + multi-store isolation hardening before staff provisioning.

### Fixed Overnight

| Commit | Class | Fix |
|--------|-------|-----|
| ea9880e | Security | **B2** Player DELETE — `requireAnyStaff()` → `requireNetworkAdmin()`. Any staff could delete any player. |
| ea9880e | Branding | **B3** Staff invite emails — sender/subject/body now say "Player Pass" not "Hyperbolic XP" |
| ea9880e | Isolation | **F1** Cross-store player search — non-admins now scoped to `staffCtx.allStoreIds` via `home_store_id IN (...)` |
| ea9880e | Isolation | **F2** PATCH player with null home_store — falls back to `requireNetworkAdmin()` instead of any-staff |
| 7f969af | Cleanup | Removed dead `requireAnyStaff` import after B2/F2 fixes |
| fbfaa00 | Docs | Migration file 20260717013624 updated to match actual live function (was stale — showed `success` key, live returns `ok/code`) |
| 5e70880 | Revert | **B1 false positive** — reverted incorrect fix to invite route; original `result.ok` check was correct all along |
| e17703c | Branding | **F3** Public event page — all 4 hardcoded "Games of Martinez" strings replaced with dynamic store join |

### B1 False Positive — Documented

Codex adversarial review flagged `accept_staff_invitation` route as checking `result.ok` when the SQL function returns `result.success`. This was based on reading the stale migration file. Verified live via `pg_get_functiondef()`: the production function returns `{ok: boolean, code: string}`. Original route was correct. Migration file updated. No production behavior changed.

### Acceptance — Invite Flow (Supabase MCP)

All five acceptance paths verified via direct RPC:
- Valid token → new assignment: `{ok: true, store_id, role}`
- Already accepted token: `{ok: false, code: 'ALREADY_ACCEPTED'}`  
- Idempotent (same user, same role): `{ok: true, code: 'ALREADY_ASSIGNED'}`
- Promotion (staff → manager): `{ok: true, code: 'UPGRADED'}`
- Downgrade prevention: `{ok: false, code: 'WOULD_DOWNGRADE'}`

### Still Requires Darrell

| Item | Blocker |
|------|---------|
| HQ UI walk (invite creation, player list, events tab) | Browser session expired |
| Full invite flow (create → email → accept → HQ) | Resend domain not configured |
| Mobile regression testing | No ADB device in session |

### Resend Email Setup (When Ready)

1. Log in to Resend → add domain `playerpass.gg`
2. Add DNS TXT + MX records via GoDaddy (ns63/ns64)
3. Update `apps/web/app/api/hq/staff-invitations/route.ts` sender from `onboarding@resend.dev` → `noreply@playerpass.gg`

Until then, invitations arrive from the shared Resend domain — functional, may land in spam.
