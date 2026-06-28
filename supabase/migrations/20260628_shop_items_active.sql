-- Add active flag to shop_items so staff can deactivate items
-- without deleting them (preserves existing player inventory references)
alter table shop_items
  add column if not exists active boolean not null default true;

-- Existing items should all be active
update shop_items set active = true where active is null;
