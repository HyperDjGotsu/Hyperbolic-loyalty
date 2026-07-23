-- Fix store data:
-- 1. Remove shell store (Gamer's Guild of Pittsburg, HYP prefix, 0 players) — not part of active network
-- 2. Fix Benicia prefix GOB2 → GGOB (conflicted with Brentwood's GOB)
DELETE FROM stores WHERE id = 'cc477a71-38a3-4ea9-913e-76a7ff87cf69';

UPDATE stores
SET player_id_prefix = 'GGOB'
WHERE id = '70f71af5-26f1-46ec-b97a-8c8776318d3d';
