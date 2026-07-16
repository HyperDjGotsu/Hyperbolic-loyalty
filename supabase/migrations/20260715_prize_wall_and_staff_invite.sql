-- Prize wall items (physical goods - replaces cosmetics shop)
create table if not exists prize_wall_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  xp_cost integer not null,
  retail_value decimal(10,2),
  quantity integer,
  store_id uuid references stores(id) on delete set null,
  unlock_threshold integer,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Redemption queue
create table if not exists prize_wall_redemptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  item_id uuid not null references prize_wall_items(id) on delete restrict,
  item_name text not null,
  prize_points_spent integer not null,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  redeemed_at timestamptz default now(),
  fulfilled_at timestamptz,
  fulfilled_by uuid references players(id) on delete set null,
  notes text
);

alter table prize_wall_items enable row level security;
alter table prize_wall_redemptions enable row level security;

create policy "prize_wall_items_public_read" on prize_wall_items for select using (true);
create policy "prize_wall_redemptions_self_read" on prize_wall_redemptions
  for select using (
    auth.uid()::text = (select clerk_user_id from players where id = player_id)
  );

-- Staff invite code on store_config
alter table store_config
  add column if not exists staff_invite_code text;

-- Background image on banners
alter table banners
  add column if not exists background_image text;

-- Wipe legacy cosmetics shop
delete from player_inventory;
delete from shop_items;
