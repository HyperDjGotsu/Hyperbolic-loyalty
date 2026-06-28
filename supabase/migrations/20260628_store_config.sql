-- Store-level configuration for white-label SaaS
create table if not exists store_config (
  id integer primary key default 1,
  currency_name text not null default 'Points',
  currency_icon text not null default '⭐',
  store_name text not null default 'Hyperbolic XP',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed the single config row if not already there
insert into store_config (id, currency_name, currency_icon, store_name)
values (1, 'Points', '⭐', 'Hyperbolic XP')
on conflict (id) do nothing;
