'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { FloatingParticles, Avatar, GlowButton } from '@/components/ui';

// Types
interface PlayerAvatar {
  type: 'emoji' | 'photo';
  base: string;
  photoUrl: string | null;
  background: string;
  frame: string;
  badge: string | null;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  level: number;
  totalXp: number;
  avatar: PlayerAvatar;
  hidden?: boolean;
}

interface SearchResult {
  id: string;
  odid: string;
  name: string;
  title: string;
  level: number | null;
  totalXp: number | null;
  avatar: PlayerAvatar;
  privacy: { profileVisibility: string };
  allowFriendRequests: boolean;
  isFriend: boolean;
  isOnline: boolean | null;
}

interface Friend {
  id: string;
  odid: string;
  name: string;
  title: string;
  level: number;
  totalXp: number;
  avatar: PlayerAvatar;
  isFriend: boolean;
  isOnline: boolean | null;
  status: string | null;
}

interface FriendRequest {
  friendshipId: string;
  id: string;
  odid: string;
  name: string;
  avatar: PlayerAvatar;
  timestamp: string;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnLeaderboard: boolean;
  showAsAnonymous: boolean;
  allowFriendRequests: boolean;
  hideFromSearch: boolean;
  showActivity: boolean;
  showGames: boolean;
  showRealName: boolean;
}

interface Emperor {
  id: string;
  name: string;
  avatar: PlayerAvatar;
  xp: number;
  month: string;
  year: number;
}

interface BountyHunterStatus {
  isWanted: boolean;
  isHunter: boolean;
  rank: number | null;
  xp: number;
  optInOpen: boolean;
  nextEventDate: string | null;
}

// Privacy options configuration
const privacyOptions = {
  profileVisibility: [
    { id: 'public', label: 'Public', icon: '🌐', description: 'Anyone can see your profile' },
    { id: 'friends', label: 'Friends Only', icon: '👥', description: 'Only friends can see your profile' },
    { id: 'private', label: 'Private', icon: '🔒', description: 'Only you can see your profile' },
  ],
};

// Default privacy settings
const defaultPrivacySettings: PrivacySettings = {
  profileVisibility: 'public',
  showOnLeaderboard: true,
  showAsAnonymous: false,
  allowFriendRequests: true,
  hideFromSearch: false,
  showActivity: true,
  showGames: true,
  showRealName: false,
};

// Game options for leaderboard filter - ALL SUPPORTED GAMES
const ALL_LEADERBOARD_GAMES = [
  { id: 'overall', name: 'Overall', icon: '🏆', currency: 'XP' },
  { id: 'one_piece', name: 'One Piece', icon: '🏴‍☠️', currency: 'Berries' },
  { id: 'pokemon', name: 'Pokemon', icon: '⚡', currency: 'Pokepoints' },
  { id: 'mtg', name: 'MTG', icon: '✨', currency: 'Mana Marks' },
  { id: 'gundam', name: 'Gundam', icon: '🤖', currency: 'Pilot Points' },
  { id: 'star_wars_unlimited', name: 'Star Wars', icon: '🌟', currency: 'Holopoints' },
  { id: 'vanguard', name: 'Vanguard', icon: '⚔️', currency: 'Ride Gauge' },
  { id: 'lorcana', name: 'Lorcana', icon: '🪄', currency: 'Lorepoints' },
  { id: 'uvs', name: 'UVS', icon: '👊', currency: 'Versus Tokens' },
  { id: 'digimon', name: 'Digimon', icon: '🦖', currency: 'Digi-Points' },
  { id: 'yugioh', name: 'Yu-Gi-Oh', icon: '⭐', currency: 'Star Chips' },
  { id: 'riftbound', name: 'Riftbound', icon: '🌀', currency: 'Essence' },
  { id: 'hololive', name: 'Hololive', icon: '🎤', currency: 'Fan Subs' },
  { id: 'weiss', name: 'Weiss Schwarz', icon: '🎴', currency: 'Climax Points' },
  { id: 'sw_legion', name: 'SW Legion', icon: '🎖️', currency: 'Battle Orders' },
  { id: 'union_arena', name: 'Union Arena', icon: '🛡️', currency: 'Plot Armor' },
  { id: 'warhammer', name: 'Warhammer', icon: '⚔️', currency: 'War Honors' },
];

