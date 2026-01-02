'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { FloatingParticles, Avatar, GlowButton } from '@/components/ui';
import type { CommunityMember, LeaderboardEntry } from '@/lib/types';

// Privacy options configuration
const privacyOptions = {
  profileVisibility: [
    { id: 'public', label: 'Public', icon: '🌐', description: 'Anyone can see your profile' },
    { id: 'friends', label: 'Friends Only', icon: '👥', description: 'Only friends can see your profile' },
    { id: 'private', label: 'Private', icon: '🔒', description: 'Only you can see your profile' },
  ],
};

const mockCommunityMembers: CommunityMember[] = [
  { id: 'HYP-L1NK', name: 'LinkMaster', title: 'Gundam Ace', level: 38, totalXp: 3200, avatar: { type: 'emoji', base: '🥷', photoUrl: null, background: '#22c55e', frame: 'silver', badge: '🤖' }, games: ['gundam', 'onepiece'], isFriend: true, isOnline: true, privacy: { profileVisibility: 'public' }, lastSeen: 'Now' },
  { id: 'HYP-Z3LD', name: 'ZeldaFan99', title: 'Pokémon Champion', level: 52, totalXp: 5800, avatar: { type: 'emoji', base: '🧝‍♀️', photoUrl: null, background: '#ec4899', frame: 'gold', badge: '⚡' }, games: ['pokemon', 'lorcana'], isFriend: true, isOnline: false, privacy: { profileVisibility: 'friends' }, lastSeen: '3h ago' },
  { id: 'HYP-S4MU', name: 'SamusHunter', title: 'MTG Veteran', level: 67, totalXp: 8900, avatar: { type: 'emoji', base: '🦊', photoUrl: null, background: '#f97316', frame: 'diamond', badge: '✨' }, games: ['magic', 'onepiece'], isFriend: true, isOnline: true, privacy: { profileVisibility: 'public' }, lastSeen: 'Now' },
  { id: 'HYP-R4ND', name: 'RandomPlayer', title: 'Newcomer', level: 5, totalXp: 250, avatar: { type: 'emoji', base: '👾', photoUrl: null, background: '#64748b', frame: 'none', badge: '🎮' }, games: ['pokemon'], isFriend: false, isOnline: true, privacy: { profileVisibility: 'public' }, lastSeen: 'Now' },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { id: 'HYP-S4MU', name: 'SamusHunter', level: 67, totalXp: 8900, avatar: { type: 'emoji', base: '🦊', photoUrl: null, background: '#f97316', frame: 'diamond', badge: '✨' } },
  { id: 'HYP-Z3LD', name: 'ZeldaFan99', level: 52, totalXp: 5800, avatar: { type: 'emoji', base: '🧝‍♀️', photoUrl: null, background: '#ec4899', frame: 'gold', badge: '⚡' } },
  { id: 'HYP-M0M0', name: 'DjGotsu', level: 42, totalXp: 4250, avatar: { type: 'emoji', base: '😎', photoUrl: null, background: '#3b82f6', frame: 'gold', badge: '🏴‍☠️' } },
  { id: 'HYP-L1NK', name: 'LinkMaster', level: 38, totalXp: 3200, avatar: { type: 'emoji', base: '🥷', photoUrl: null, background: '#22c55e', frame: 'silver', badge: '🤖' } },
  { id: 'HYP-ANON', name: 'Anonymous', level: 35, totalXp: 2900, avatar: { type: 'emoji', base: '🎭', photoUrl: null, background: '#64748b', frame: 'none', badge: null }, hidden: true },
];

const playerFriends = ['HYP-L1NK', 'HYP-Z3LD', 'HYP-S4MU'];

// Default privacy settings
const defaultPrivacySettings = {
  profileVisibility: 'public' as 'public' | 'friends' | 'private',
  showOnLeaderboard: true,
  showAsAnonymous: false,
  allowFriendRequests: true,
  hideFromSearch: false,
  showActivity: true,
  showGames: true,
  showRealName: false,
};

