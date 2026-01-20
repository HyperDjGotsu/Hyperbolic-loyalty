'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import StatusEditor, { StatusBadge } from '@/components/StatusEditor';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  rarity: string;
  assetData: any;
  isDefault: boolean;
}

interface AvatarConfig {
  base: string;
  background: string;
  frame: string;
  badge: string | null;
  photo_url: string | null;
}

interface PlayerData {
  id: string;
  odid: string;
  displayName: string;
  totalXp: number;
  level: number;
  gems: number;
  avatarConfig: AvatarConfig;
  status: string | null;
}

interface Game {
  id: string;
  name: string;
  icon: string;
}

// All supported games
const ALL_GAMES: Game[] = [
  { id: 'one_piece', name: 'One Piece', icon: '🏴‍☠️' },
  { id: 'pokemon', name: 'Pokemon', icon: '⚡' },
  { id: 'mtg', name: 'MTG', icon: '✨' },
  { id: 'gundam', name: 'Gundam', icon: '🤖' },
  { id: 'star_wars_unlimited', name: 'Star Wars', icon: '🌟' },
  { id: 'vanguard', name: 'Vanguard', icon: '⚔️' },
  { id: 'lorcana', name: 'Lorcana', icon: '🪄' },
  { id: 'uvs', name: 'UVS', icon: '👊' },
  { id: 'digimon', name: 'Digimon', icon: '🦖' },
  { id: 'yugioh', name: 'Yu-Gi-Oh', icon: '⭐' },
  { id: 'riftbound', name: 'Riftbound', icon: '🌀' },
  { id: 'hololive', name: 'Hololive', icon: '🎤' },
  { id: 'weiss', name: 'Weiss Schwarz', icon: '🎴' },
  { id: 'sw_legion', name: 'SW Legion', icon: '🎖️' },
  { id: 'union_arena', name: 'Union Arena', icon: '🛡️' },
  { id: 'warhammer', name: 'Warhammer', icon: '⚔️' },
];

const frameStyles: Record<string, string> = {
  none: 'border-transparent',
  silver: 'border-slate-400',
  gold: 'border-yellow-500',
  diamond: 'border-cyan-400',
  fire: 'border-orange-500',
  pirate: 'border-red-600',
  electric: 'border-yellow-400',
  legendary: 'border-purple-500',
};

