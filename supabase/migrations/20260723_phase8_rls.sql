-- Phase 8: RLS on notifications
-- Players can read only their own notifications via authenticated role.
-- All writes go through service_role (API routes use supabaseAdmin) only.
alter table notifications enable row level security;

create policy "Players read own notifications"
  on notifications for select
  to authenticated
  using (
    player_id = (
      select id from players where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Phase 8: RLS on broadcasts
-- Broadcasts are HQ-only. All reads and writes go through service_role.
-- Authenticated users have no direct access (deny by default when RLS is on).
alter table broadcasts enable row level security;