export default function CommunityPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover' | 'leaderboard'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState(defaultPrivacySettings);
  const [saving, setSaving] = useState(false);

  // Load privacy settings from API
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
    if (user) {
      loadPrivacySettings();
    }
  }, [user]);

  // Save privacy settings to API
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
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const friends = mockCommunityMembers.filter((m) => playerFriends.includes(m.id));
  const onlineFriends = friends.filter((f) => f.isOnline);
  const offlineFriends = friends.filter((f) => !f.isOnline);

  const MemberCard = ({ member }: { member: CommunityMember }) => {
    const isFriend = playerFriends.includes(member.id);
    const canView = member.privacy.profileVisibility === 'public' || isFriend;

    return (
      <div
        onClick={() => setSelectedMember(member)}
        className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700/50 cursor-pointer hover:border-cyan-500/30 transition-colors"
      >
        <Avatar avatar={member.avatar} size="md" showBadge={canView} isOnline={member.isOnline} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white truncate">{member.name}</span>
            {member.privacy.profileVisibility === 'private' && (
              <span className="text-slate-500">🔒</span>
            )}
            {member.privacy.profileVisibility === 'friends' && !isFriend && (
              <span className="text-slate-500">👥</span>
            )}
          </div>
          {canView ? (
            <>
              <div className="text-slate-400 text-sm">{member.title}</div>
              <div className="text-slate-500 text-xs">
                Level {member.level} • {member.totalXp?.toLocaleString()} XP
              </div>
            </>
          ) : (
            <div className="text-slate-500 text-sm italic">
              {member.privacy.profileVisibility === 'private' ? 'Private profile' : 'Friends only'}
            </div>
          )}
        </div>
        {isFriend ? (
          <span className="text-green-500 text-xl">✓</span>
        ) : (
          <button className="px-3 py-1 bg-cyan-600 text-white text-sm rounded-lg">Add</button>
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
            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <span className="text-white text-sm">Show on Leaderboard</span>
                  <div className="text-slate-500 text-xs">Appear in public rankings</div>
                </div>
              </div>
              <button
                onClick={() => setPrivacySettings((prev) => ({ ...prev, showOnLeaderboard: !prev.showOnLeaderboard }))}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.showOnLeaderboard ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    privacySettings.showOnLeaderboard ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {privacySettings.showOnLeaderboard && (
              <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50 ml-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎭</span>
                  <div>
                    <span className="text-white text-sm">Show as Anonymous</span>
                    <div className="text-slate-500 text-xs">Hide your name on leaderboard</div>
                  </div>
                </div>
                <button
                  onClick={() => setPrivacySettings((prev) => ({ ...prev, showAsAnonymous: !prev.showAsAnonymous }))}
                  className={`w-12 h-7 rounded-full transition-colors relative ${
                    privacySettings.showAsAnonymous ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      privacySettings.showAsAnonymous ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Discovery Settings */}
        <div>
          <h3 className="font-bold text-white mb-3">🔍 Discovery</h3>
          <div className="space-y-2">
            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚫</span>
                <div>
                  <span className="text-white text-sm">Hide from Search</span>
                  <div className="text-slate-500 text-xs">Don't appear in player searches</div>
                </div>
              </div>
              <button
                onClick={() => setPrivacySettings((prev) => ({ ...prev, hideFromSearch: !prev.hideFromSearch }))}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.hideFromSearch ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    privacySettings.hideFromSearch ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">👥</span>
                <div>
                  <span className="text-white text-sm">Allow Friend Requests</span>
                  <div className="text-slate-500 text-xs">Let others send you friend requests</div>
                </div>
              </div>
              <button
                onClick={() => setPrivacySettings((prev) => ({ ...prev, allowFriendRequests: !prev.allowFriendRequests }))}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.allowFriendRequests ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    privacySettings.allowFriendRequests ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* What Others See */}
        <div>
          <h3 className="font-bold text-white mb-3">👀 What Others See</h3>
          <div className="space-y-2">
            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">📋</span>
                <div>
                  <span className="text-white text-sm">Show Activity</span>
                  <div className="text-slate-500 text-xs">Show recent XP activity to others</div>
                </div>
              </div>
              <button
                onClick={() => setPrivacySettings((prev) => ({ ...prev, showActivity: !prev.showActivity }))}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.showActivity ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    privacySettings.showActivity ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎮</span>
                <div>
                  <span className="text-white text-sm">Show Games</span>
                  <div className="text-slate-500 text-xs">Show which games you play</div>
                </div>
              </div>
              <button
                onClick={() => setPrivacySettings((prev) => ({ ...prev, showGames: !prev.showGames }))}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.showGames ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    privacySettings.showGames ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">📛</span>
                <div>
                  <span className="text-white text-sm">Show Real Name</span>
                  <div className="text-slate-500 text-xs">Display your real name on profile</div>
                </div>
              </div>
              <button
                onClick={() => setPrivacySettings((prev) => ({ ...prev, showRealName: !prev.showRealName }))}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.showRealName ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    privacySettings.showRealName ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
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
            <p className="text-slate-400 text-sm">{onlineFriends.length} friends online</p>
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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {[
          { id: 'friends' as const, label: 'Friends', count: friends.length },
          { id: 'requests' as const, label: 'Requests', count: 1 },
          { id: 'discover' as const, label: 'Discover' },
          { id: 'leaderboard' as const, label: 'Ranks' },
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
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {onlineFriends.length > 0 && (
              <div>
                <h3 className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Online —{' '}
                  {onlineFriends.length}
                </h3>
                <div className="space-y-2">
                  {onlineFriends.map((f) => (
                    <MemberCard key={f.id} member={f} />
                  ))}
                </div>
              </div>
            )}
            {offlineFriends.length > 0 && (
              <div className="mt-4">
                <h3 className="text-slate-400 text-sm mb-2">Offline — {offlineFriends.length}</h3>
                <div className="space-y-2">
                  {offlineFriends.map((f) => (
                    <MemberCard key={f.id} member={f} />
                  ))}
                </div>
              </div>
            )}
            {friends.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👥</div>
                <div className="text-white font-bold">No friends yet</div>
                <div className="text-slate-500 text-sm">Check Discover to find players!</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Avatar
                  avatar={{
                    type: 'emoji',
                    base: '🎮',
                    photoUrl: null,
                    background: '#22c55e',
                    frame: 'none',
                    badge: '⚡',
                  }}
                  size="md"
                />
                <div className="flex-1">
                  <div className="font-bold text-white">NewPlayer42</div>
                  <div className="text-slate-500 text-xs">2h ago</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 bg-cyan-600 text-white rounded-lg font-medium">
                  Accept
                </button>
                <button className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium">
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="space-y-3">
            <div className="text-slate-400 text-sm mb-2">Suggested Players</div>
            {mockCommunityMembers
              .filter((m) => !playerFriends.includes(m.id))
              .map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            {mockLeaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border ${
                  entry.id === 'HYP-M0M0' ? 'border-cyan-500/50' : 'border-slate-700/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    i === 0
                      ? 'bg-yellow-500 text-black'
                      : i === 1
                      ? 'bg-slate-400 text-black'
                      : i === 2
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {i + 1}
                </div>
                <Avatar avatar={entry.avatar} size="sm" showBadge={false} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">
                      {entry.hidden ? 'Anonymous' : entry.name}
                    </span>
                    {entry.id === 'HYP-M0M0' && (
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
            ))}
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
                  isOnline={selectedMember.isOnline}
                />
                <h1 className="text-2xl font-bold text-white mt-4">{selectedMember.name}</h1>
                <div className="text-purple-400">{selectedMember.title}</div>
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
              {!playerFriends.includes(selectedMember.id) ? (
                <GlowButton color="cyan" className="flex-1 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <span>👥</span>
                    <span>Send Friend Request</span>
                  </div>
                </GlowButton>
              ) : (
                <button className="flex-1 py-3 bg-slate-800 text-green-400 rounded-xl font-bold border border-green-500/30">
                  ✓ Friends
                </button>
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
    </div>
  );
}
