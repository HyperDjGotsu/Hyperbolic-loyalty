# Hyperbolic App — Project Context

## What This Is
Hyperbolic XP — a gamified loyalty platform for TCG game stores. Players earn
XP through event attendance, match wins, purchases, and community engagement.
Built for Games of Martinez (Hyperbolic Games). SaaS pivot potential: license
to other game stores.

## Emotional Context
The store situation fell through, pausing this project. Picking it back up
partly for fun, partly for the SaaS angle. The app captured a snapshot of a
community and staff from that era — handle with care.

## Live URLs
- Production: https://hyperbolic-loyalty.vercel.app
- Legacy MVP: https://tangerine-brigadeiros-d910c6.netlify.app

## Tech Stack
- Next.js 14 (App Router)
- Clerk (auth)
- Supabase (PostgreSQL + RLS) — project ID: gdyksfarqpzfvymzifxr
- Vercel (auto-deploys from main branch)
- Tailwind CSS
- GSAP (installed, keep it)
- Airtable (legacy workflows only)
- Repo: HyperDjGotsu/Hyperbolic-loyalty

## DjGotsu Account
- HYP-ID: HYP-NCTE64

## Working Routes
- Landing, dashboard, community/leaderboards, events calendar
- Cosmetics shop (UI only, not wired)
- Profile with referrals
- Onboarding with referral code support
- /hq staff admin
- Public event pages: /event/[id]

## Completed Features
- Full referral system (signup +30 XP, referrer +50 XP on first attendance)
- Bounty Hunter Night (monthly, auto-WANTED top 5, tiered point stakes)
- Pirate's Life / Hyperlife monthly attendance achievements
- Public event sharing (Pacific timezone, interested count, native share API)
- Supabase client consolidated to lib/supabase.ts (single source of truth)

## Next Priorities
1. Desktop V4 redesign — approved prototype, never implemented in React
   (4 HTML prototypes built, V4 won — clean layout, ambient glow, avatar
   pulse, XP bar shine sweep. Lenis removed due to scroll issues.)
2. Daily gacha spin backend — UI likely exists, backend not wired
3. TypeScript cleanup — remove 'as any' casts, regenerate Supabase types:
   npx supabase gen types typescript --project-id gdyksfarqpzfvymzifxr > types/database.types.ts
4. Shop purchase flow, push notifications, event check-in via app
5. Phase 6 / Commerce: Square + Shopify purchase sync, battle pass system

## External APIs
- JustTCG (free tier 1,000 calls/mo) — 13 games, price + trend data
- OPTCG API — One Piece specific, free
- ApiTCG — planned, covers Gundam/Star Wars Unlimited/Riftbound (key needed)

## Game Currencies
- One Piece: Berries (2x/week, East Blue Rookie → Yonko Commander)
- Standard games: Tier1-7 (1x/week) with themed titles per game
- Gundam/Pilot Points, Pokémon/Pokepoints, MTG/Mana Marks, etc.

## Hardware
- NTAG215 NFC cards for player check-in
- Android tablet with Web NFC at check-in station
- Optional: ACR122U USB readers (~$30-40) for cross-platform

## Critical Rules for This Project
- NEVER use select('*') — always explicit column selection (causes stale/wrong data)
- Don't edit HTML files with str_replace if they contain UTF-8 emojis — use Python in binary mode (rb/wb)
- Deploy workflow: git add -A && git commit -m "message" && git push
- Always update PROJECT_STATUS.md at end of each session
- backup-before-redesign branch exists as safe fallback

## Open Questions
- Admin events page: userMemories says build it, PROJECT_STATUS.md says decided against (use Google Calendar sync). Confirm with Darrell.
- Canonical game list: userMemories says 17 games, PROJECT_STATUS focuses on fewer. Confirm current list.
- Emperor cycle: yearly vs six-monthly still unresolved.

## Key Principles
- Staff interfaces must be dead simple — pre-set combo buttons only
- Emperor = #1 only, never dilute prestige
- Timestamped ledger entries, not point resets
- Anonymous mode not ghost mode (hide identity, keep leaderboard position)
- Community-first over extraction
