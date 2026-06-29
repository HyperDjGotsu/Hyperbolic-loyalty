export interface StoreConfig {
  id: string;
  name: string;
  city: string;
  state: string;
  prefix: string;
  color: string;
  players: number;
  weekCheckins: number;
  topPlayer: { name: string; xp: number };
  events: number;
  redemptions: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  store: string;
  xp: number;
  color: string;
}

export interface PrizeItem {
  id: number;
  name: string;
  cost: number;
  category: string;
  icon: string;
  color: string;
  rarity: string;
}

export interface PitchConfig {
  slug: string;
  label: string;           // badge in hero: "Gamers Guild Corp · Private Demo"
  heroHeadline: string;
  heroSub: string;
  heroTagline: string;     // "Built for TCG game stores. Launched at Trade Emporium."
  ctaHeadline: string;
  ctaBody: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  ctaByline: string;
  hqStoreName: string;     // name shown in the HQ mock
  hqCity: string;
  hqPrefix: string;
  hqColor: string;
  stores: StoreConfig[];
  companyName: string;     // "Gamers Guild Corp" in leaderboard header
  leaderboard: LeaderboardEntry[];
  prizes: PrizeItem[];
}

// ── Gamers Guild Corp ───────────────────────────────────────────────────────
export const GGC_CONFIG: PitchConfig = {
  slug: 'ggc',
  label: 'Gamers Guild Corp · Private Demo',
  heroHeadline: 'The loyalty system your players will actually use',
  heroSub: 'One platform. Five stores. Every player who walks through any of your doors gets their own loyalty ID and starts earning.',
  heroTagline: 'Built for TCG game stores. Already running at Trade Emporium.',
  ctaHeadline: 'Ready to launch at Gamers Guild Corp?',
  ctaBody: "This is already running. The same system powering Trade Emporium can be live at all five of your stores — with your branding, your prizes, your player IDs.",
  ctaPrimaryLabel: 'See the live app →',
  ctaPrimaryHref: '/dashboard',
  ctaSecondaryLabel: 'View store HQ',
  ctaSecondaryHref: '/hq',
  ctaByline: 'Built by Darrell · djgotsuai@gmail.com',
  hqStoreName: 'Trade Emporium',
  hqCity: 'Pittsburg, CA',
  hqPrefix: 'TEM',
  hqColor: '#c4b5fd',
  companyName: 'Gamers Guild Corp',
  stores: [
    {
      id: 'tem',
      name: 'Trade Emporium',
      city: 'Pittsburg',
      state: 'CA',
      prefix: 'TEM',
      color: '#c4b5fd',
      players: 184,
      weekCheckins: 61,
      topPlayer: { name: 'Alex R.', xp: 4_820 },
      events: 5,
      redemptions: 23,
    },
    {
      id: 'gom',
      name: 'Games of Martinez',
      city: 'Martinez',
      state: 'CA',
      prefix: 'GOM',
      color: '#60a5fa',
      players: 97,
      weekCheckins: 34,
      topPlayer: { name: 'Jordan K.', xp: 3_290 },
      events: 3,
      redemptions: 11,
    },
    {
      id: 'gob',
      name: 'Games of Brentwood',
      city: 'Brentwood',
      state: 'CA',
      prefix: 'GOB',
      color: '#34d399',
      players: 72,
      weekCheckins: 22,
      topPlayer: { name: 'Sam L.', xp: 2_140 },
      events: 2,
      redemptions: 7,
    },
    {
      id: 'goc',
      name: 'Games of Concord',
      city: 'Concord',
      state: 'CA',
      prefix: 'GOC',
      color: '#f472b6',
      players: 55,
      weekCheckins: 18,
      topPlayer: { name: 'Casey M.', xp: 1_870 },
      events: 2,
      redemptions: 4,
    },
    {
      id: 'goph',
      name: 'Gamers Guild of Pleasant Hill',
      city: 'Pleasant Hill',
      state: 'CA',
      prefix: 'GOPH',
      color: '#fb923c',
      players: 43,
      weekCheckins: 12,
      topPlayer: { name: 'Riley T.', xp: 1_340 },
      events: 1,
      redemptions: 3,
    },
  ],
  leaderboard: [
    { rank: 1, name: 'Alex R.', store: 'Trade Emporium', xp: 4_820, color: '#c4b5fd' },
    { rank: 2, name: 'Jordan K.', store: 'Games of Martinez', xp: 3_290, color: '#60a5fa' },
    { rank: 3, name: 'Marcus D.', store: 'Trade Emporium', xp: 3_100, color: '#c4b5fd' },
    { rank: 4, name: 'Sam L.', store: 'Games of Brentwood', xp: 2_140, color: '#34d399' },
    { rank: 5, name: 'Taylor W.', store: 'Trade Emporium', xp: 2_090, color: '#c4b5fd' },
  ],
  prizes: [
    { id: 1, name: 'Golden Frame', cost: 500, category: 'Frame', icon: '🖼️', color: '#FACC15', rarity: 'Rare' },
    { id: 2, name: 'Dragon Badge', cost: 300, category: 'Badge', icon: '🐉', color: '#E63946', rarity: 'Uncommon' },
    { id: 3, name: 'Holographic BG', cost: 800, category: 'Background', icon: '✨', color: '#8B5CF6', rarity: 'Epic' },
    { id: 4, name: 'Rookie Badge', cost: 100, category: 'Badge', icon: '🏅', color: '#60A5FA', rarity: 'Common' },
    { id: 5, name: 'Emperor Title', cost: 1500, category: 'Title', icon: '👑', color: '#F59E0B', rarity: 'Legendary' },
    { id: 6, name: 'Neon Frame', cost: 400, category: 'Frame', icon: '💫', color: '#00d4ff', rarity: 'Rare' },
  ],
};

// ── Registry ────────────────────────────────────────────────────────────────
const CONFIGS: Record<string, PitchConfig> = {
  ggc: GGC_CONFIG,
};

export function getConfig(slug: string): PitchConfig | null {
  return CONFIGS[slug] ?? null;
}

export function getDefaultConfig(): PitchConfig {
  return GGC_CONFIG;
}