export default function CommunityPage() {
  const { user, isLoaded } = useUser();
  // Updated tabs: removed 'requests' and 'discover', added 'one_piece'
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'friends' | 'one_piece'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false); // New search modal state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardGame, setLeaderboardGame] = useState('overall');
  const [favoriteGames, setFavoriteGames] = useState<string[]>(['overall', 'one_piece']);
  const [showFavoritesPicker, setShowFavoritesPicker] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SearchResult | LeaderboardEntry | Friend | null>(null);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);
  const [saving, setSaving] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentPlayerUuid, setCurrentPlayerUuid] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set());
  const [unfriending, setUnfriending] = useState<string | null>(null);
  
  // One Piece tab state
  const [onePieceLeaderboard, setOnePieceLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentEmperor, setCurrentEmperor] = useState<Emperor | null>(null);
  const [hallOfFame, setHallOfFame] = useState<Emperor[]>([]);
  const [bountyHunterStatus, setBountyHunterStatus] = useState<BountyHunterStatus | null>(null);
  const [onePieceLoading, setOnePieceLoading] = useState(false);
  const [optingIn, setOptingIn] = useState(false);

  // Load functions as callbacks
  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await fetch('/api/community/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const loadFriendRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await fetch('/api/community/friend-requests');
      if (res.ok) {
        const data = await res.json();
        setFriendRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadLeaderboard = useCallback(async (game: string = 'overall') => {
    setLeaderboardLoading(true);
    try {
      const gameParam = game === 'overall' ? '' : `&game=${game}`;
      const res = await fetch(`/api/community/leaderboard?limit=50${gameParam}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // Load One Piece specific data
  const loadOnePieceData = useCallback(async () => {
    setOnePieceLoading(true);
    try {
      // Load One Piece leaderboard (for WANTED list)
      const lbRes = await fetch('/api/community/leaderboard?limit=10&game=one_piece');
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setOnePieceLeaderboard(lbData.leaderboard || []);
      }

      // Load Emperor data
      const empRes = await fetch('/api/hq/emperors');
      if (empRes.ok) {
        const empData = await empRes.json();
        if (empData.rankings && empData.rankings.length > 0) {
          // Current emperor is #1 this month
          const topPlayer = empData.rankings[0];
          setCurrentEmperor({
            id: topPlayer.id,
            name: topPlayer.name,
            avatar: topPlayer.avatar,
            xp: topPlayer.monthlyXp,
            month: new Date().toLocaleString('en-US', { month: 'long' }),
            year: new Date().getFullYear(),
          });
        }
        setHallOfFame(empData.hallOfFame || []);
      }

      // Load Bounty Hunter status (placeholder - will need API)
      // For now, use mock data
      setBountyHunterStatus({
        isWanted: false,
        isHunter: false,
        rank: null,
        xp: 0,
        optInOpen: true, // Would come from event schedule
        nextEventDate: 'January 25, 2026',
      });

    } catch (error) {
      console.error('Error loading One Piece data:', error);
    } finally {
      setOnePieceLoading(false);
    }
  }, []);

  // Handle tab change
  const handleTabChange = (tab: 'leaderboard' | 'friends' | 'one_piece') => {
    setActiveTab(tab);
    
    if (tab === 'friends') {
      loadFriends();
      loadFriendRequests(); // Also load requests for inline display
    } else if (tab === 'leaderboard') {
      loadLeaderboard(leaderboardGame);
    } else if (tab === 'one_piece') {
      loadOnePieceData();
    }
  };

  // Handle leaderboard game change
  const handleGameChange = (game: string) => {
    setLeaderboardGame(game);
    loadLeaderboard(game);
  };

  // Load current player ID
  useEffect(() => {
    async function loadCurrentPlayer() {
      try {
        const res = await fetch('/api/player/by-clerk');
        if (res.ok) {
          const data = await res.json();
          if (data.hyp_id) {
            setCurrentPlayerId(data.hyp_id);
          }
          if (data.id) {
            setCurrentPlayerUuid(data.id);
          }
        }
      } catch (error) {
        console.error('Error loading current player:', error);
      }
    }
    if (isLoaded && user) {
      loadCurrentPlayer();
    }
  }, [isLoaded, user]);

  // Initial data load
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    if (isLoaded && user) {
      loadFriends();
      loadFriendRequests();
    }
  }, [isLoaded, user, loadFriends, loadFriendRequests]);

  // Load favorite games
  useEffect(() => {
    async function loadFavorites() {
      try {
        const res = await fetch('/api/player/favorite-games');
        if (res.ok) {
          const data = await res.json();
          if (data.favorites && data.favorites.length > 0) {
            setFavoriteGames(data.favorites);
          }
        }
      } catch (error) {
        console.error('Error loading favorite games:', error);
      }
    }
    if (isLoaded && user) {
      loadFavorites();
    }
  }, [isLoaded, user]);

  // Save favorite games
  const saveFavoriteGames = async (newFavorites: string[]) => {
    setSavingFavorites(true);
    try {
      const res = await fetch('/api/player/favorite-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: newFavorites }),
      });
      if (res.ok) {
        const data = await res.json();
        setFavoriteGames(data.favorites);
        setShowFavoritesPicker(false);
      }
    } catch (error) {
      console.error('Error saving favorites:', error);
    } finally {
      setSavingFavorites(false);
    }
  };

  // Toggle a game in favorites
  const toggleFavorite = (gameId: string) => {
    if (gameId === 'overall') return;
    setFavoriteGames(prev => {
      if (prev.includes(gameId)) {
        return prev.filter(id => id !== gameId);
      } else if (prev.length < 8) {
        return [...prev, gameId];
      }
      return prev;
    });
  };

  // Get filtered games based on favorites
  const visibleGames = ALL_LEADERBOARD_GAMES.filter(game => favoriteGames.includes(game.id));

  // Load privacy settings
  useEffect(() => {
    async function loadPrivacySettings() {
      try {
        const res = await fetch('/api/player/privacy');
        if (res.ok) {
          const data = await res.json();
          if (data.privacy) {
            setPrivacySettings({
              profileVisibility: data.privacy.profile_visibility || 'public',
              showOnLeaderboard: data.privacy.show_on_leaderboard ?? true,
              showAsAnonymous: data.privacy.show_as_anonymous ?? false,
              allowFriendRequests: data.privacy.allow_friend_requests ?? true,
              hideFromSearch: data.privacy.hide_from_search ?? false,
              showActivity: data.privacy.show_activity ?? true,
              showGames: data.privacy.show_games ?? true,
              showRealName: data.privacy.show_real_name ?? false,
            });
          }
        }
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      }
    }
    if (isLoaded && user) {
      loadPrivacySettings();
    }
  }, [isLoaded, user]);

  // Search players (for search modal)
  useEffect(() => {
    const searchPlayers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/community/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchPlayers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Save privacy settings
  const savePrivacySettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/player/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(privacySettings),
      });
      if (res.ok) {
        setShowPrivacySettings(false);
        loadLeaderboard();
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (targetUuid: string, displayId: string) => {
    setSendingRequest(displayId);
    try {
      const res = await fetch('/api/community/friend-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlayerId: targetUuid }),
      });
      
      if (res.ok) {
        setRequestSent(prev => new Set(prev).add(displayId));
        setSearchResults(prev => prev.map(r => 
          r.id === displayId ? { ...r, isFriend: true } : r
        ));
        setSelectedMember(null);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setSendingRequest(null);
    }
  };

  // Respond to friend request
  const respondToRequest = async (friendshipId: string, action: 'accept' | 'decline') => {
    setRespondingTo(friendshipId);
    try {
      const res = await fetch(`/api/community/friend-requests/${friendshipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (res.ok) {
        setFriendRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
        if (action === 'accept') {
          loadFriends();
        }
      }
    } catch (error) {
      console.error('Error responding to request:', error);
    } finally {
      setRespondingTo(null);
    }
  };

  // Unfriend
  const unfriend = async (targetUuid: string, displayId: string) => {
    setUnfriending(displayId);
    try {
      const res = await fetch(`/api/community/friends/${targetUuid}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setFriends(prev => prev.filter(f => f.odid !== targetUuid));
        setSelectedMember(null);
      }
    } catch (error) {
      console.error('Error unfriending:', error);
    } finally {
      setUnfriending(null);
    }
  };

  // Check if player is a friend
  const isFriend = (odid: string) => {
    return friends.some(f => f.odid === odid);
  };

  // Opt in as Hunter for Bounty Hunter Night
  const optInAsHunter = async () => {
    setOptingIn(true);
    try {
      // TODO: Implement API call
      // const res = await fetch('/api/bounty-hunter/opt-in', { method: 'POST' });
      setBountyHunterStatus(prev => prev ? { ...prev, isHunter: true } : null);
    } catch (error) {
      console.error('Error opting in:', error);
    } finally {
      setOptingIn(false);
    }
  };

  // Member Card Component
  const MemberCard = ({ member }: { member: SearchResult | LeaderboardEntry | Friend }) => {
    const isAnonymous = 'hidden' in member && member.hidden;
    const displayName = isAnonymous ? 'Anonymous' : member.name;
    const memberStatus = 'status' in member ? member.status : null;
    const memberOdid = 'odid' in member ? member.odid : null;
    
    return (
      <div
        onClick={() => !isAnonymous && setSelectedMember(member)}
        className={`bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700/50 ${
          !isAnonymous ? 'cursor-pointer hover:border-cyan-500/50' : ''
        }`}
      >
        <Avatar
          avatar={isAnonymous ? {
            type: 'emoji',
            base: '❓',
            photoUrl: null,
            background: '#64748b',
            frame: 'none',
            badge: null,
          } : member.avatar}
          size="md"
          isOnline={'isOnline' in member ? member.isOnline : null}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white truncate">{displayName}</span>
            {'rank' in member && member.rank <= 5 && (
              <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">WANTED</span>
            )}
          </div>
          {memberStatus && (
            <div className="text-slate-400 text-xs truncate">{memberStatus}</div>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {'level' in member && member.level && (
              <span className="text-xs text-slate-500">Lv.{member.level}</span>
            )}
            {'totalXp' in member && member.totalXp !== null && (
              <span className="text-xs text-cyan-400">{member.totalXp?.toLocaleString()} XP</span>
            )}
          </div>
        </div>
        {'rank' in member && (
          <div className={`text-2xl font-bold ${
            member.rank === 1 ? 'text-yellow-400' :
            member.rank === 2 ? 'text-slate-300' :
            member.rank === 3 ? 'text-amber-600' :
            'text-slate-500'
          }`}>
            #{member.rank}
          </div>
        )}
      </div>
    );
  };

  // Privacy Settings Modal
  const PrivacySettingsModal = () => (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <button onClick={() => setShowPrivacySettings(false)} className="text-slate-400">
          ← Back
        </button>
        <h2 className="text-white font-bold font-orbitron">Privacy Settings</h2>
        <div className="w-12" />
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Safety Banner */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="font-bold text-white">Your Safety Matters</div>
              <div className="text-slate-300 text-sm mt-1">
                Control who can see your profile, find you in search, and contact you.
              </div>
            </div>
          </div>
        </div>

        {/* Profile Visibility */}
        <div>
          <h3 className="font-bold text-white mb-3">👁️ Profile Visibility</h3>
          <div className="space-y-2">
            {privacyOptions.profileVisibility.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPrivacySettings((prev) => ({ ...prev, profileVisibility: opt.id as any }))}
                className={`w-full p-4 rounded-xl flex items-center justify-between ${
                  privacySettings.profileVisibility === opt.id
                    ? 'bg-cyan-500/20 border-2 border-cyan-500'
                    : 'bg-slate-800/50 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left">
                    <div className="text-white font-medium">{opt.label}</div>
                    <div className="text-slate-400 text-sm">{opt.description}</div>
                  </div>
                </div>
                {privacySettings.profileVisibility === opt.id && (
                  <span className="text-cyan-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Settings */}
        <div>
          <h3 className="font-bold text-white mb-3">🏆 Leaderboard</h3>
          <div className="space-y-2">
            <ToggleSetting
              icon="🎭"
              label="Show as Anonymous"
              description="Hide your name on leaderboard (rank still visible)"
              value={privacySettings.showAsAnonymous}
              onChange={(v) => setPrivacySettings((prev) => ({ ...prev, showAsAnonymous: v }))}
            />
          </div>
        </div>

        {/* Discovery Settings */}
        <div>
          <h3 className="font-bold text-white mb-3">🔍 Discovery</h3>
          <div className="space-y-2">
            <ToggleSetting
              icon="🚫"
              label="Hide from Search"
              description="Don't appear in player searches"
              value={privacySettings.hideFromSearch}
              onChange={(v) => setPrivacySettings((prev) => ({ ...prev, hideFromSearch: v }))}
            />
            <ToggleSetting
              icon="👥"
              label="Allow Friend Requests"
              description="Let others send you friend requests"
              value={privacySettings.allowFriendRequests}
              onChange={(v) => setPrivacySettings((prev) => ({ ...prev, allowFriendRequests: v }))}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 pb-8">
          <GlowButton
            color="cyan"
            onClick={savePrivacySettings}
            disabled={saving}
            className="w-full py-4"
          >
            {saving ? 'Saving...' : '💾 Save Privacy Settings'}
          </GlowButton>
        </div>
      </div>
    </div>
  );

  // Toggle setting component
  const ToggleSetting = ({ 
    icon, 
    label, 
    description, 
    value, 
    onChange 
  }: { 
    icon: string; 
    label: string; 
    description: string; 
    value: boolean; 
    onChange: (v: boolean) => void;
  }) => (
    <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <span className="text-white text-sm">{label}</span>
          <div className="text-slate-500 text-xs">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors relative ${
          value ? 'bg-cyan-500' : 'bg-slate-700'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  // Search Modal Component
  const SearchModal = () => (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            setShowSearchModal(false);
            setSearchQuery('');
            setSearchResults([]);
          }} className="text-slate-400">
            ← Back
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-3 px-4 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            {isSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin">⏳</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {searchQuery.length >= 2 ? (
          searchResults.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-slate-400 text-sm mb-2">
                Results — {searchResults.length}
              </h3>
              {searchResults.map((result) => (
                <MemberCard key={result.id} member={result} />
              ))}
            </div>
          ) : !isSearching ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-white font-bold">No players found</div>
              <div className="text-slate-500 text-sm">Try a different search term</div>
            </div>
          ) : null
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-white font-bold">Find Players</div>
            <div className="text-slate-500 text-sm">Search by name or player ID (HYP-XXXXX)</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 border-b border-slate-800">
        <FloatingParticles />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2 font-orbitron">
              <span>👥</span> Community
            </h1>
            <p className="text-slate-400 text-sm">{leaderboard.length} players ranked</p>
          </div>
          {/* Header buttons: Search + Privacy */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSearchModal(true)}
              className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
            >
              <span className="text-xl">🔍</span>
            </button>
            <button 
              onClick={() => setShowPrivacySettings(true)}
              className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
            >
              <span className="text-xl">🛡️</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - Simplified: Ranks, Friends, One Piece */}
      <div className="flex border-b border-slate-800">
        {[
          { id: 'leaderboard' as const, label: '🏆 Ranks', icon: '🏆' },
          { id: 'friends' as const, label: '👥 Friends', count: friends.length, requestCount: friendRequests.length },
          { id: 'one_piece' as const, label: '🏴‍☠️ One Piece', icon: '🏴‍☠️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-500'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800'
              }`}>
                {tab.count}
              </span>
            )}
            {/* Show red dot for pending requests */}
            {'requestCount' in tab && tab.requestCount !== undefined && tab.requestCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            {/* Game Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide items-center">
              {visibleGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleGameChange(game.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                    leaderboardGame === game.id
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span>{game.icon}</span>
                  <span className="text-sm font-medium">{game.name}</span>
                </button>
              ))}
              <button
                onClick={() => setShowFavoritesPicker(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg whitespace-nowrap bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-all border border-dashed border-slate-600"
              >
                <span>⚙️</span>
                <span className="text-sm">Edit</span>
              </button>
            </div>

            {/* Current Game Header */}
            {leaderboardGame !== 'overall' && (
              <div className="bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ALL_LEADERBOARD_GAMES.find(g => g.id === leaderboardGame)?.icon}</span>
                    <div>
                      <div className="font-bold text-white">{ALL_LEADERBOARD_GAMES.find(g => g.id === leaderboardGame)?.name}</div>
                      <div className="text-xs text-slate-400">Ranked by {ALL_LEADERBOARD_GAMES.find(g => g.id === leaderboardGame)?.currency}</div>
                    </div>
                  </div>
                  {leaderboardGame === 'one_piece' && (
                    <div className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">
                      🎯 Top 5 = WANTED
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Leaderboard List */}
            {leaderboardLoading ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 animate-bounce">🏆</div>
                <div className="text-slate-400">Loading rankings...</div>
              </div>
            ) : leaderboard.length > 0 ? (
              leaderboard.map((entry) => (
                <MemberCard key={entry.id} member={entry} />
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🏆</div>
                <div className="text-white font-bold">No rankings yet</div>
                <div className="text-slate-500 text-sm">Be the first to earn {ALL_LEADERBOARD_GAMES.find(g => g.id === leaderboardGame)?.currency}!</div>
              </div>
            )}
          </div>
        )}

        {/* Friends Tab - Now includes pending requests */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {/* Pending Requests Section (inline) */}
            {friendRequests.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-orange-400">
                    ⚠️ Pending Requests ({friendRequests.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {friendRequests.map((request) => (
                    <div key={request.friendshipId} className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <Avatar avatar={request.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{request.name}</div>
                          <div className="text-slate-500 text-xs">{request.timestamp}</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => respondToRequest(request.friendshipId, 'accept')}
                            disabled={respondingTo === request.friendshipId}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button 
                            onClick={() => respondToRequest(request.friendshipId, 'decline')}
                            disabled={respondingTo === request.friendshipId}
                            className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50"
                          >
                            ✗
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            {friendsLoading ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 animate-bounce">👥</div>
                <div className="text-slate-400">Loading friends...</div>
              </div>
            ) : friends.length > 0 ? (
              <>
                <h3 className="text-sm font-medium text-slate-400 mb-2">
                  Friends ({friends.length})
                </h3>
                {friends.map((friend) => (
                  <MemberCard key={friend.id} member={friend} />
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👥</div>
                <div className="text-white font-bold">No friends yet</div>
                <div className="text-slate-500 text-sm">Use the 🔍 search to find players!</div>
              </div>
            )}
          </div>
        )}

        {/* One Piece Tab - Emperor + Bounty Hunter Night */}
        {activeTab === 'one_piece' && (
          <div className="space-y-4">
            {onePieceLoading ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 animate-bounce">🏴‍☠️</div>
                <div className="text-slate-400">Loading...</div>
              </div>
            ) : (
              <>
                {/* Emperor of the Month */}
                <div className="bg-gradient-to-r from-yellow-600/20 via-orange-500/20 to-red-500/20 border border-yellow-500/40 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-3">
                    👑 Emperor of the Month
                  </h3>
                  {currentEmperor ? (
                    <div className="flex items-center gap-4">
                      <Avatar avatar={currentEmperor.avatar} size="lg" />
                      <div>
                        <div className="text-xl font-bold text-white">{currentEmperor.name}</div>
                        <div className="text-yellow-400">{currentEmperor.month} {currentEmperor.year}</div>
                        <div className="text-slate-400 text-sm">{currentEmperor.xp.toLocaleString()} Berries</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-center py-4">
                      No emperor crowned yet this month
                    </div>
                  )}
                </div>

                {/* Hall of Fame */}
                {hallOfFame.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">
                      🏆 Hall of Fame
                    </h3>
                    <div className="space-y-2">
                      {hallOfFame.slice(0, 5).map((emperor, i) => (
                        <div key={emperor.id} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg">
                          <Avatar avatar={emperor.avatar} size="sm" />
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">{emperor.name}</div>
                            <div className="text-slate-500 text-xs">{emperor.month} {emperor.year}</div>
                          </div>
                          <div className="text-yellow-400 text-sm">{emperor.xp.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bounty Hunter Night */}
                <div className="bg-gradient-to-r from-red-600/20 via-red-500/10 to-slate-800/50 border border-red-500/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">
                      🎯 Bounty Hunter Night
                    </h3>
                    {bountyHunterStatus?.nextEventDate && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                        {bountyHunterStatus.nextEventDate}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-4">
                    Monthly high-stakes event! Top 5 are WANTED. Others can opt-in as Hunters to claim their bounties.
                  </p>

                  {/* WANTED List (Top 5) */}
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-red-400 mb-2">🏴‍☠️ WANTED (Top 5)</h4>
                    <div className="space-y-1">
                      {onePieceLeaderboard.slice(0, 5).map((entry, i) => (
                        <div key={entry.id} className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                          <span className="text-red-400 font-bold w-6">#{i + 1}</span>
                          <Avatar avatar={entry.hidden ? {
                            type: 'emoji',
                            base: '❓',
                            photoUrl: null,
                            background: '#64748b',
                            frame: 'none',
                            badge: null,
                          } : entry.avatar} size="sm" />
                          <span className="text-white text-sm flex-1 truncate">
                            {entry.hidden ? 'Anonymous' : entry.name}
                          </span>
                          <span className="text-red-400 text-xs">{entry.totalXp.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Your Status */}
                  {bountyHunterStatus && (
                    <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Your Status</h4>
                      <div className="flex items-center gap-2">
                        {bountyHunterStatus.isWanted ? (
                          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium border border-red-500/30">
                            🎯 WANTED (Rank #{bountyHunterStatus.rank})
                          </span>
                        ) : bountyHunterStatus.isHunter ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                            🏹 Hunter
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-sm">
                            😐 Civilian
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Opt-in Button */}
                  {bountyHunterStatus && !bountyHunterStatus.isWanted && !bountyHunterStatus.isHunter && bountyHunterStatus.optInOpen && (
                    <GlowButton
                      color="orange"
                      onClick={optInAsHunter}
                      disabled={optingIn}
                      className="w-full py-3"
                    >
                      {optingIn ? 'Opting in...' : '🏹 Become a Hunter'}
                    </GlowButton>
                  )}

                  {/* Point Stakes Info */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <h4 className="text-xs font-medium text-slate-400 mb-2">Point Stakes (Round 1)</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="text-green-400">Hunter upsets WANTED</div>
                        <div className="text-white">+30 / -25</div>
                      </div>
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="text-red-400">WANTED defends</div>
                        <div className="text-white">+15 / -20</div>
                      </div>
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="text-slate-400">Hunter vs Hunter</div>
                        <div className="text-white">+15 / -15</div>
                      </div>
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="text-orange-400">WANTED vs WANTED</div>
                        <div className="text-white">+20 / -20</div>
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">* Plus normal +10 for match win</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Member Profile Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <button onClick={() => setSelectedMember(null)} className="text-slate-400">
              ← Back
            </button>
            <h2 className="text-white font-bold">Profile</h2>
            <div className="w-12" />
          </div>
          <div className="flex-1 overflow-auto">
            <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 pt-6 pb-8">
              <FloatingParticles />
              <div className="text-center">
                <Avatar
                  avatar={selectedMember.avatar}
                  size="xl"
                  isOnline={null}
                />
                <h1 className="text-2xl font-bold text-white mt-4">
                  {'hidden' in selectedMember && selectedMember.hidden ? 'Anonymous' : selectedMember.name}
                </h1>
                {'status' in selectedMember && selectedMember.status && (
                  <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-700/50 text-sm text-white">
                    {selectedMember.status}
                  </div>
                )}
                <div className="flex justify-center gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedMember.level}</div>
                    <div className="text-slate-500 text-xs">Level</div>
                  </div>
                  <div className="w-px bg-slate-700" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {selectedMember.totalXp?.toLocaleString()}
                    </div>
                    <div className="text-slate-500 text-xs">XP</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 -mt-4 relative z-10 flex gap-3">
              {('odid' in selectedMember && isFriend(selectedMember.odid)) ? (
                <button 
                  onClick={() => {
                    if ('odid' in selectedMember && selectedMember.odid) {
                      unfriend(selectedMember.odid, selectedMember.id);
                    }
                  }}
                  disabled={unfriending === selectedMember.id}
                  className="flex-1 py-3 bg-slate-800 text-red-400 rounded-xl font-bold border border-red-500/30 hover:bg-red-500/10"
                >
                  {unfriending === selectedMember.id ? 'Removing...' : '✓ Friends (tap to unfriend)'}
                </button>
              ) : ('isFriend' in selectedMember && selectedMember.isFriend) || requestSent.has(selectedMember.id) ? (
                <button className="flex-1 py-3 bg-slate-800 text-green-400 rounded-xl font-bold border border-green-500/30">
                  📨 Request Sent
                </button>
              ) : (
                <GlowButton 
                  color="cyan" 
                  className="flex-1 py-3"
                  onClick={() => {
                    if ('odid' in selectedMember && selectedMember.odid) {
                      sendFriendRequest(selectedMember.odid, selectedMember.id);
                    }
                  }}
                  disabled={sendingRequest !== null}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>👥</span>
                    <span>{sendingRequest ? 'Sending...' : 'Send Friend Request'}</span>
                  </div>
                </GlowButton>
              )}
              <button className="px-4 py-3 bg-slate-800 text-white rounded-xl border border-slate-700">
                💬
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Settings Modal */}
      {showPrivacySettings && <PrivacySettingsModal />}

      {/* Search Modal */}
      {showSearchModal && <SearchModal />}

      {/* Favorites Picker Modal */}
      {showFavoritesPicker && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <button 
              onClick={() => setShowFavoritesPicker(false)} 
              className="text-slate-400"
            >
              Cancel
            </button>
            <h2 className="text-white font-bold">Edit Leaderboards</h2>
            <button 
              onClick={() => saveFavoriteGames(favoriteGames)}
              disabled={savingFavorites}
              className="text-cyan-400 font-bold disabled:opacity-50"
            >
              {savingFavorites ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <p className="text-slate-400 text-sm mb-4">
              Select up to 8 games to show on your leaderboard tabs.
            </p>

            <div className="space-y-2">
              {ALL_LEADERBOARD_GAMES.map((game) => {
                const isSelected = favoriteGames.includes(game.id);
                const isOverall = game.id === 'overall';
                const canSelect = isSelected || favoriteGames.length < 8;

                return (
                  <button
                    key={game.id}
                    onClick={() => !isOverall && toggleFavorite(game.id)}
                    disabled={isOverall || (!isSelected && !canSelect)}
                    className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-2 border-cyan-500'
                        : canSelect
                        ? 'bg-slate-800/50 border-2 border-transparent hover:border-slate-600'
                        : 'bg-slate-800/30 border-2 border-transparent opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{game.icon}</span>
                      <div className="text-left">
                        <div className="text-white font-medium">{game.name}</div>
                        <div className="text-slate-400 text-xs">{game.currency}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-cyan-400">
                        {isOverall ? '🔒' : '✓'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-center text-slate-500 text-sm">
              {favoriteGames.length}/8 selected
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
