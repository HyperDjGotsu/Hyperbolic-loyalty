-- Optional per-event cover image. When null the app shows the game's default art (/public/games/<game_id>.jpg).
alter table events add column if not exists image_url text;
