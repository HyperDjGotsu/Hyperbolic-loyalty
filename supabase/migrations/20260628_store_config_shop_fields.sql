alter table store_config
  add column if not exists shop_title text not null default 'Prize Wall',
  add column if not exists shop_description text not null default 'avatar cosmetics',
  add column if not exists shop_categories jsonb not null default '[{"id":"base","name":"Base","icon":"😎","enabled":true},{"id":"background","name":"Background","icon":"🎨","enabled":true},{"id":"frame","name":"Frame","icon":"✨","enabled":true},{"id":"badge","name":"Badge","icon":"🏷️","enabled":true},{"id":"title","name":"Title","icon":"📛","enabled":true}]';

update store_config set
  shop_title = 'Prize Wall',
  shop_description = 'avatar cosmetics',
  shop_categories = '[{"id":"base","name":"Base","icon":"😎","enabled":true},{"id":"background","name":"Background","icon":"🎨","enabled":true},{"id":"frame","name":"Frame","icon":"✨","enabled":true},{"id":"badge","name":"Badge","icon":"🏷️","enabled":true},{"id":"title","name":"Title","icon":"📛","enabled":true}]'
where id = 1 and shop_title = 'Prize Wall' and shop_categories = '[]'::jsonb;
