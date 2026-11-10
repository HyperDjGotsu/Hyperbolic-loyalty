-- Printable check-in requests watch list. SELECT ONLY: safe to run any time, changes nothing.
-- Run during and after the first events with the feature on. Each says what a healthy result looks like.

-- R1. Requests by status for events in the last 24 hours. HEALTHY: mostly approved; few or no needs_review.
select e.name as event, r.status, count(*) as n
  from checkin_requests r join events e on e.id = r.event_id
 where r.requested_at > now() - interval '24 hours'
 group by 1, 2 order by 1, 2;

-- R2. Needs a person: needs_review, or an approval that has been running too long. HEALTHY: no rows.
select r.id, e.name as event, (p.player_id || ' ' || p.display_name) as player, r.status, r.last_error,
       to_char(r.updated_at at time zone 'America/Los_Angeles', 'Mon DD HH24:MI') as since_pt
  from checkin_requests r join events e on e.id = r.event_id join players p on p.id = r.player_id
 where r.status = 'needs_review' or (r.status = 'approving' and r.updated_at < now() - interval '2 minutes')
 order by r.updated_at;

-- R3. Approved requests whose award is NOT complete in the records (attendance + XP + points as expected). HEALTHY: no rows.
select r.id, e.name as event, (p.player_id || ' ' || p.display_name) as player, r.resolution,
       public.checkin_award_evidence(r.event_id, r.player_id) as evidence
  from checkin_requests r join events e on e.id = r.event_id join players p on p.id = r.player_id
 where r.status = 'approved'
   and not (
     (public.checkin_award_evidence(r.event_id, r.player_id) ->> 'attendance_rows')::int = 1
     and (public.checkin_award_evidence(r.event_id, r.player_id) ->> 'xp_rows')::int = 1
     and (public.checkin_award_evidence(r.event_id, r.player_id) ->> 'points_rows')::int =
         case when (public.checkin_award_evidence(r.event_id, r.player_id) ->> 'points_expected')::boolean then 1 else 0 end);

-- R4. Reopened requests (audit). Informational.
select e.name as event, (p.player_id || ' ' || p.display_name) as player, r.status, r.reopened_count, r.resolution
  from checkin_requests r join events e on e.id = r.event_id join players p on p.id = r.player_id
 where r.reopened_count > 0 order by r.updated_at desc limit 50;

-- R5. Open requests on events that are no longer active (should be none after the first list refresh or request). HEALTHY: no rows.
select r.id, e.name as event, e.status::text as event_status, r.status
  from checkin_requests r join events e on e.id = r.event_id
 where r.status = 'pending' and e.status::text <> 'active';
