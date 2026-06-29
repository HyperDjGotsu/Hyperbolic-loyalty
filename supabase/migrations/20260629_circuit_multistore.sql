-- ── Organizations (company-level, e.g. Gamers Guild Corp) ────────────────────
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  invite_code text unique not null,
  created_at  timestamptz default now()
);

-- ── Stores (belong to an org, replaces single store_config for multi-store) ──
create table if not exists stores (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references organizations(id) on delete set null,
  name             text not null,
  city             text,
  state            text,
  player_id_prefix text not null default 'HYP',
  color            text default '#c4b5fd',
  is_active        boolean default true,
  created_at       timestamptz default now(),
  unique (org_id, player_id_prefix)
);

-- ── Extend events for multi-store and circuit ─────────────────────────────────
alter table events
  add column if not exists store_id    uuid references stores(id) on delete set null,
  add column if not exists event_type  text not null default 'regular'
    check (event_type in ('regular', 'circuit_qualifier', 'championship'));

-- ── Circuit qualifiers — who earned a spot at the championship ────────────────
create table if not exists circuit_qualifiers (
  id                    uuid primary key default gen_random_uuid(),
  qualifier_event_id    uuid not null references events(id) on delete cascade,
  championship_event_id uuid references events(id) on delete set null,
  store_id              uuid references stores(id) on delete set null,
  player_id             uuid not null references players(id) on delete cascade,
  placement             integer not null,  -- 1 = 1st place, 2 = 2nd, etc.
  has_bye               boolean default true,
  qualified_at          timestamptz default now(),
  unique (qualifier_event_id, player_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table organizations      enable row level security;
alter table stores             enable row level security;
alter table circuit_qualifiers enable row level security;

create policy "orgs_public_read"       on organizations      for select using (true);
create policy "stores_public_read"     on stores             for select using (true);
create policy "qualifiers_public_read" on circuit_qualifiers for select using (true);

-- ── Seed: Gamers Guild Corp + 5 stores ───────────────────────────────────────
insert into organizations (name, slug, invite_code)
values ('Gamers Guild Corp', 'ggc', 'GGC-2026')
on conflict (slug) do nothing;

insert into stores (org_id, name, city, state, player_id_prefix, color)
select
  o.id,
  s.name, s.city, s.state, s.prefix, s.color
from organizations o
cross join (values
  ('Trade Emporium',        'Pittsburg',    'CA', 'TEM', '#c4b5fd'),
  ('Games of Martinez',     'Martinez',     'CA', 'GOM', '#60a5fa'),
  ('Games of Antioch',      'Antioch',      'CA', 'GOA', '#34d399'),
  ('Games of Walnut Creek', 'Walnut Creek', 'CA', 'GWC', '#fb923c'),
  ('Games of Concord',      'Concord',      'CA', 'GOC', '#f472b6')
) as s(name, city, state, prefix, color)
where o.slug = 'ggc'
on conflict (org_id, player_id_prefix) do nothing;
