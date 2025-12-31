// ========== PLAYER TYPES ==========
export interface PlayerAvatar {
  type: 'emoji' | 'photo';
  base: string;
  photoUrl: string | null;
  background: string;
  frame: string;
  badge: string | null;
}

export interface LinkedAccount {
  connected: boolean;
  username: string | null;
}

export interface CommerceAccount {
  connected: boolean;
  email: string | null;
  customerId: string | null;
  linkedAt: string | null;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showActivity: boolean;
  showGames: boolean;
  showStats: boolean;
  showRealName: boolean;
  allowFriendRequests: boolean;
  allowMessages: 'everyone' | 'friends' | 'none';
  showOnLeaderboard: boolean;
  hideFromSearch: boolean;
}

export interface GameProgress {
  id: string;
  name: string;
  xpName: string;
  icon: string;
  xp: number;
  level: number;
  color: string;
  rank: string;
}

export interface FriendRequest {
  id: string;
  name: string;
  avatar: PlayerAvatar;
  timestamp: string;
}

export interface Player {
  id: string;
  name: string;
  title: string;
  totalXp: number;
  weeklyXp: number;
  weeklyXpCap: number;
  streak: number;
  battlePass: boolean;
  level: number;
  nextLevelXp: number;
  gems: number;
  tickets: number;
  memberSince: string;
  eventsAttended: number;
  totalSpent: number;
  referrals: number;
  avatar: PlayerAvatar;
  linkedAccounts: {
    discord: LinkedAccount;
    twitch: LinkedAccount;
    youtube: LinkedAccount;
    twitter: LinkedAccount;
    instagram: LinkedAccount;
  };
  commerceAccounts: {
    square: CommerceAccount;
    shopify: CommerceAccount;
  };
  privacy: PrivacySettings;
  friends: string[];
  friendRequests: FriendRequest[];
  blocked: string[];
  games: GameProgress[];
}

// ========== COMMUNITY TYPES ==========
export interface CommunityMember {
  id: string;
  name: string;
  title: string;
  level: number | null;
  totalXp: number | null;
  avatar: PlayerAvatar;
  games: string[];
  isFriend: boolean;
  isOnline: boolean | null;
  privacy: Pick<PrivacySettings, 'profileVisibility'>;
  lastSeen: string | null;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  totalXp: number;
  avatar: PlayerAvatar;
  hidden?: boolean;
}

// ========== EVENT TYPES ==========
export interface GameEvent {
  id: number;
  name: string;
  date: string;
  time: string;
  spots: number;
  maxSpots: number;
  entry: string;
  icon: string;
  color: string;
  hasStream: boolean;
  streamStarting?: boolean;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  badge: string;
  hasStream: boolean;
}

// ========== ACTIVITY TYPES ==========
export interface ActivityItem {
  id: number;
  type: 'event' | 'purchase' | 'gacha' | 'checkin';
  text: string;
  xp: number;
  time: string;
  icon: string;
}

// ========== SHOP TYPES ==========
export interface ShopCategory {
  id: string;
  name: string;
  icon: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: 'gems' | 'tickets' | 'usd';
  icon: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  tag?: string;
  originalPrice?: number;
  includes?: string[];
  duration?: string;
  gems?: number;
}

export interface GachaReward {
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  probability: number;
  icon: string;
  xp: number;
}

// ========== COMMERCE TYPES ==========
export interface PurchaseHistoryItem {
  id: string;
  source: 'square' | 'shopify';
  date: string;
  time: string;
  items: string[];
  total: number;
  xpEarned: number;
  location: string;
  isEvent?: boolean;
}

// ========== SOCIAL TYPES ==========
export interface StoreSocials {
  youtube: {
    channelName: string;
    subscribers: string;
    recentVideo: {
      title: string;
      views: string;
      date: string;
    };
  };
  twitch: {
    channelName: string;
    followers: string;
    isLive: boolean;
    lastStream: string;
  };
  instagram: {
    handle: string;
    followers: string;
    recentPosts: Array<{ id: number; emoji: string }>;
  };
  twitter: {
    handle: string;
    followers: string;
    recentTweets: Array<{ id: number; text: string; likes: number; time: string }>;
  };
  discord: {
    members: string;
    online: number;
  };
  facebook: {
    followers: string;
  };
}

// ========== API RESPONSE TYPES ==========
export interface ApiPlayerResponse {
  success: boolean;
  player?: Player;
  error?: string;
}

export interface ApiLeaderboardResponse {
  success: boolean;
  leaderboard?: LeaderboardEntry[];
  error?: string;
}

export interface ApiEventsResponse {
  success: boolean;
  events?: GameEvent[];
  error?: string;
}
