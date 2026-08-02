# Phase 8 Follow-Up Items

## FU-1: Star Wars Unlimited Weekly — broken game_id FK (4 failed imports per sync)

**Symptom:** Every store sync reports 4 errors: `Insert Star Wars Unlimited Weekly: insert or update on table "events" violates foreign key constraint "events_game_id_fkey"`

**Root cause:** `GAME_PATTERNS` in `app/api/events/sync/route.ts` maps `/star\s*wars\s*unlimited|swu/i` to `game_id: 'star_wars_unlimited'`, but that string is not present in the `games` table.

**Fix options (pick one):**
1. Add a row to the `games` table with `id = 'star_wars_unlimited'`
2. Change the mapping in `GAME_PATTERNS` to the actual game ID used in the games table
3. Null out the game_id rather than block the insert (graceful degradation)

**Impact:** 4 real events fail to import every sync. Not a security issue but an operational defect.

---

## FU-2: Past events stuck in `scheduled` status indefinitely

**Symptom:** Events from Jan–Jul 2026 remain in the DB with `status = 'scheduled'`. They don't appear in the player-facing upcoming events view (filtered by date), but they inflate admin counts, affect reporting queries, and will eventually distort leaderboard or XP calculations if any query joins on status without a date filter.

**Fix:** Add a maintenance job (Vercel cron or Supabase scheduled function) that runs daily and sets `status = 'expired'` (or `'completed'`) for any event where `ends_at < NOW() - interval '1 hour'` and `status = 'scheduled'`.

```sql
UPDATE events
SET status = 'expired'
WHERE status = 'scheduled'
  AND ends_at < NOW() - interval '1 hour';
```

Alternatively, establish an explicit archival rule: events are never auto-transitioned (deliberate choice) and admin UI filters by date. Document whichever is chosen.

**Impact:** Reporting correctness, not user-facing.

---

## FU-3: Cron sync E2E test (deferred until calendar is configured for cron path)

**Context:** The `/api/events/sync` and `/api/events/sync-network` routes accept both a Clerk network-admin session and a `CRON_SECRET` bearer token. The bearer path was verified in Phase 8 (returns 400 "no calendar configured" — past auth). A full cron E2E would additionally verify:

- Cron fires on schedule (Vercel cron config in vercel.json)
- Calendar URL is set for the target store/network
- Sync result is non-zero events and no errors
- DB state matches iCal snapshot after cron fires

**Prerequisite:** A network-level calendar URL must be configured in HQ → Settings → Network Calendar before this test is meaningful.

---

## DNS Rebinding Residual Risk (documented, not a code change)

**Status:** Mitigated to the extent possible in userland Node.js.

**What we do:** Hostname is DNS-resolved before the first request and before each redirect destination. All resolved IPs are checked against the SSRF blocklist. Redirects use `redirect: 'manual'` — each hop is validated before the next request is sent.

**Residual gap:** Node.js `fetch` resolves the hostname again at connection time using the OS/libc resolver. Between our validation and the actual TCP connection, a DNS record with a very short TTL could theoretically flip to an internal address. This is the classic DNS-rebinding window.

**Why acceptable at current scale:** Exploiting this requires the attacker to control a DNS record for the submitted calendar URL, set TTL to near-zero, and win a narrow race between our validation and the fetch. Store owners submit their own Google Calendar iCal URLs — an attacker would need to have compromised a staff account to submit a malicious URL. The pre-validation already blocks the obvious SSRF cases.

**True mitigation if needed:** Resolve the hostname to an IP, validate the IP, then construct the request to that IP directly with `Host: hostname` header (bypasses the re-resolution). This breaks SNI/TLS cert validation without additional tooling (e.g., a custom agent). Acceptable future hardening if the threat model escalates.
