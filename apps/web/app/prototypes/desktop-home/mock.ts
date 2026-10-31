// Realistic mock data for the desktop Home prototypes. Nothing here touches the database.
export const PLAYER = { name: 'Dj', level: 11, xp: 1080, nextLevelXp: 1100, prizePoints: 250, gamesPlayed: 8, store: "Gamer's Guild of Benicia" };

export const GAMES = [
  { id: 'riftbound', name: 'Riftbound', rank: 'Summoner', value: 310, unit: 'Essence', color: '#22c55e', progress: 62, left: '190 to go' },
  { id: 'mtg', name: 'Magic', rank: 'Mage', value: 230, unit: 'Mana Marks', color: '#8B5CF6', progress: 46, left: '270 to go' },
  { id: 'gundam', name: 'Gundam', rank: 'Ensign', value: 180, unit: 'Pilot Points', color: '#3B82F6', progress: 36, left: '320 to go' },
  { id: 'one_piece', name: 'One Piece', rank: 'East Blue Rookie', value: 120, unit: 'Berries', color: '#E63946', progress: 24, left: '380 to go' },
  { id: 'digimon', name: 'Digimon', rank: 'Baby', value: 95, unit: 'Digi-Points', color: '#f59e0b', progress: 19, left: '405 to go' },
  { id: 'pokemon', name: 'Pokémon', rank: 'Pokémon Fan', value: 70, unit: 'Pokepoints', color: '#FACC15', progress: 14, left: '430 to go' },
];

export const EVENTS = [
  { id: 1, name: 'Riftbound Weekly', when: 'Today · 6:30 PM', game: 'riftbound', fee: 'Free', live: true },
  { id: 2, name: 'One Piece Weekly', when: 'Tomorrow · 6:00 PM', game: 'one_piece', fee: '$5' },
  { id: 3, name: 'Union Arena Weekly', when: 'Sun · 2:00 PM', game: 'union_arena', fee: 'Free' },
];

export const ACTIVITY = [
  { label: 'Riftbound Weekly', when: 'Yesterday', xp: '+25' },
  { label: 'Friday Night Magic', when: 'Fri', xp: '+30' },
  { label: 'Gundam Draft', when: 'Thu', xp: '+35' },
  { label: 'One Piece Weekly', when: 'Wed', xp: '+25' },
  { label: 'Welcome back', when: 'Tue', xp: '+5' },
];

export const CARD = { name: 'Trafalgar Law', set: 'Kingdoms of Intrigue', rarity: 'Common', price: '$0.12', change: '+9.1% 30d', game: 'One Piece' };

export const NAV = ['Home', 'Events', 'Community', 'Prize Wall', 'Profile'];

export const art = (id: string) => `/games/ggob/${id}.jpg`;

// ── Riff round: extra modules so the one-screen Home can feel complete ──
export const BONUS = { points: 5, ready: true };
export const LIVE_EVENT = { name: 'Riftbound Weekly', game: 'riftbound', when: 'Live now · started 6:30 PM', checkedIn: 14, spots: 24, xp: 35 };
export const STORE_UPDATES = [
  { id: 1, title: 'Riftbound Origins boxes are back in stock', when: '2h ago' },
  { id: 2, title: 'Gundam Draft moves to 7:00 PM this Thursday', when: 'Yesterday' },
  { id: 3, title: 'Store closes early Saturday for inventory', when: '2d ago' },
];
export const PASS = { tier: 'Diamond', multiplier: '2x', credit: '$15 Event Credit', creditReady: true, renews: 'Nov 29' };
export const MONTHLY = { name: 'The Regular', done: 1, goal: 3, month: 'Nov' };
export const FRIENDS = [
  { id: 1, who: 'Maya', what: 'reached level 12', when: '1h' },
  { id: 2, who: 'Noor', what: 'checked in · Riftbound', when: '3h' },
  { id: 3, who: 'Sam', what: 'won Gundam Draft', when: 'Thu' },
];
