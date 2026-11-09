-- Event-night summary. SELECT ONLY: safe to run any time, changes nothing. Run after every Benicia event night.
-- One row per event that had a check-in in the window. Change the window by editing "since".
-- Healthy row: attendances = xp_rows = points_rows (for a store event), mismatch = 'ok', xp_total = 35 x check-ins + 5 x wins.
-- Anything not 'ok' is a problem: stop opening stores and follow docs/checkin-reconciliation-runbook.md.

with params as (select now() - interval '18 hours' as since),
att as (
  select a.event_id, count(*) as attendances
    from event_attendances a, params p where a.checked_in_at >= p.since group by a.event_id
),
xp as (
  select x.event_id, count(*) as xp_rows, coalesce(sum(x.final_xp),0) as xp_total,
         count(*) filter (where x.awarded_by is null) as self_checkins,
         count(*) filter (where x.awarded_by is not null) as staff_checkins
    from xp_ledger x, params p where x.source = 'event_attendance' and x.event_id is not null and x.created_at >= p.since group by x.event_id
),
pts as (
  select t.reference_id as event_id, count(*) as points_rows, coalesce(sum(t.amount),0) as points_total
    from prize_point_transactions t, params p where t.source = 'event_checkin' and t.type = 'earn' and t.reference_id is not null and t.created_at >= p.since group by t.reference_id
)
select e.name as event, s.name as store, e.status,
       att.attendances, coalesce(xp.xp_rows,0) as xp_rows, coalesce(pts.points_rows,0) as points_rows,
       coalesce(xp.xp_total,0) as xp_total, coalesce(pts.points_total,0) as points_total,
       coalesce(xp.self_checkins,0) as self_checkins, coalesce(xp.staff_checkins,0) as staff_checkins,
       case when att.attendances = coalesce(xp.xp_rows,0) and att.attendances = coalesce(pts.points_rows,0) then 'ok'
            else 'MISMATCH: investigate' end as mismatch,
       e.id as event_id
  from att
  join events e on e.id = att.event_id
  join stores s on s.id = e.store_id
  left join xp  on xp.event_id  = att.event_id
  left join pts on pts.event_id = att.event_id
 order by e.name;
