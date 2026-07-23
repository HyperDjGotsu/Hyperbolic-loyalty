-- Phase 7: store_id on notifications
-- store_id = null  → network-wide notification (sent to all players)
-- store_id = <uuid> → store-scoped notification (sent to that store's players)
alter table notifications
  add column if not exists store_id uuid references stores(id);

-- Phase 7: broadcasts audit table
-- One row per send action (not per player).
-- scope = 'store'   → sent to one store's players (store_id required)
-- scope = 'network' → sent to all players across all stores (store_id null)
create table if not exists broadcasts (
  id                 uuid        primary key default gen_random_uuid(),
  store_id           uuid        references stores(id),
  scope              text        not null check (scope in ('store', 'network')),
  title              text        not null,
  message            text        not null,
  notification_type  text        not null default 'store_announcement',
  sent_by_clerk_id   text        not null,
  player_count       integer     not null default 0,
  created_at         timestamptz not null default now()
);

-- Index for HQ history queries
create index if not exists broadcasts_store_id_created_at
  on broadcasts (store_id, created_at desc);

create index if not exists broadcasts_created_at
  on broadcasts (created_at desc);
