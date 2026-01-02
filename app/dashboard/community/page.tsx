'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { FloatingParticles, Avatar, GlowButton } from '@/components/ui';

// Types
interface PlayerAvatar {
  type: string;
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

export default function CommunityPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover' | 'leaderboard'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<SearchResult | LeaderboardEntry | null>(null);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);
  const [saving, setSaving] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

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
        }
      } catch (error) {
        console.error('Error loading current player:', error);
      }
    }
    if (isLoaded && user) {
      loadCurrentPlayer();
    }
  }, [isLoaded, user]);

  // Load leaderboard
  useEffect(() => {
    async function loadLeaderboard() {
      setLeaderboardLoading(true);
      try {
        const res = await fetch('/api/community/leaderboard?limit=50');
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLeaderboardLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

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

  // Search players
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
        // Reload leaderboard to reflect changes
        const lbRes = await fetch('/api/community/leaderboard?limit=50');
        if (lbRes.ok) {
          const data = await lbRes.json();
          setLeaderboard(data.leaderboard || []);
        }
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Member card component
  const MemberCard = ({ member, isLeaderboard = false }: { member: SearchResult | LeaderboardEntry; isLeaderboard?: boolean }) => {
    const isPrivate = 'privacy' in member && member.privacy?.profileVisibility === 'private';
    const isFriendsOnly = 'privacy' in member && member.privacy?.profileVisibility === 'friends';
    const canView = !isPrivate && !isFriendsOnly;

    return (
      <div
        onClick={() => setSelectedMember(member)}
        className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700/50 cursor-pointer hover:border-cyan-500/30 transition-colors"
      >
        <Avatar avatar={member.avatar} size="md" showBadge={canView} isOnline={null} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white truncate">
              {'hidden' in member && member.hidden ? 'Anonymous' : member.name}
            </span>
            {isPrivate && <span className="text-slate-500">🔒</span>}
            {isFriendsOnly && <span className="text-slate-500">👥</span>}
          </div>
          {canView || isLeaderboard ? (
            <>
              <div className="text-slate-400 text-sm">{'title' in member ? member.title : `Level ${member.level}`}</div>
              <div className="text-slate-500 text-xs">
                Level {member.level} • {member.totalXp?.toLocaleString()} XP
              </div>
            </>
          ) : (
            <div className="text-slate-500 text-sm italic">
              {isPrivate ? 'Private profile' : 'Friends only'}
            </div>
          )}
        </div>
        {'isFriend' in member && member.isFriend ? (
          <span className="text-green-500 text-xl">✓</span>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); /* TODO: Send friend request */ }}
            className="px-3 py-1 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-500"
          >
            Add
          </button>
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
                Your real name is never shown unless you enable it.
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
              icon="📊"
              label="Show on Leaderboard"
              description="Appear in public rankings"
              value={privacySettings.showOnLeaderboard}
              onChange={(v) => setPrivacySettings((prev) => ({ ...prev, showOnLeaderboard: v }))}
            />
            
            {privacySettings.showOnLeaderboard && (
              <div className="ml-4">
                <ToggleSetting
                  icon="🎭"
                  label="Show as Anonymous"
                  description="Hide your name on leaderboard"
                  value={privacySettings.showAsAnonymous}
                  onChange={(v) => setPrivacySettings((prev) => ({ ...prev, showAsAnonymous: v }))}
                />
              </div>
            )}
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

        {/* What Others See */}
        <div>
          <h3 className="font-bold text-white mb-3">👀 What Others See</h3>
          <div className="space-y-2">
            <ToggleSetting
              icon="📋"
              label="Show Activity"
              description="Show recent XP activity to others"
              value={privacySettings.showActivity}
              onChange={(v) => setPrivacySettings((prev) => ({ ...prev, showActivity: v }))}
            />
            <ToggleSetting
              icon="🎮"
              label="Show Games"
              description="Show which games you play"
              value={privacySettings.showGames}
              onChange={(v) => setPrivacySettings((prev) => ({ ...prev, showGames: v }))}
            />
            <ToggleSetting
              icon="📛"
              label="Show Real Name"
              description="Display your real name on profile"
              value={privacySettings.showRealName}
              onChange={(v) => setPrivacySettings((prev) => ({ ...prev, showRealName: v }))}
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
          <button 
            onClick={() => setShowPrivacySettings(true)}
            className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
          >
            <span className="text-xl">🛡️</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-3 px-4 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin">⏳</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {[
          { id: 'leaderboard' as const, label: 'Ranks', count: leaderboard.length },
          { id: 'friends' as const, label: 'Friends', count: 0 },
          { id: 'requests' as const, label: 'Requests', count: 0 },
          { id: 'discover' as const, label: 'Discover' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-500'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Search Results (shown when searching) */}
        {searchQuery.length >= 2 && (
          <div className="mb-4">
            <h3 className="text-slate-400 text-sm mb-2">
              Search Results {searchResults.length > 0 && `— ${searchResults.length}`}
            </h3>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <MemberCard key={result.id} member={result} />
                ))}
              </div>
            ) : !isSearching ? (
              <div className="text-center py-4 text-slate-500">No players found</div>
            ) : null}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'leaderboard' && searchQuery.length < 2 && (
          <div className="space-y-3">
            {leaderboardLoading ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 animate-bounce">🏆</div>
                <div className="text-slate-400">Loading rankings...</div>
              </div>
            ) : leaderboard.length > 0 ? (
              leaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border ${
                    entry.id === currentPlayerId ? 'border-cyan-500/50' : 'border-slate-700/50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      entry.rank === 1
                        ? 'bg-yellow-500 text-black'
                        : entry.rank === 2
                        ? 'bg-slate-400 text-black'
                        : entry.rank === 3
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {entry.rank}
                  </div>
                  <Avatar avatar={entry.avatar} size="sm" showBadge={false} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">
                        {entry.hidden ? 'Anonymous' : entry.name}
                      </span>
                      {entry.id === currentPlayerId && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-xs">Level {entry.level}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold">{entry.totalXp.toLocaleString()}</div>
                    <div className="text-slate-500 text-xs">XP</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🏆</div>
                <div className="text-white font-bold">No rankings yet</div>
                <div className="text-slate-500 text-sm">Be the first to earn XP!</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'friends' && searchQuery.length < 2 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👥</div>
            <div className="text-white font-bold">Friends Coming Soon</div>
            <div className="text-slate-500 text-sm">Friend system is under development</div>
          </div>
        )}

        {activeTab === 'requests' && searchQuery.length < 2 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📬</div>
            <div className="text-white font-bold">No Pending Requests</div>
            <div className="text-slate-500 text-sm">Friend requests will appear here</div>
          </div>
        )}

        {activeTab === 'discover' && searchQuery.length < 2 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-white font-bold">Discover Players</div>
            <div className="text-slate-500 text-sm">Use the search bar to find players</div>
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
                <div className="text-cyan-400 text-sm font-mono mt-1">{selectedMember.id}</div>
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
              <GlowButton color="cyan" className="flex-1 py-3">
                <div className="flex items-center justify-center gap-2">
                  <span>👥</span>
                  <span>Send Friend Request</span>
                </div>
              </GlowButton>
              <button className="px-4 py-3 bg-slate-800 text-white rounded-xl border border-slate-700">
                💬
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Settings Modal */}
      {showPrivacySettings && <PrivacySettingsModal />}
    </div>
  );
}
