-- Fix store data: rename legacy HYP store to Gamer's Guild of Antioch, fix Benicia prefix conflict
-- cc477a71: was "Gamer's Guild of Pittsburg" with null city and legacy HYP prefix (0 players assigned)
-- 70f71af5: Benicia prefix GOB2 conflicted with Brentwood's GOB
UPDATE stores
SET name = 'Gamer''s Guild of Antioch', city = 'Antioch', state = 'CA', player_id_prefix = 'GGOA'
WHERE id = 'cc477a71-38a3-4ea9-913e-76a7ff87cf69';

UPDATE stores
SET player_id_prefix = 'GGOB'
WHERE id = '70f71af5-26f1-46ec-b97a-8c8776318d3d';
