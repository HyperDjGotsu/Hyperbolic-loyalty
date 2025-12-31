'use client';

import React, { useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { FloatingParticles, Avatar, avatarOptions } from '@/components/ui';
import type { Player } from '@/lib/types';

// Mock player data - replace with API
const mockPlayer: Player = {
  id: 'HYP-M0M0',
  name: 'DjGotsu',
  title: 'Pirate Captain',
  totalXp: 4250,
  weeklyXp: 120,
  weeklyXpCap: 200,
  streak: 7,
  battlePass: true,
  level: 42,
  nextLevelXp: 5000,
  gems: 1250,
  tickets: 3,
  memberSince: 'March 2024',
  eventsAttended: 47,
  totalSpent: 1289,
  referrals: 5,
  avatar: {
    type: 'emoji',
    base: '😎',
    photoUrl: null,
    background: '#3b82f6',
    frame: 'gold',
    badge: '🏴‍☠️',
  },
  linkedAccounts: {
    discord: { connected: true, username: 'DjGotsu#1234' },
    twitch: { connected: false, username: null },
    youtube: { connected: false, username: null },
    twitter: { connected: false, username: null },
    instagram: { connected: false, username: null },
  },
  commerceAccounts: {
    square: { connected: true, email: 'djgotsu@email.com', customerId: 'SQ-abc123', linkedAt: 'Nov 15, 2024' },
    shopify: { connected: false, email: null, customerId: null, linkedAt: null },
  },
  privacy: {
    profileVisibility: 'friends',
    showActivity: true,
    showGames: true,
    showStats: true,
    showRealName: false,
    allowFriendRequests: true,
    allowMessages: 'friends',
    showOnLeaderboard: true,
    hideFromSearch: false,
  },
  friends: ['HYP-L1NK', 'HYP-Z3LD', 'HYP-S4MU'],
  friendRequests: [],
  blocked: [],
  games: [],
};

export default function ProfilePage() {
  const { signOut } = useClerk();
  
  // Sign out - clears localStorage and Clerk session
  const handleSignOut = async () => {
    localStorage.removeItem('hyperbolic_player_id');
    localStorage.removeItem('hyperbolic_player_uuid');
    // Use Clerk's built-in redirect instead of router.push
    await signOut({ redirectUrl: '/' });
  };
  
  const [player] = useState<Player>(mockPlayer);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [tempAvatar, setTempAvatar] = useState(player.avatar);
  const [activeTab, setActiveTab] = useState<'base' | 'background' | 'frame' | 'badge'>('base');

  const saveAvatar = () => {
    // TODO: Save to API
    setEditingAvatar(false);
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 pt-6 pb-8">
        <FloatingParticles />
        <div className="text-center">
          <div className="relative inline-block" onClick={() => setEditingAvatar(true)}>
            <Avatar avatar={player.avatar} size="xl" />
            <div className="absolute bottom-0 right-0 bg-cyan-500 text-white text-xs px-2 py-1 rounded-full font-bold cursor-pointer">
              ✏️
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">{player.name}</h1>
          <div className="text-purple-400">{player.title}</div>
          <div className="text-cyan-400 text-sm font-mono mt-1">{player.id}</div>

          {/* Privacy indicator */}
          <div className="mt-2 inline-flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full">
            <span className="text-sm">
              {player.privacy.profileVisibility === 'public'
                ? '🌐'
                : player.privacy.profileVisibility === 'friends'
                ? '👥'
                : '🔒'}
            </span>
            <span className="text-slate-400 text-xs capitalize">{player.privacy.profileVisibility}</span>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{player.level}</div>
              <div className="text-slate-500 text-xs">Level</div>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{player.totalXp.toLocaleString()}</div>
              <div className="text-slate-500 text-xs">Total XP</div>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{player.streak}d</div>
              <div className="text-slate-500 text-xs">Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="px-4 -mt-4 relative z-10 grid grid-cols-3 gap-3">
        {[
          { icon: '📅', label: 'Member Since', value: player.memberSince },
          { icon: '🎮', label: 'Events', value: player.eventsAttended },
          { icon: '👥', label: 'Friends', value: player.friends.length },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-slate-500 text-xs">{stat.label}</div>
            <div className="text-white font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="mx-4 mt-6">
        <h2 className="font-bold text-white flex items-center gap-2 mb-3">
          <span className="text-xl">🏆</span> Achievements
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['🏴‍☠️', '🔥', '💎', '👑', '🎯', '🏆'].map((badge, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-16 h-16 bg-slate-800/50 rounded-xl flex items-center justify-center text-2xl border border-slate-700/50"
            >
              {badge}
            </div>
          ))}
          <div className="flex-shrink-0 w-16 h-16 bg-slate-800/30 rounded-xl flex items-center justify-center text-slate-600 border border-dashed border-slate-700">
            🔒
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="mx-4 mt-6 mb-6">
        <h2 className="font-bold text-white flex items-center gap-2 mb-3">
          <span className="text-xl">⚙️</span> Settings
        </h2>
        <div className="space-y-2">
          {[
            { icon: '🔔', label: 'Notifications', value: 'On' },
            { icon: '🎨', label: 'Theme', value: 'Dark' },
            { icon: '📱', label: 'NFC Card', value: 'Active' },
          ].map((setting, i) => (
            <div
              key={i}
              className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{setting.icon}</span>
                <span className="text-white">{setting.label}</span>
              </div>
              <div className="text-slate-400 flex items-center gap-2">
                {setting.value}
                <span className="text-slate-600">›</span>
              </div>
            </div>
          ))}

          {/* Sign Out */}
          <button
            onClick={() => handleSignOut()}
            className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-center gap-3 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <span className="text-xl">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Avatar Editor Modal */}
      {editingAvatar && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <button onClick={() => setEditingAvatar(false)} className="text-slate-400">
              Cancel
            </button>
            <h2 className="text-white font-bold">Edit Avatar</h2>
            <button onClick={saveAvatar} className="text-cyan-400 font-bold">
              Save
            </button>
          </div>

          {/* Preview */}
          <div className="p-8 flex justify-center">
            <Avatar avatar={tempAvatar} size="xl" />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            {[
              { id: 'base' as const, label: '😎' },
              { id: 'background' as const, label: '🎨' },
              { id: 'frame' as const, label: '✨' },
              { id: 'badge' as const, label: '🏷️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-xl ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Options */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'base' && (
              <div className="grid grid-cols-4 gap-3">
                {avatarOptions.bases.map((base, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setTempAvatar((prev) => ({ ...prev, type: 'emoji', base, photoUrl: null }))
                    }
                    className={`aspect-square rounded-xl text-3xl flex items-center justify-center ${
                      tempAvatar.type === 'emoji' && tempAvatar.base === base
                        ? 'bg-cyan-500/20 border-2 border-cyan-500'
                        : 'bg-slate-800'
                    }`}
                  >
                    {base}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'background' && (
              <div className="grid grid-cols-4 gap-3">
                {avatarOptions.backgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setTempAvatar((prev) => ({ ...prev, background: bg.color }))}
                    className={`aspect-square rounded-xl ${
                      tempAvatar.background === bg.color ? 'ring-4 ring-cyan-500' : ''
                    }`}
                    style={{ backgroundColor: bg.color }}
                  />
                ))}
              </div>
            )}

            {activeTab === 'frame' && (
              <div className="space-y-3">
                {avatarOptions.frames.map((frame) => (
                  <button
                    key={frame.id}
                    onClick={() => setTempAvatar((prev) => ({ ...prev, frame: frame.id }))}
                    className={`w-full p-4 rounded-xl flex items-center justify-between ${
                      tempAvatar.frame === frame.id
                        ? 'bg-cyan-500/20 border-2 border-cyan-500'
                        : 'bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full border-4 ${frame.style} bg-slate-700`} />
                      <span className="text-white">{frame.name}</span>
                    </div>
                    {frame.cost > 0 && <span className="text-slate-400 text-sm">{frame.cost} XP</span>}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'badge' && (
              <div className="grid grid-cols-4 gap-3">
                {avatarOptions.badges.map((badge, i) => (
                  <button
                    key={i}
                    onClick={() => setTempAvatar((prev) => ({ ...prev, badge }))}
                    className={`aspect-square rounded-xl text-3xl flex items-center justify-center ${
                      tempAvatar.badge === badge
                        ? 'bg-cyan-500/20 border-2 border-cyan-500'
                        : 'bg-slate-800'
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
