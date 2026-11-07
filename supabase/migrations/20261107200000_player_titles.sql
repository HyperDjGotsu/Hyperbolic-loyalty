-- Titles players can hold (Founding Member, Beta Tester, ...). Definitions (label, colour, XP bonus) live in code;
-- this table only records who holds which title. Service role only, like the other player tables.
-- A removed title keeps its row with revoked_at set, so automatic awards can never quietly give it back
-- and the one-time XP bonus can never be paid twice.
create table public.player_titles (
  player_id uuid not null references public.players(id) on delete cascade,
  title_key text not null check (title_key ~ '^[a-z_]{3,40}$'),
  granted_at timestamptz not null default now(),
  granted_by uuid references public.app_users(id) on delete set null,
  revoked_at timestamptz,
  primary key (player_id, title_key)
);
create index player_titles_title_key_idx on public.player_titles (title_key);
alter table public.player_titles enable row level security;
revoke all on public.player_titles from anon, authenticated;

-- Network-admin settings for automatic Founding Member awards: {"autoFounding": true, "foundingCap": 100}. Null = defaults.
alter table public.store_config add column if not exists title_settings jsonb;

-- Automatic award with a cap, done atomically: the lock makes the count and the insert one step, so two players
-- verified at the same moment cannot both slip past the limit. Returns true only if a new row was inserted.
create or replace function public.award_title_capped(p_player uuid, p_title text, p_cap integer, p_by uuid default null)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  inserted integer;
begin
  perform pg_advisory_xact_lock(hashtext('award_title_capped:' || p_title));
  if (select count(*) from public.player_titles where title_key = p_title and revoked_at is null) >= p_cap then
    return false;
  end if;
  insert into public.player_titles (player_id, title_key, granted_by)
  values (p_player, p_title, p_by)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted > 0;
end;
$$;
revoke all on function public.award_title_capped(uuid, text, integer, uuid) from public, anon, authenticated;