const defaultAvatarConfig: AvatarConfig = {
  base: '😎',
  background: '#3b82f6',
  frame: 'none',
  badge: null,
  photo_url: null,
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [ownedItems, setOwnedItems] = useState<Record<string, ShopItem[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Avatar editor state
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<AvatarConfig>(defaultAvatarConfig);
  const [activeTab, setActiveTab] = useState('base');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status editor state
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  // Favorite games state
  const [favoriteGames, setFavoriteGames] = useState<string[]>([]);
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [tempFavorites, setTempFavorites] = useState<string[]>([]);
  const [savingFavorites, setSavingFavorites] = useState(false);

  const loadPlayerData = useCallback(async () => {
    setLoading(true);
    try {
      // Load player info
      const playerRes = await fetch('/api/player/by-clerk');
      if (playerRes.ok) {
        const data = await playerRes.json();
        if (data.linked) {
          // Load inventory for avatar config and gems
          const invRes = await fetch('/api/player/inventory');
          if (invRes.ok) {
            const invData = await invRes.json();
            
            // Load status
            let status = null;
            try {
              const statusRes = await fetch('/api/player/status');
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                status = statusData.status;
              }
            } catch (e) {
              console.error('Error loading status:', e);
            }

            setPlayerData({
              id: data.hyp_id,
              odid: data.id,
              displayName: data.displayName,
              totalXp: data.xp || 0,
              level: Math.floor((data.xp || 0) / 100) + 1,
              gems: invData.gems || 0,
              avatarConfig: invData.avatarConfig || defaultAvatarConfig,
              status,
            });
            setTempAvatar(invData.avatarConfig || defaultAvatarConfig);
            setOwnedItems(invData.grouped || {});
          }
        }
      }
    } catch (error) {
      console.error('Error loading player data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      loadPlayerData();
      loadFavoriteGames();
    }
  }, [isLoaded, user, loadPlayerData, loadFavoriteGames]);

  const saveAvatar = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/player/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempAvatar),
      });

      if (res.ok) {
        setPlayerData(prev => prev ? { ...prev, avatarConfig: tempAvatar } : null);
        setEditingAvatar(false);
        alert('✅ Avatar saved!');
      } else {
        const data = await res.json();
        alert('Failed to save avatar: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatar(prev => ({ ...prev, photo_url: reader.result as string, base: '😎' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusChange = (newStatus: string | null) => {
    setPlayerData(prev => prev ? { ...prev, status: newStatus } : null);
  };

  // Load favorite games
  const loadFavoriteGames = useCallback(async () => {
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
  }, []);

  // Save favorite games
  const saveFavoriteGames = async () => {
    setSavingFavorites(true);
    try {
      const res = await fetch('/api/player/favorite-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: tempFavorites }),
      });
      if (res.ok) {
        const data = await res.json();
        setFavoriteGames(data.favorites);
        setEditingFavorites(false);
        alert('✅ Favorite games saved!');
      } else {
        alert('Failed to save favorites');
      }
    } catch (error) {
      console.error('Error saving favorites:', error);
      alert('Failed to save favorites');
    } finally {
      setSavingFavorites(false);
    }
  };

  // Toggle a game in temp favorites
  const toggleFavorite = (gameId: string) => {
    setTempFavorites(prev => {
      if (prev.includes(gameId)) {
        return prev.filter(id => id !== gameId);
      } else if (prev.length < 8) {
        return [...prev, gameId];
      }
      return prev;
    });
  };

  // Start editing favorites
  const startEditingFavorites = () => {
    setTempFavorites([...favoriteGames]);
    setEditingFavorites(true);
  };

  const AvatarPreview = ({ config, size = 'lg', onClick }: { config: AvatarConfig; size?: 'md' | 'lg' | 'xl'; onClick?: () => void }) => {
    const sizeClasses = {
      md: 'w-14 h-14 text-2xl',
      lg: 'w-20 h-20 text-3xl',
      xl: 'w-28 h-28 text-5xl',
    };
    const frameClass = frameStyles[config.frame] || 'border-transparent';
    
    return (
      <div className="relative inline-block cursor-pointer" onClick={onClick}>
        <div 
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center border-4 ${frameClass}`}
          style={{ backgroundColor: config.background }}
        >
          {config.photo_url ? (
            <img src={config.photo_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            config.base
          )}
        </div>
        {config.badge && (
          <div className="absolute -bottom-1 -right-1 text-lg bg-slate-800 rounded-full w-7 h-7 flex items-center justify-center border-2 border-slate-700">
            {config.badge}
          </div>
        )}
        {onClick && (
          <div className="absolute bottom-0 right-0 bg-cyan-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            ✏️
          </div>
        )}
      </div>
    );
  };

  const CustomizeItemCard = ({ item }: { item: ShopItem }) => {
    const isSelected = 
      (item.category === 'base' && tempAvatar.base === item.assetData?.emoji) ||
      (item.category === 'background' && tempAvatar.background === item.assetData?.color) ||
      (item.category === 'frame' && tempAvatar.frame === item.assetData?.style) ||
      (item.category === 'badge' && tempAvatar.badge === item.assetData?.emoji);

    const handleSelect = () => {
      if (item.category === 'base') {
        setTempAvatar(prev => ({ ...prev, base: item.assetData?.emoji, photo_url: null }));
      } else if (item.category === 'background') {
        setTempAvatar(prev => ({ ...prev, background: item.assetData?.color }));
      } else if (item.category === 'frame') {
        setTempAvatar(prev => ({ ...prev, frame: item.assetData?.style }));
      } else if (item.category === 'badge') {
        setTempAvatar(prev => ({ 
          ...prev, 
          badge: prev.badge === item.assetData?.emoji ? null : item.assetData?.emoji 
        }));
      }
    };

    return (
      <button
        type="button"
        onClick={handleSelect}
        className={`p-3 rounded-xl border-2 transition-all ${
          isSelected 
            ? 'border-cyan-500 bg-cyan-500/20' 
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
        }`}
      >
        <div className="text-2xl">
          {item.category === 'base' && item.assetData?.emoji}
          {item.category === 'badge' && item.assetData?.emoji}
          {item.category === 'background' && (
            <div 
              className="w-8 h-8 rounded-full border-2 border-white/30 mx-auto"
              style={{ backgroundColor: item.assetData?.color }}
            />
          )}
          {item.category === 'frame' && (
            <div className={`w-8 h-8 rounded-full border-4 ${frameStyles[item.assetData?.style] || ''} bg-slate-700 mx-auto`} />
          )}
        </div>
        <div className="text-white text-xs mt-1 text-center truncate">{item.name}</div>
        {isSelected && <div className="text-cyan-400 text-xs">✓</div>}
      </button>
    );
  };

  // Avatar Editor Modal
  const AvatarEditorModal = () => (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => {
            setTempAvatar(playerData?.avatarConfig || defaultAvatarConfig);
            setEditingAvatar(false);
          }} 
          className="text-slate-400"
        >
          Cancel
        </button>
        <h2 className="text-white font-bold">Edit Avatar</h2>
        <button 
          type="button" 
          onClick={saveAvatar} 
          disabled={saving}
          className="text-cyan-400 font-bold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Preview */}
      <div className="p-8 flex justify-center">
        <AvatarPreview config={tempAvatar} size="xl" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {[
          { id: 'photo', label: '📷' },
          { id: 'base', label: '😎' },
          { id: 'background', label: '🎨' },
          { id: 'frame', label: '✨' },
          { id: 'badge', label: '🏷️' },
        ].map(tab => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xl ${
              activeTab === tab.id ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'photo' && (
          <div className="space-y-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()} 
              className="w-full bg-cyan-600 text-white py-4 rounded-xl font-bold"
            >
              📷 Upload Photo
            </button>
            {tempAvatar.photo_url && (
              <button 
                type="button"
                onClick={() => setTempAvatar(prev => ({ ...prev, photo_url: null }))} 
                className="w-full bg-red-600/20 text-red-400 py-3 rounded-xl border border-red-500/30"
              >
                Remove Photo
              </button>
            )}
            <p className="text-slate-500 text-sm text-center">
              Upload a photo to use as your avatar
            </p>
          </div>
        )}

        {activeTab === 'base' && (
          <div className="grid grid-cols-4 gap-3">
            {(ownedItems.base || []).map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {activeTab === 'background' && (
          <div className="grid grid-cols-4 gap-3">
            {(ownedItems.background || []).map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {activeTab === 'frame' && (
          <div className="grid grid-cols-3 gap-3">
            {(ownedItems.frame || []).map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {activeTab === 'badge' && (
          <div className="grid grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setTempAvatar(prev => ({ ...prev, badge: null }))}
              className={`p-3 rounded-xl border-2 transition-all ${
                tempAvatar.badge === null 
                  ? 'border-cyan-500 bg-cyan-500/20' 
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="text-2xl">🚫</div>
              <div className="text-white text-xs mt-1 text-center">None</div>
            </button>
            {(ownedItems.badge || []).map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {activeTab !== 'photo' && (!ownedItems[activeTab] || ownedItems[activeTab].length === 0) && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📦</div>
            <div className="text-slate-400">No items owned</div>
            <p className="text-slate-500 text-sm mt-2">Visit the Shop to buy more!</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">👤</div>
          <div className="text-slate-400">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-white font-bold">Profile not found</div>
          <p className="text-slate-400 text-sm mt-2">Please link your account first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 pt-6 pb-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i} 
              className="absolute rounded-full opacity-30"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`, 
                width: `${Math.random() * 4 + 2}px`, 
                height: `${Math.random() * 4 + 2}px`,
                background: ['#22d3ee', '#a855f7', '#ec4899'][Math.floor(Math.random() * 3)],
              }} 
            />
          ))}
        </div>
        
        <div className="relative text-center">
          <AvatarPreview 
            config={playerData.avatarConfig} 
            size="xl" 
            onClick={() => setEditingAvatar(true)} 
          />
          <h1 className="text-2xl font-bold text-white mt-4">{playerData.displayName}</h1>
          <div className="text-cyan-400 text-sm font-mono mt-1">{playerData.id}</div>
          
          {/* Status Badge */}
          <div className="mt-3 flex justify-center">
            <StatusBadge 
              status={playerData.status} 
              onClick={() => setStatusModalOpen(true)} 
            />
          </div>
          
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{playerData.level}</div>
              <div className="text-slate-500 text-xs">Level</div>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{playerData.totalXp.toLocaleString()}</div>
              <div className="text-slate-500 text-xs">XP</div>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{playerData.gems.toLocaleString()}</div>
              <div className="text-slate-500 text-xs">Gems</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-4 relative z-10 flex gap-2">
        <button
          type="button"
          onClick={() => setEditingAvatar(true)}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3 rounded-xl font-bold"
        >
          ✨ Customize Avatar
        </button>
        <button
          type="button"
          onClick={() => setStatusModalOpen(true)}
          className="bg-slate-700 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-600 transition-colors"
        >
          💬
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 mt-6">
        <h2 className="font-bold text-white flex items-center gap-2 mb-3">
          <span className="text-xl">📊</span> Stats
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
            <div className="text-2xl mb-1">🎮</div>
            <div className="text-white font-bold">{playerData.level}</div>
            <div className="text-slate-500 text-xs">Level</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-cyan-400 font-bold">{playerData.totalXp.toLocaleString()}</div>
            <div className="text-slate-500 text-xs">Total XP</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
            <div className="text-2xl mb-1">💎</div>
            <div className="text-purple-400 font-bold">{playerData.gems.toLocaleString()}</div>
            <div className="text-slate-500 text-xs">Gems</div>
          </div>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="px-4 mt-6">
        <h2 className="font-bold text-white flex items-center gap-2 mb-3">
          <span className="text-xl">🎒</span> Inventory
        </h2>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl mb-1">😎</div>
              <div className="text-white font-bold">{(ownedItems.base || []).length}</div>
              <div className="text-slate-500 text-xs">Bases</div>
            </div>
            <div>
              <div className="text-xl mb-1">🎨</div>
              <div className="text-white font-bold">{(ownedItems.background || []).length}</div>
              <div className="text-slate-500 text-xs">BGs</div>
            </div>
            <div>
              <div className="text-xl mb-1">✨</div>
              <div className="text-white font-bold">{(ownedItems.frame || []).length}</div>
              <div className="text-slate-500 text-xs">Frames</div>
            </div>
            <div>
              <div className="text-xl mb-1">🏷️</div>
              <div className="text-white font-bold">{(ownedItems.badge || []).length}</div>
              <div className="text-slate-500 text-xs">Badges</div>
            </div>
          </div>
        </div>
      </div>

      {/* Favorite Games */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white flex items-center gap-2">
            <span className="text-xl">⭐</span> Favorite Games
          </h2>
          <button
            type="button"
            onClick={startEditingFavorites}
            className="text-cyan-400 text-sm font-medium"
          >
            Edit
          </button>
        </div>
        
        {favoriteGames.length > 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex flex-wrap gap-2">
              {favoriteGames.map(gameId => {
                const game = ALL_GAMES.find(g => g.id === gameId);
                if (!game) return null;
                return (
                  <div
                    key={gameId}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg border border-slate-600/50"
                  >
                    <span>{game.icon}</span>
                    <span className="text-white text-sm">{game.name}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-slate-500 text-xs mt-3">
              These games appear on your dashboard and leaderboard tabs
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
            <p className="text-slate-400">No favorite games selected</p>
            <button
              type="button"
              onClick={startEditingFavorites}
              className="mt-2 text-cyan-400 text-sm font-medium"
            >
              + Add favorites
            </button>
          </div>
        )}
      </div>

      {/* Settings placeholder */}
      <div className="px-4 mt-6 mb-6">
        <h2 className="font-bold text-white flex items-center gap-2 mb-3">
          <span className="text-xl">⚙️</span> Settings
        </h2>
        <div className="space-y-2">
          {[
            { icon: '🔔', label: 'Notifications', value: 'On' },
            { icon: '🎨', label: 'Theme', value: 'Dark' },
            { icon: '🛡️', label: 'Privacy', value: 'Friends Only' },
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
        </div>
      </div>

      {/* Avatar Editor Modal */}
      {editingAvatar && <AvatarEditorModal />}

      {/* Status Editor Modal */}
      <StatusEditor
        currentStatus={playerData.status}
        onStatusChange={handleStatusChange}
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      />

      {/* Favorite Games Editor Modal */}
      {editingFavorites && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <button 
              type="button" 
              onClick={() => setEditingFavorites(false)} 
              className="text-slate-400"
            >
              Cancel
            </button>
            <h2 className="text-white font-bold">Favorite Games</h2>
            <button 
              type="button" 
              onClick={saveFavoriteGames} 
              disabled={savingFavorites}
              className="text-cyan-400 font-bold disabled:opacity-50"
            >
              {savingFavorites ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Selected: {tempFavorites.length}/8</span>
              {tempFavorites.length >= 8 && (
                <span className="text-orange-400 text-xs">Maximum reached</span>
              )}
            </div>
            {tempFavorites.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tempFavorites.map(gameId => {
                  const game = ALL_GAMES.find(g => g.id === gameId);
                  if (!game) return null;
                  return (
                    <button
                      key={gameId}
                      type="button"
                      onClick={() => toggleFavorite(gameId)}
                      className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm border border-cyan-500/30"
                    >
                      <span>{game.icon}</span>
                      <span>{game.name}</span>
                      <span className="ml-1">×</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            <p className="text-slate-400 text-sm mb-4">
              Select up to 8 games. These will appear on your dashboard and in leaderboard tabs.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ALL_GAMES.map(game => {
                const isSelected = tempFavorites.includes(game.id);
                const isDisabled = !isSelected && tempFavorites.length >= 8;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => !isDisabled && toggleFavorite(game.id)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500 text-white'
                        : isDisabled
                          ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-2xl">{game.icon}</span>
                    <span className="font-medium">{game.name}</span>
                    {isSelected && (
                      <span className="ml-auto text-cyan-400">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
