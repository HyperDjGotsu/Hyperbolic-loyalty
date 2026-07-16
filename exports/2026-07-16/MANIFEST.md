# Player Data Export — 2026-07-16

Exported before multi-store architecture migration (clean-slate player reset).

## Files

| File | Rows | Notes |
|------|------|-------|
| players.json | 10 | All player accounts, XP, pass tier, staff flags, Clerk IDs |
| xp_ledger.json | 101 | Complete XP history per player |
| daily_spins.json | 10 | All spin records |
| event_attendances.json | 1 | Event check-in records |
| friendships.json | 3 | Friend requests (1 accepted, 2 pending) |
| emperors.json | 1 | December 2025 One Piece Emperor: DjGotsu |
| bounty_hunter_participants.json | 1 | BH night participants |
| bounty_hunter_matches.json | 1 | BH night match results |
| prize_point_transactions.json | 0 | Empty — no PP spends yet |

## Player Summary

| HYP-ID | Display Name | Email | Staff | Clerk Linked | Lifetime XP (approx) |
|--------|-------------|-------|-------|--------------|----------------------|
| HYP-TEST01 | TestPirate | — | No | No | ~180 |
| HYP-WHFEUV | Gotsumon | djgotsumon@gmail.com | No | Yes | ~50 |
| HYP-KDEBDL | 8bitNik (Luis Pacheco) | luisacosta7720@gmail.com | No | No | 0 |
| HYP-MA794R | Oshy (Matthew Juntilla) | headmasterbrixham@gmail.com | No | No | 0 |
| HYP-CVXQPR | Heajah (Heather Rilles) | — | No | No | 0 |
| HYP-NCTE64 | DjGotsu (Darrell Parker) | dp2526@yahoo.com | **Yes** | Yes | ~2,800+ |
| HYP-9R3XQZ | LoudSneezes (Aaron Craig) | — | No | No | 0 |
| HYP-72KSCE | Tingus Pingus (James Greenland) | smonknconq@gmail.com | No | No | 0 |
| HYP-G28B9V | Darrell | djgotsuai@gmail.com | No | Yes | ~10 |
| HYP-ER7K52 | SBSophi | sophiagracef@gmail.com | **Yes** | Yes | ~5 |

## Key Observations
- Only 4 players have Clerk accounts linked (can actually log in): Gotsumon, DjGotsu, Darrell, SBSophi
- HYP-TEST01 (TestPirate) is a test account with no Clerk link
- 6 players were seeded manually and have no Clerk accounts
- DjGotsu and SBSophi are the only `is_staff = true` accounts
- SBSophi was referred by DjGotsu
- Zero prize_point_transactions — PP wallet is fresh

## Deletion Approval Required
**DO NOT DELETE until user explicitly approves.**
After approval, run the clean-slate migration to drop all player gameplay data
and rebuild with the new `app_users` identity layer.
