-- Diamond members' monthly $15 Event Credit. One row = one use; the unique key allows one per player per Pacific calendar month.
-- Rows are written by the server only (service role). Players can read their own.
create table if not exists event_credit_redemptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  store_id uuid references stores(id),
  month_key date not null,
  amount_cents integer not null default 1500,
  pass_tier text not null,
  redeemed_at timestamptz not null default now(),
  unique (player_id, month_key)
);

comment on column event_credit_redemptions.month_key is 'First day of the America/Los_Angeles calendar month the credit was used for.';

alter table event_credit_redemptions enable row level security;

create policy "Players can read their own event credits"
  on event_credit_redemptions for select to authenticated
  using (player_id in (select id from players where clerk_user_id = (auth.uid())::text));
