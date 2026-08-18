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

// Legacy aliases — stored in some existing records
export const GAME_ID_ALIASES: Record<string, string> = {
  star_wars: 'star_wars_unlimited',
  sw_unlimited: 'star_wars_unlimited',
  weiss_schwarz: 'weiss',
};

export function resolveGameId(id: string): string {
  return GAME_ID_ALIASES[id] ?? id;
}

export function getGame(id: string): GameDefinition | undefined {
  return SELECTABLE_GAMES.find(g => g.id === resolveGameId(id));
}
