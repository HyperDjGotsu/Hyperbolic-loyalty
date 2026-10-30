# Game cover art

One image per game, used as the cover on event cards, Home, and the Events rows.

## File format
- 1600 x 1000 px (16:10), JPG, under 300 KB
- File name = game id, lowercase: `pokemon.jpg`, `one_piece.jpg`, `mtg.jpg`, ... (ids below)
- No text, game logos, watermarks or store logos baked into the default image. The app adds the event name.
- `general.jpg` is the fallback for network events and games without art.

## Where things go (the same image is cropped to several shapes)
- **Subject safe zone:** keep the main subject inside the middle 1000 px of the width and between 150 px and 650 px from the top. That stays visible in every shape.
- Wide cards crop about 150 px off the top and bottom. Small square pictures (about 60 px) crop everything outside the middle 1000 px.
- The bottom third has the title over a dark gradient: keep it calm, low detail.
- Bold and simple reads best at 60 px. Dark to mid tones work best under white text.

## Store versions
A store can have its own art (for example, with its logo). Put it in a folder named for the store, same file name:
`public/games/ggob/one_piece.jpg` (Gamer's Guild of Benicia).
A store only gets its own art once it is added to `STORE_ART_FOLDERS` in `lib/games.ts`. For a store with a folder, the app tries its version first, then the default, then a gradient in the game's color.

## Ids
general, one_piece, pokemon, mtg, gundam, star_wars_unlimited, vanguard, lorcana, uvs, digimon,
yugioh, riftbound, hololive, weiss, sw_legion, union_arena, warhammer, azuki, blood_bowl, bolt_action
