'use client';

import { useState } from 'react';
import { getGame, resolveGameId } from '@/lib/games';

// Icon art lives in /public/game-icons/<game id>.png (512px, transparent).
// Games with single-colour art need a version per theme: <id>_ondark.png (white art, dark theme)
// and <id>_onlight.png (black art, light theme). Games not listed in either set show their emoji.
const ICON_IDS = new Set([
  'one_piece', 'pokemon', 'mtg', 'gundam', 'star_wars_unlimited', 'vanguard', 'lorcana', 'uvs',
  'digimon', 'dbfw', 'dbs', 'yugioh', 'riftbound', 'hololive', 'weiss', 'sw_legion', 'union_arena',
  'azuki',
]);
const THEMED_ICON_IDS = new Set(['warhammer', 'bolt_action']);

interface GameIconProps {
  id?: string | null;
  /** Emoji shown when a game has no art yet, or the image fails to load. Defaults to the game's own emoji. */
  fallback?: string;
  /** Square size in px. */
  size?: number;
  className?: string;
}

export default function GameIcon({ id, fallback, size = 20, className = '' }: GameIconProps) {
  const [failed, setFailed] = useState(false);
  const gameId = id ? resolveGameId(id) : '';
  const emoji = fallback ?? (gameId ? getGame(gameId)?.icon : undefined) ?? '🎮';

  const themed = THEMED_ICON_IDS.has(gameId);
  if (failed || !(themed || ICON_IDS.has(gameId))) {
    return <span className={className} aria-hidden="true">{emoji}</span>;
  }

  const base = `inline-block flex-none object-contain align-middle ${className}`;
  const dim = { width: size, height: size };
  if (themed) {
    return (
      <>
        <img src={`/game-icons/${gameId}_ondark.png`} alt="" aria-hidden="true" width={size} height={size} style={dim}
          className={`${base} gi-on-dark`} onError={() => setFailed(true)} />
        <img src={`/game-icons/${gameId}_onlight.png`} alt="" aria-hidden="true" width={size} height={size} style={dim}
          className={`${base} gi-on-light`} onError={() => setFailed(true)} />
      </>
    );
  }
  return (
    <img src={`/game-icons/${gameId}.png`} alt="" aria-hidden="true" width={size} height={size} style={dim}
      className={base} loading="lazy" onError={() => setFailed(true)} />
  );
}
