// Airtable API client for Hyperbolic XP system
// Uses existing Netlify functions as backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  pin?: string;
}

// Helper for API calls
async function apiCall<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, pin } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (pin) {
    headers['Authorization'] = `Bearer PIN:${pin}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}/api${endpoint}`, fetchOptions);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data;
}

// ========== PUBLIC ENDPOINTS ==========

export async function getPlayer(playerId: string) {
  return apiCall<{
    recordId: string;
    playerId: string;
    displayName: string;
    xp: number;
    primaryGame: string;
    rank: number;
    winCount: number;
    eventCount: number;
    gameCurrencies: Array<{
      game: string;
      icon: string;
      currency: string;
      xp: number;
    }>;
    recentActivity: Array<{
      fields: {
        XP_Amount: number;
        Source: string;
        Description: string;
      };
    }>;
    onePiece?: {
      monthlyBerries: number;
      monthlyBounty: string;
      monthlyTitle: string;
      lifetimeBerries: number;
      lifetimeBounty: string;
      lifetimeTitle: string;
    };
  }>(`/get-player?id=${encodeURIComponent(playerId)}`);
}

export async function getLeaderboard(limit = 50) {
  return apiCall<{
    leaderboard: Array<{
      playerId: string;
      displayName: string;
      xp: number;
      primaryGame: string;
    }>;
  }>(`/get-leaderboard?limit=${limit}`);
}

// ========== STAFF ENDPOINTS (require PIN) ==========

export async function searchPlayer(query: string, pin: string) {
  return apiCall<{
    player: {
      recordId: string;
      playerId: string;
      displayName: string;
      realName: string;
      xp: number;
      primaryGame: string;
      cardStatus: string;
      discord: string;
      gameXP: number;
    };
  }>(`/search-player?q=${encodeURIComponent(query)}`, { pin });
}

export async function awardXP(
  playerId: string,
  entries: Array<{
    xp: number;
    source: string;
    description?: string;
    game?: string;
  }>,
  pin: string
) {
  return apiCall<{ success: boolean }>('/award-xp', {
    method: 'POST',
    body: { playerId, entries },
    pin,
  });
}

export async function createPlayer(
  data: {
    displayName: string;
    realName?: string;
    discord?: string;
    primaryGame?: string;
    email?: string;
    phone?: string;
  },
  pin: string
) {
  return apiCall<{ playerId: string }>('/create-player', {
    method: 'POST',
    body: data,
    pin,
  });
}

export async function checkIn(playerId: string, game: string, pin: string) {
  return apiCall<{ success: boolean; xpAwarded: number }>('/checkin', {
    method: 'POST',
    body: { playerId, game },
    pin,
  });
}

export async function getActivity(limit = 50, pin: string) {
  return apiCall<{
    activity: Array<{
      xp: number;
      source: string;
      game: string;
      created: string;
      description: string;
    }>;
  }>(`/get-activity?limit=${limit}`, { pin });
}

export async function getEmperorRankings(month?: string, pin?: string) {
  const params = month ? `?month=${month}` : '';
  return apiCall<{
    rankings: Array<{
      name: string;
      playerId: string;
      berries: number;
      bounty: string;
    }>;
    hallOfFame: Array<{
      month: string;
      monthSort: string;
      playerName: string;
      playerId: string;
      berries: number;
      bountyDisplay: string;
    }>;
  }>(`/get-emperors${params}`, { pin });
}

export async function crownEmperor(
  data: {
    month: string;
    monthSort: string;
    playerName: string;
    playerId: string;
    berries: number;
    bountyDisplay: string;
  },
  pin: string
) {
  return apiCall<{ success: boolean }>('/crown-emperor', {
    method: 'POST',
    body: data,
    pin,
  });
}

// ========== GAME CURRENCIES ==========
export const GAME_CURRENCIES: Record<string, { icon: string; currency: string }> = {
  'One Piece': { icon: '🏴‍☠️', currency: 'Berries' },
  'Gundam': { icon: '🤖', currency: 'Pilot Points' },
  'Star Wars Unlimited': { icon: '🌟', currency: 'Holopoints' },
  'Vanguard': { icon: '⚔️', currency: 'Ride Gauge' },
  'MTG': { icon: '✨', currency: 'Mana Marks' },
  'UVS': { icon: '👊', currency: 'Versus Tokens' },
  'Pokemon': { icon: '⚡', currency: 'Pokepoints' },
  'Riftbound': { icon: '🌀', currency: 'Essence' },
  'Hololive': { icon: '🎤', currency: 'Fan Subs' },
  'Lorcana': { icon: '🪄', currency: 'Ink Points' },
};

// ========== RANK CONFIGURATIONS ==========
export const ONE_PIECE_RANKS = [
  { min: 0, title: 'East Blue Rookie' },
  { min: 100, title: 'Paradise Pirate' },
  { min: 250, title: 'Super Rookie' },
  { min: 500, title: 'Notorious Pirate' },
  { min: 750, title: 'Worst Generation' },
  { min: 1000, title: 'Warlord' },
  { min: 1500, title: 'Yonko Commander' },
];

export const STANDARD_GAME_RANKS: Record<string, Array<{ min: number; title: string }>> = {
  'Gundam': [
    { min: 0, title: 'Cadet' },
    { min: 50, title: 'Ensign' },
    { min: 100, title: 'Lieutenant' },
    { min: 200, title: 'Captain' },
    { min: 350, title: 'Commander' },
    { min: 500, title: 'Ace Pilot' },
    { min: 750, title: 'Newtype' },
  ],
  'Pokemon': [
    { min: 0, title: 'Pokemon Fan' },
    { min: 50, title: 'Trainer' },
    { min: 100, title: 'Ace Trainer' },
    { min: 200, title: 'Gym Challenger' },
    { min: 350, title: 'Gym Leader' },
    { min: 500, title: 'Elite Four' },
    { min: 750, title: 'Champion' },
  ],
  'MTG': [
    { min: 0, title: 'Apprentice' },
    { min: 50, title: 'Mage' },
    { min: 100, title: 'Wizard' },
    { min: 200, title: 'Sorcerer' },
    { min: 350, title: 'Archmage' },
    { min: 500, title: 'Planeswalker' },
    { min: 750, title: 'Oldwalker' },
  ],
  // Add other games as needed
};

export function getGameRank(game: string, xp: number): string | null {
  if (game === 'One Piece') {
    let rank = ONE_PIECE_RANKS[0].title;
    for (const tier of ONE_PIECE_RANKS) {
      if (xp >= tier.min) rank = tier.title;
    }
    return rank;
  }

  const ranks = STANDARD_GAME_RANKS[game];
  if (!ranks) return null;

  let rank = ranks[0].title;
  for (const tier of ranks) {
    if (xp >= tier.min) rank = tier.title;
  }
  return rank;
}
