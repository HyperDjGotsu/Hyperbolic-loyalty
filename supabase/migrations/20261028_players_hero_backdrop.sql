-- Player's chosen hero backdrop: 'game:<game_id>' (curated art) or 'upload:<public url>' (Home hero only). Null = first favorite game.
alter table players add column if not exists hero_backdrop text;
