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
