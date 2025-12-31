'use client';

import React, { useState } from 'react';
import { FloatingParticles, Avatar, GlowButton } from '@/components/ui';
import type { CommunityMember, LeaderboardEntry } from '@/lib/types';

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

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover' | 'leaderboard'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);

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
          </div>
          {canView ? (
            <>
              <div className="text-slate-400 text-sm">{member.title}</div>
              <div className="text-slate-500 text-xs">
                Level {member.level} • {member.totalXp?.toLocaleString()} XP
              </div>
            </>
          ) : (
            <div className="text-slate-500 text-sm italic">Private profile</div>
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
          <button className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
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
    </div>
  );
}
