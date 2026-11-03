# Mobile app launch: what's needed from Darrell

Running list. Claude keeps it current; check items off as you finish them.
Branch: `redesign-home`. The native app work is NOT on `main` yet.

## Needed now (blocks sign-in / push / builds)
- [ ] **Report email address** → set `REPORTS_EMAIL` in Vercel env vars (Production). Reports are already saved in `player_reports`; email starts once set.
- [ ] **Clerk: Google sign-in** → Clerk dashboard → SSO Connections → Google → add your own Google OAuth credentials (shared dev keys do not work in production builds).
- [ ] **Clerk: Apple sign-in** → SSO Connections → Apple → add Services ID, Team ID, Key ID and the `.p8` key (needs Apple Developer account). Enable Sign in with Apple for app ID `gg.playerpass.app`.
- [ ] **Clerk: redirect URL** → Native applications → allowlist `playerpass://sso-callback`.
- [ ] **Firebase** → create a project, add Android app `gg.playerpass.app`, download `google-services.json` into `apps/mobile/` (Android push notifications).
- [ ] **EAS production env vars** (expo.dev → project → Environment variables, "production" and "preview"):
  - `EXPO_PUBLIC_API_URL` = `https://playerpass.gg`
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = the LIVE Clerk key (`pk_live_...`), not `pk_test_`
- [ ] **Developer accounts**: Google Play Console ($25 one time), Apple Developer ($99/year).

## Needed for store release
- [ ] **Apple**: create the app in App Store Connect (bundle `gg.playerpass.app`), then give Claude the ASC App ID and Team ID for `eas.json` `submit.production`.
- [ ] **Google Play**: create the app, make a service account JSON key for EAS submit (keep it out of git).
- [ ] **Deep links**: set `APPLE_TEAM_ID` (Vercel) and `ANDROID_CERT_SHA256` (Play Console → App signing → SHA-256) so `playerpass.gg/event/<id>` opens the app. Routes already exist at `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`.
- [ ] **Store listing**: short + full description, support URL, screenshots (Claude can make these once the app runs), age rating answers, data-safety / privacy-label answers (Claude can draft).
- [ ] **Apple review demo account**: create a test player login and give Claude the email/password to put in the review notes.
- [ ] **Lawyer review** of Privacy Policy and Terms (before public launch).

## Needed for you to test
- [ ] Run on your phone: Claude will make a preview build once the EAS env vars are in (`eas build --profile preview`). Test: sign in, Events interest/share, Alerts tap, Prize Wall, Profile themes, report/block.
- [ ] Notification icon: white-on-transparent PNG for Android (optional, nicer than the current app icon).

## Known gaps vs the website (not blockers)
- Podium/avatars and game tiles are not pixel-matched to web art; tour is cards without highlights
- Replay page tips only resets flags (shows next visit)
- Google/Discord linking from Profile needs `playerpass://` allowed as a redirect in Clerk; untested
- Link opened while signed in but unlinked is not saved; staff invite link in onboarding not built

## Decisions pending
- [ ] Add a staff page in HQ for viewing player reports? (Email only for now.)
- [ ] Merge native app work to `main` when you say so.

## Done by Claude (for reference)
Phase 0 blockers (age gate, QR check-in, tiers, legal links, push routing) · Phase 1 design system · Events, Alerts, Prize Wall, Home, Profile, Community rebuilt · Google/Apple/password-reset auth screens · player reports + block (server enforced) · universal-link config · welcome overlay, home tour, page intros.
