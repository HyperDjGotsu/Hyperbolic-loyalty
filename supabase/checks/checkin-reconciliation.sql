-- Check-in reconciliation. SELECT ONLY: safe to run any time, changes nothing.
-- Zero rows = every check-in has exactly one attendance row, one XP row and (for store events) one Prize Point row.
-- Each returned row is one problem. Find the matching CHECKIN_NEEDS_REVIEW log line (event= and player= ids) for context.
--
-- Problems:
--   attendance_without_xp      attendance exists, no attendance XP row            -> player was checked in but not paid XP
--   attendance_without_points  attendance exists at a STORE event, no point row   -> player was not paid Prize Points
--   orphaned_xp                attendance XP row with no attendance row           -> XP without a check-in (a retry could pay again)
--   orphaned_points            check-in point row with no attendance row          -> points without a check-in (a retry could pay again)
--   duplicate_xp               more than one attendance XP row for one check-in   -> paid twice
--   duplicate_points           more than one check-in point row for one check-in  -> paid twice
-- Not checked: attendance at a store-less (network) event, because those points follow the player's home store.
-- Staff "operational" awards are ignored (they carry no event id).

with
a  as (select event_id, player_id from public.event_attendances where player_id is not null),
x  as (select event_id, player_id, count(*) as n from public.xp_ledger
        where source = 'event_attendance' and event_id is not null group by event_id, player_id),
p  as (select reference_id as event_id, player_id, count(*) as n from public.prize_point_transactions
        where source = 'event_checkin' and type = 'earn' and reference_id is not null group by reference_id, player_id),
ev as (select id, store_id from public.events)

select 'attendance_without_xp' as problem, a.event_id, a.player_id, 0::bigint as n
  from a left join x on x.event_id = a.event_id and x.player_id = a.player_id
 where x.event_id is null
union all
select 'attendance_without_points', a.event_id, a.player_id, 0
  from a join ev on ev.id = a.event_id
  left join p on p.event_id = a.event_id and p.player_id = a.player_id
 where ev.store_id is not null and p.event_id is null
union all
select 'orphaned_xp', x.event_id, x.player_id, x.n
  from x left join a on a.event_id = x.event_id and a.player_id = x.player_id
 where a.event_id is null
union all
select 'orphaned_points', p.event_id, p.player_id, p.n
  from p left join a on a.event_id = p.event_id and a.player_id = p.player_id
 where a.event_id is null
union all
select 'duplicate_xp', x.event_id, x.player_id, x.n from x where x.n > 1
union all
select 'duplicate_points', p.event_id, p.player_id, p.n from p where p.n > 1
order by problem, event_id, player_id;
