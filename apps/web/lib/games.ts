export interface GameDefinition {
  id: string;
  name: string;
  icon: string;
  currency: string;
  color: string;
}

// All player-selectable games. Adding a new game: add one entry here.
// "general" / Guild Points is intentionally absent — it is a system ledger
// category, not a player-selectable game.
export const SELECTABLE_GAMES: GameDefinition[] = [
  { id: 'one_piece',           name: 'One Piece',           icon: '🏴‍☠️', currency: 'Berries',        color: '#E63946' },
  { id: 'pokemon',             name: 'Pokémon',             icon: '⚡',   currency: 'Pokepoints',     color: '#FACC15' },
  { id: 'mtg',                 name: 'Magic: The Gathering',icon: '✨',   currency: 'Mana Marks',     color: '#8B5CF6' },
  { id: 'gundam',              name: 'Gundam',              icon: '🤖',   currency: 'Pilot Points',   color: '#3B82F6' },
  { id: 'star_wars_unlimited', name: 'Star Wars Unlimited', icon: '🌟',   currency: 'Holopoints',     color: '#00d4ff' },
  { id: 'vanguard',            name: 'Vanguard',            icon: '⚔️',   currency: 'Ride Gauge',     color: '#ef4444' },
  { id: 'lorcana',             name: 'Lorcana',             icon: '🪄',   currency: 'Lorepoints',     color: '#EC4899' },
  { id: 'uvs',                 name: 'UVS',                 icon: '👊',   currency: 'Versus Tokens',  color: '#f97316' },
  { id: 'digimon',             name: 'Digimon',             icon: '🦖',   currency: 'Digi-Points',    color: '#f59e0b' },
  { id: 'yugioh',              name: 'Yu-Gi-Oh!',           icon: '⭐',   currency: 'Star Chips',     color: '#9333ea' },
  { id: 'riftbound',           name: 'Riftbound',           icon: '🌀',   currency: 'Essence',        color: '#22c55e' },
  { id: 'hololive',            name: 'Hololive',            icon: '🎤',   currency: 'Fan Subs',       color: '#ff69b4' },
  { id: 'weiss',               name: 'Weiss Schwarz',       icon: '🎴',   currency: 'Climax Points',  color: '#6366f1' },
  { id: 'sw_legion',           name: 'SW Legion',           icon: '🎖️',   currency: 'Battle Orders',  color: '#059669' },
  { id: 'union_arena',         name: 'Union Arena',         icon: '🏟️',   currency: 'Plot Armor',     color: '#14b8a6' },
  { id: 'warhammer',           name: 'Warhammer',           icon: '💀',   currency: 'War Honors',     color: '#dc2626' },
  { id: 'azuki',               name: 'Azuki',               icon: '⛩️',   currency: 'Azuki Points',   color: '#c084fc' },
  { id: 'blood_bowl',          name: 'Blood Bowl',          icon: '🏈',   currency: 'TD Points',      color: '#b45309' },
  { id: 'bolt_action',         name: 'Bolt Action',         icon: '🎯',   currency: 'Command Points', color: '#475569' },
];

export const SELECTABLE_GAME_IDS: string[] = SELECTABLE_GAMES.map(g => g.id);

// All valid game IDs for XP ledger queries (includes overall for leaderboards)
export const ALL_VALID_GAME_IDS: string[] = ['overall', ...SELECTABLE_GAME_IDS];

// Legacy aliases — stored in some existing records; map to canonical IDs
export const GAME_ID_ALIASES: Record<string, string> = {
  star_wars: 'star_wars_unlimited',
  sw_unlimited: 'star_wars_unlimited',
  weiss_schwarz: 'weiss',
};

export const GAME_CURRENCIES: Record<string, string> = Object.fromEntries(
  SELECTABLE_GAMES.map(g => [g.id, g.currency])
);

// Resolve a potentially-aliased game ID to the canonical one
export function resolveGameId(id: string): string {
  return GAME_ID_ALIASES[id] ?? id;
}

export function getGame(id: string): GameDefinition | undefined {
  return SELECTABLE_GAMES.find(g => g.id === resolveGameId(id));
}

// Default cover art for a game: /public/games/<canonical id>.jpg (see public/games/README.md).
// 'general' is the fallback for network or untagged events.
export function gameArtUrl(id?: string | null): string {
  return `/games/${id ? resolveGameId(id) : 'general'}.jpg`;
}

// Stores with their own cover art keep it in /public/games/<folder>/<game id>.jpg.
// A store not listed here, or a game it has no version of, uses the default art above.
const STORE_ART_FOLDERS: Record<string, string> = {
  '70f71af5-26f1-46ec-b97a-8c8776318d3d': 'ggob', // Gamer's Guild of Benicia
};

// Art to try, best first: the store's own version, then the default. Callers fall back to a gradient after the last.
export function gameArtCandidates(id?: string | null, storeId?: string | null): string[] {
  const game = id ? resolveGameId(id) : 'general';
  const folder = storeId ? STORE_ART_FOLDERS[storeId] : undefined;
  return folder ? [`/games/${folder}/${game}.jpg`, `/games/${game}.jpg`] : [`/games/${game}.jpg`];
}

// players.hero_backdrop: 'game:<id>' or 'upload:<https url>'. Uploads only render on the (private) Home hero.
export function parseBackdrop(value: string | null | undefined): { gameId?: string; uploadUrl?: string } {
  if (!value) return {};
  if (value.startsWith('game:')) return { gameId: value.slice(5) };
  if (value.startsWith('upload:')) return { uploadUrl: value.slice(7) };
  return {};
}
