-- First-week watch list. SELECT ONLY: every query below is read-only. Run them one at a time (they are separate queries).
-- They watch the player workflows that were tested locally but have not yet run in production.
-- Each says what a healthy result looks like. "since" = the last 24 hours; change it if needed.

-- W1. Events left open: still 'active' long after their scheduled end. HEALTHY: no rows (staff end each event at close).
select e.name, s.name as store, to_char(e.scheduled_at at time zone 'America/Los_Angeles','Dy Mon DD HH24:MI') as starts_pt,
       round(extract(epoch from (now() - coalesce(e.ends_at, e.scheduled_at + interval '3 hours')))/3600.0, 1) as hours_past_end, e.id
  from events e join stores s on s.id = e.store_id
 where e.status = 'active' and coalesce(e.ends_at, e.scheduled_at + interval '3 hours') < now() - interval '6 hours'
 order by hours_past_end desc;

-- W2. Who awarded each check-in: staff (awarded_by = a staff player) or the player's own phone (awarded_by is null).
--     HEALTHY: a player's own phone check-in has awarded_by NULL; a staff check-in names the staff member. Look for anything odd.
select e.name as event, x.final_xp, (p.player_id || ' ' || p.display_name) as player,
       coalesce((select a.player_id || ' ' || a.display_name from players a where a.id = x.awarded_by), 'NULL = own phone') as awarded_by,
       to_char(x.created_at at time zone 'America/Los_Angeles','Mon DD HH24:MI') as at_pt
  from xp_ledger x join events e on e.id = x.event_id join players p on p.id = x.player_id
 where x.source = 'event_attendance' and x.created_at > now() - interval '24 hours' order by x.created_at;

-- W3. Round wins and wrap-up results: each saved result must equal the ledger rows and point rows written for it.
--     HEALTHY: every row says 'ok'. (35 XP attendance is separate; wins are +5 XP each, +5 points each x the pass multiplier.)
select e.name as event, (p.player_id || ' ' || p.display_name) as player, er.rounds_won, er.xp_awarded as saved_xp,
       coalesce((select sum(l.final_xp) from xp_ledger l where l.event_id = er.event_id and l.player_id = er.player_id and l.source in ('match_win','undefeated_bonus','community_contribution','manual_adjustment')), 0) as ledger_xp,
       er.prize_points_awarded as saved_points,
       coalesce((select sum(t.amount) from prize_point_transactions t where t.reference_id = er.event_id and t.player_id = er.player_id and t.source = 'event_wrapup'), 0) as points_rows,
       case when er.xp_awarded = coalesce((select sum(l.final_xp) from xp_ledger l where l.event_id = er.event_id and l.player_id = er.player_id and l.source in ('match_win','undefeated_bonus','community_contribution','manual_adjustment')), 0)
             and er.prize_points_awarded = coalesce((select sum(t.amount) from prize_point_transactions t where t.reference_id = er.event_id and t.player_id = er.player_id and t.source = 'event_wrapup'), 0)
            then 'ok' else 'MISMATCH: investigate' end as check
  from event_results er join events e on e.id = er.event_id join players p on p.id = er.player_id
 where er.created_at > now() - interval '24 hours' or er.updated_at > now() - interval '24 hours' order by e.name;

-- W4. Referral rewards: a new player's FIRST event pays the referrer +50 XP and +10 points, once.
--     HEALTHY: the two counts match, and no player appears twice.
select (select count(*) from players where referral_bonus_paid) as players_marked_paid,
       (select count(*) from xp_ledger where source = 'referral') as referral_xp_rows,
       (select count(*) from prize_point_transactions where source = 'referral_bonus') as referral_points_rows;

-- W5. Card of the Day: a won vote marked paid must have its XP row. HEALTHY: no rows.
select v.id as vote_id, (p.player_id || ' ' || p.display_name) as player, v.vote_date
  from card_of_the_day_votes v join players p on p.id = v.player_id
 where v.xp_awarded and not exists (select 1 from xp_ledger l where l.player_id = v.player_id and l.source = 'community_contribution' and l.description like 'COTD Vote Winner:%(' || v.vote_date::text || ')');

