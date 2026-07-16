create table prize_point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  store_id uuid not null references stores(id),
  amount integer not null,
  type text not null check (type in ('earn', 'spend', 'refund', 'admin_adjust')),
  source text not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index prize_point_transactions_user_store_idx
  on prize_point_transactions (user_id, store_id);

create index prize_point_transactions_store_created_at_idx
  on prize_point_transactions (store_id, created_at desc);

alter table prize_point_transactions enable row level security;

create policy "Users can read their own prize point transactions"
  on prize_point_transactions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Staff can read prize point transactions for managed stores"
  on prize_point_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from players
      where players.clerk_user_id = auth.uid()::text
        and players.is_staff = true
    )
  );

create or replace function get_user_point_balance(p_user_id uuid, p_store_id uuid)
returns integer
language sql
security definer
stable
as $$
  select coalesce(sum(amount), 0)::integer
  from prize_point_transactions
  where user_id = p_user_id
    and store_id = p_store_id;
$$;

