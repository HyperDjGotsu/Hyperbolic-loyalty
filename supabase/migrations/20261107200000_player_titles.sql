-- Titles players can hold (Founding Member, Beta Tester, ...). Definitions (label, colour, XP bonus) live in code;
-- this table only records who holds which title. Service role only, like the other player tables.
create table public.player_titles (
  player_id uuid not null references public.players(id) on delete cascade,
  title_key text not null check (title_key ~ '^[a-z_]{3,40}$'),
  granted_at timestamptz not null default now(),
  granted_by uuid references public.app_users(id) on delete set null,
  primary key (player_id, title_key)
);
create index player_titles_title_key_idx on public.player_titles (title_key);
alter table public.player_titles enable row level security;
revoke all on public.player_titles from anon, authenticated;

-- Network-admin settings for automatic Founding Member awards: {"autoFounding": true, "foundingCap": 100}. Null = defaults.
alter table public.store_config add column if not exists title_settings jsonb;