-- W6. Players verified by a staff check-in (not a join code) should also get Founding Member (+100 XP) while the cap is open.
--     HEALTHY: no rows, or only players who already had the title.
select (p.player_id || ' ' || p.display_name) as player, to_char(p.home_store_verified_at at time zone 'America/Los_Angeles','Mon DD HH24:MI') as verified_pt
  from players p where p.home_store_verified_at > now() - interval '24 hours'
   and not exists (select 1 from player_titles t where t.player_id = p.id and t.title_key = 'founding_member' and t.revoked_at is null);

-- W7. Paid passes: all players are on the free tier today, so the 1.5x / 2x multipliers have never run in production.
--     HEALTHY: no rows until a pass is deliberately assigned; if there are rows, check their next check-in's points by hand.
select (player_id || ' ' || display_name) as player, pass_tier, pass_status, pass_expires_at from players where pass_tier <> 'none' or pass_status in ('active','cancel_scheduled');

-- W8. Everything written to the ledger in the last 24 hours, by source. Skim for sources you do not expect.
select source, count(*) as rows, sum(final_xp) as xp from xp_ledger where created_at > now() - interval '24 hours' group by source order by source;

-- ===== Founding Member watch (network-wide pool of 100, any store) =====

-- W9. Slot count. Account deletion removes the title row but only ANONYMISES the ledger (player_id becomes NULL), so a deleted holder's
--     +100 bonus row survives and is counted here. Lifetime allocations = title rows (active or revoked) + bonus rows of deleted accounts.
--     It is exact unless a bonus write failed for a holder who was later deleted (then it is a lower bound).
--     HEALTHY: active_holders <= 100 and lifetime_allocations <= 100.
select (select count(*) from player_titles where title_key = 'founding_member' and revoked_at is null) as active_holders,
       (select count(*) from player_titles where title_key = 'founding_member' and revoked_at is not null) as revoked_rows,
       (select count(*) from xp_ledger where description = 'Founding Member title bonus' and player_id is null) as deleted_holder_bonus_rows,
       (select count(*) from player_titles where title_key = 'founding_member')
         + (select count(*) from xp_ledger where description = 'Founding Member title bonus' and player_id is null) as lifetime_allocations,
       100 - ((select count(*) from player_titles where title_key = 'founding_member')
         + (select count(*) from xp_ledger where description = 'Founding Member title bonus' and player_id is null)) as slots_remaining_at_most,
       (to_regclass('public.founding_slots') is not null) as permanent_slot_table_exists;

-- W10. PARTIAL AWARD: title and flag disagree (players.is_founding_member vs an active title). HEALTHY: no rows.
--      Rows touched in the last 5 minutes are skipped: a grant writes the title first and the flag a moment later.
select p.player_id, p.display_name, p.is_founding_member as flag,
       exists (select 1 from player_titles t where t.player_id = p.id and t.title_key = 'founding_member' and t.revoked_at is null) as has_active_title
  from players p
 where p.is_founding_member <> exists (select 1 from player_titles t where t.player_id = p.id and t.title_key = 'founding_member' and t.revoked_at is null)
   and not exists (select 1 from player_titles t where t.player_id = p.id and t.title_key = 'founding_member'
                    and (t.granted_at > now() - interval '5 minutes' or t.revoked_at > now() - interval '5 minutes'));

-- W11. PARTIAL AWARD: the +100 bonus. Every title row needs exactly one correct bonus row (100 XP, source achievement); a bonus row of a LIVE
--      account with no title row is wrong; a bonus row with the wrong amount or source is wrong. HEALTHY: no rows. (Bonus rows of DELETED
--      accounts have player_id NULL by design and are counted in W9, not here.) Titles granted in the last 5 minutes are skipped.
select 'holder without exactly one correct bonus' as problem, p.player_id, count(x.id) as bonus_rows
  from player_titles t join players p on p.id = t.player_id
  left join xp_ledger x on x.player_id = t.player_id and x.description = 'Founding Member title bonus' and x.final_xp = 100 and x.source = 'achievement'
 where t.title_key = 'founding_member' and t.granted_at < now() - interval '5 minutes'
 group by p.player_id having count(x.id) <> 1
union all
select 'bonus row with wrong amount or source', coalesce(p.player_id, 'DELETED ACCOUNT'), count(*)
  from xp_ledger x left join players p on p.id = x.player_id
 where x.description = 'Founding Member title bonus' and (x.final_xp <> 100 or x.source <> 'achievement')
 group by coalesce(p.player_id, 'DELETED ACCOUNT')
union all
select 'bonus for a live account with no title row', p.player_id, count(*)
  from xp_ledger x join players p on p.id = x.player_id
 where x.description = 'Founding Member title bonus'
   and not exists (select 1 from player_titles t where t.player_id = x.player_id and t.title_key = 'founding_member')
 group by p.player_id;

-- W12. Evidence the 100 limit was bypassed or reopened. HEALTHY: no rows (the nine automatic awards have none of these).
--      manual grant = granted_by is set; revoked row = that slot may have been reused; settings row = the cap or auto-award was edited in HQ.
select 'manual grant (granted_by set)' as evidence, p.player_id, t.granted_at::text as detail
  from player_titles t join players p on p.id = t.player_id where t.title_key = 'founding_member' and t.granted_by is not null
union all
select 'revoked holder (their slot may have been reused)', p.player_id, t.revoked_at::text
  from player_titles t join players p on p.id = t.player_id where t.title_key = 'founding_member' and t.revoked_at is not null
union all
select 'more than 100 title rows', null, (select count(*) from player_titles where title_key = 'founding_member')::text
 where (select count(*) from player_titles where title_key = 'founding_member') > 100
union all
select 'HQ title settings changed (cap not 100, or auto-award off)', null, title_settings::text
  from store_config where id = 1 and title_settings is not null
   and ((title_settings ->> 'foundingCap') is distinct from '100' or (title_settings ->> 'autoFounding') = 'false');

-- W13. Active holder who does not meet the requirement (a verified home store at any network store). HEALTHY: no rows.
select p.player_id, p.display_name, (p.home_store_id is null) as no_home_store, (p.home_store_verified_at is null) as not_verified
  from player_titles t join players p on p.id = t.player_id
 where t.title_key = 'founding_member' and t.revoked_at is null and (p.home_store_id is null or p.home_store_verified_at is null);

-- W15. PARTIAL AWARD, low severity: an active holder awarded after the one-time backfill has no "New title" notification (the notification is
--      best effort and never blocks the award). Awards before 2026-11-08 12:00 UTC came from the backfill and sent none. HEALTHY: no rows.
select p.player_id, p.display_name, t.granted_at::text as granted_at
  from player_titles t join players p on p.id = t.player_id
 where t.title_key = 'founding_member' and t.revoked_at is null
   and t.granted_at >= '2026-11-08 12:00:00+00' and t.granted_at < now() - interval '5 minutes'
   and not exists (select 1 from notifications n where n.player_id = t.player_id and n.type = 'title' and n.data ->> 'title_key' = 'founding_member');

-- W14. INFORMATIONAL: verified players with no Founding Member title while slots remain. Today: the two accounts verified before the
--      title system existed. If one of them re-verifies a home store with a join code, the automatic award will give them a slot (+100 XP).
--      This does NOT prove an award failed: a failed award (nothing written) also shows here, as does any intentionally excluded account.
select p.player_id, p.display_name, to_char(p.home_store_verified_at at time zone 'America/Los_Angeles', 'Mon DD HH24:MI') as verified_pt
  from players p
 where p.home_store_verified_at is not null
   and not exists (select 1 from player_titles t where t.player_id = p.id and t.title_key = 'founding_member');
