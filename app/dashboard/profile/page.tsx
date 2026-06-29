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
  passTier: string | null;
  passStatus: string | null;
  passExpiresAt: string | null;
}

interface ReferralStats {
  referralCode: string;
  shareUrl: string;
  stats: {
    totalReferred: number;
    attendedFirstEvent: number;
    pendingAttendance: number;
    totalXpEarned: number;
  };
  referrals: {
    id: string;
    name: string;
    hasAttended: boolean;
    joinedAt: string;
  }[];
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
  silver: 'border-border-strong',
  gold: 'border-yellow-500',
  diamond: 'border-cyan-400',
  fire: 'border-orange-500',
  pirate: 'border-red-600',
  electric: 'border-yellow-400',
  legendary: 'border-purple-500',
};

const defaultAvatarConfig: AvatarConfig = {
  base: '😎',
  background: 'var(--bg-elevated)',
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

  // Referral state
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralLoading, setReferralLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showReferralDetails, setShowReferralDetails] = useState(false);
  const [storeConfig, setStoreConfig] = useState({ currency_name: 'Points', currency_icon: '⭐' });

  const loadPlayerData = useCallback(async () => {
    setLoading(true);
    try {
      // Load store config for currency name
      fetch('/api/store-config').then(r => r.ok ? r.json() : null).then(cfg => {
        if (cfg) setStoreConfig(cfg);
      }).catch(() => {});

      // Load player info
      const playerRes = await fetch('/api/player/by-clerk');
      if (playerRes.ok) {
        const data = await playerRes.json();
        if (data.linked) {
          // Load inventory for avatar config and balance
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
              passTier: data.passTier || null,
              passStatus: data.passStatus || null,
              passExpiresAt: data.passExpiresAt || null,
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

  // Load referral stats
  const loadReferralStats = useCallback(async () => {
    setReferralLoading(true);
    try {
      const res = await fetch('/api/referral/stats');
      if (res.ok) {
        const data = await res.json();
        setReferralStats(data);
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setReferralLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      loadPlayerData();
      loadFavoriteGames();
      loadReferralStats();
    }
  }, [isLoaded, user, loadPlayerData, loadFavoriteGames, loadReferralStats]);

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

  // Copy referral code to clipboard
  const copyReferralCode = async () => {
    if (referralStats?.referralCode) {
      await navigator.clipboard.writeText(referralStats.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Copy share link to clipboard
  const copyShareLink = async () => {
    if (referralStats?.shareUrl) {
      await navigator.clipboard.writeText(referralStats.shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
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
          <div className="absolute -bottom-1 -right-1 text-lg bg-elevated rounded-full w-7 h-7 flex items-center justify-center border-2 border-border-token">
            {config.badge}
          </div>
        )}
        {onClick && (
          <div className="absolute bottom-0 right-0 bg-accent text-primary text-xs px-2 py-1 rounded-full font-bold">
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
            ? 'border-accent bg-accent/10' 
            : 'border-border-token bg-elevated/50 hover:border-border-token'
        }`}
      >
        <div className="text-2xl">
          {item.category === 'base' && item.assetData?.emoji}
          {item.category === 'badge' && item.assetData?.emoji}
          {item.category === 'background' && (
            <div 
              className="w-8 h-8 rounded-full border-2 border-border-strong mx-auto"
              style={{ backgroundColor: item.assetData?.color }}
            />
          )}
          {item.category === 'frame' && (
            <div className={`w-8 h-8 rounded-full border-4 ${frameStyles[item.assetData?.style] || ''} bg-elevated mx-auto`} />
          )}
        </div>
        <div className="text-primary text-xs mt-1 text-center truncate">{item.name}</div>
        {isSelected && <div className="text-accent text-xs">✓</div>}
      </button>
    );
  };

  // Avatar Editor Modal
  const AvatarEditorModal = () => (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="p-4 border-b border-border-token flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => {
            setTempAvatar(playerData?.avatarConfig || defaultAvatarConfig);
            setEditingAvatar(false);
          }} 
          className="text-secondary"
        >
          Cancel
        </button>
        <h2 className="text-primary font-bold">Edit Avatar</h2>
        <button 
          type="button" 
          onClick={saveAvatar} 
          disabled={saving}
          className="text-accent font-bold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Preview */}
      <div className="p-8 flex justify-center">
        <AvatarPreview config={tempAvatar} size="xl" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-token">
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
              activeTab === tab.id ? 'text-accent border-b-2 border-cyan-400' : 'text-secondary'
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
              className="w-full p-6 border-2 border-dashed border-border-token rounded-xl text-center hover:border-accent transition-colors"
            >
              <div className="text-4xl mb-2">📷</div>
              <div className="text-primary font-medium">Upload Photo</div>
              <div className="text-secondary text-sm">Tap to select an image</div>
            </button>
            {tempAvatar.photo_url && (
              <button
                type="button"
                onClick={() => setTempAvatar(prev => ({ ...prev, photo_url: null }))}
                className="w-full p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30"
              >
                Remove Photo
              </button>
            )}
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
          <div className="grid grid-cols-4 gap-3">
            {(ownedItems.frame || []).map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
        
        {activeTab === 'badge' && (
          <div className="grid grid-cols-4 gap-3">
            {(ownedItems.badge || []).map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-primary text-xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-secondary">Please make sure you're logged in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base pb-20">
      {/* Header */}
      <div className="bg-surface pt-8 pb-6 px-4">
        <div className="flex flex-col items-center">
          <AvatarPreview 
            config={playerData.avatarConfig} 
            size="xl" 
            onClick={() => {
              setTempAvatar(playerData.avatarConfig);
              setEditingAvatar(true);
            }} 
          />
          <h1 className="text-primary text-2xl font-bold mt-4">{playerData.displayName}</h1>
          <div className="text-secondary font-mono text-sm">{playerData.id}</div>
          
          {/* Status Badge */}
          <button
            type="button"
            onClick={() => setStatusModalOpen(true)}
            className="mt-3"
          >
            {playerData.status ? (
              <StatusBadge status={playerData.status} />
            ) : (
              <div className="px-4 py-2 rounded-full bg-elevated/50 border border-border-token text-secondary text-sm flex items-center gap-2">
                <span>+ Set Status</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-2">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-elevated/50 rounded-xl p-3 border border-border-token text-center">
            <div className="text-2xl mb-1">🏆</div>
            <div className="text-primary font-bold text-lg">{playerData.level}</div>
            <div className="text-secondary text-xs">Level</div>
          </div>
          <div className="bg-elevated/50 rounded-xl p-3 border border-border-token text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-accent font-bold">{playerData.totalXp.toLocaleString()}</div>
            <div className="text-secondary text-xs">Total XP</div>
          </div>
          <div className="bg-elevated/50 rounded-xl p-3 border border-border-token text-center">
            <div className="text-2xl mb-1">{storeConfig.currency_icon}</div>
            <div className="text-purple-400 font-bold">{playerData.gems.toLocaleString()}</div>
            <div className="text-secondary text-xs">{storeConfig.currency_name}</div>
          </div>
        </div>
      </div>

      {/* Referral Section */}
      <div className="px-4 mt-6">
        <h2 className="font-bold text-primary flex items-center gap-2 mb-3">
          <span className="text-xl">🎁</span> Invite Friends
        </h2>
        
        {referralLoading ? (
          <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : referralStats ? (
          <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
            {/* Referral Code */}
            <div className="mb-4">
              <div className="text-secondary text-xs mb-1">Your Referral Code</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-elevated rounded-lg px-4 py-3 font-mono text-lg text-primary tracking-wider">
                  {referralStats.referralCode}
                </div>
                <button
                  type="button"
                  onClick={copyReferralCode}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    copiedCode
                      ? 'bg-green-500 text-primary'
                      : 'bg-purple-500 hover:bg-purple-400 text-primary'
                  }`}
                >
                  {copiedCode ? '✓' : '📋'}
                </button>
              </div>
            </div>

            {/* Share Link */}
            <div className="mb-4">
              <div className="text-secondary text-xs mb-1">Share Link</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-elevated rounded-lg px-4 py-3 text-sm text-primary truncate">
                  {referralStats.shareUrl}
                </div>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    copiedLink
                      ? 'bg-green-500 text-primary'
                      : 'bg-accent hover:opacity-90 text-primary'
                  }`}
                >
                  {copiedLink ? '✓' : '🔗'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-elevated/50 rounded-lg p-3 text-center">
                <div className="text-primary font-bold text-xl">{referralStats.stats.totalReferred}</div>
                <div className="text-secondary text-xs">Invited</div>
              </div>
              <div className="bg-elevated/50 rounded-lg p-3 text-center">
                <div className="text-green-400 font-bold text-xl">{referralStats.stats.attendedFirstEvent}</div>
                <div className="text-secondary text-xs">Attended</div>
              </div>
              <div className="bg-elevated/50 rounded-lg p-3 text-center">
                <div className="text-accent font-bold text-xl">+{referralStats.stats.totalXpEarned}</div>
                <div className="text-secondary text-xs">XP Earned</div>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-elevated/30 rounded-lg p-3">
              <div className="text-secondary text-xs mb-2 font-medium">How it works</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-primary">
                  <span className="text-green-400">✓</span>
                  <span>Friend signs up with your code → They get <span className="text-accent">+30 XP</span></span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <span className="text-green-400">✓</span>
                  <span>They attend their first event → You get <span className="text-purple-400">+50 XP</span></span>
                </div>
              </div>
            </div>

            {/* Referral List (expandable) */}
            {referralStats.referrals.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowReferralDetails(!showReferralDetails)}
                  className="w-full flex items-center justify-between text-secondary text-sm"
                >
                  <span>Your Referrals ({referralStats.referrals.length})</span>
                  <span>{showReferralDetails ? '▲' : '▼'}</span>
                </button>
                
                {showReferralDetails && (
                  <div className="mt-2 space-y-2">
                    {referralStats.referrals.map(referral => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between bg-elevated/50 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-primary text-sm">{referral.name}</span>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          referral.hasAttended
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {referral.hasAttended ? '✓ Attended' : '⏳ Pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-elevated/50 rounded-xl p-4 border border-border-token text-center">
            <p className="text-secondary">Unable to load referral info</p>
          </div>
        )}
      </div>

      {/* Inventory Summary */}
      <div className="px-4 mt-6">
        <h2 className="font-bold text-primary flex items-center gap-2 mb-3">
          <span className="text-xl">🎒</span> Inventory
        </h2>
        <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl mb-1">😎</div>
              <div className="text-primary font-bold">{(ownedItems.base || []).length}</div>
              <div className="text-secondary text-xs">Bases</div>
            </div>
            <div>
              <div className="text-xl mb-1">🎨</div>
              <div className="text-primary font-bold">{(ownedItems.background || []).length}</div>
              <div className="text-secondary text-xs">BGs</div>
            </div>
            <div>
              <div className="text-xl mb-1">✨</div>
              <div className="text-primary font-bold">{(ownedItems.frame || []).length}</div>
              <div className="text-secondary text-xs">Frames</div>
            </div>
            <div>
              <div className="text-xl mb-1">🏷️</div>
              <div className="text-primary font-bold">{(ownedItems.badge || []).length}</div>
              <div className="text-secondary text-xs">Badges</div>
            </div>
          </div>
        </div>
      </div>

      {/* Favorite Games */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-primary flex items-center gap-2">
            <span className="text-xl">⭐</span> Favorite Games
          </h2>
          <button
            type="button"
            onClick={startEditingFavorites}
            className="text-accent text-sm font-medium"
          >
            Edit
          </button>
        </div>
        
        {favoriteGames.length > 0 ? (
          <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
            <div className="flex flex-wrap gap-2">
              {favoriteGames.map(gameId => {
                const game = ALL_GAMES.find(g => g.id === gameId);
                if (!game) return null;
                return (
                  <div
                    key={gameId}
                    className="flex items-center gap-2 px-3 py-2 bg-elevated/50 rounded-lg border border-border-token/50"
                  >
                    <span>{game.icon}</span>
                    <span className="text-primary text-sm">{game.name}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-secondary text-xs mt-3">
              These games appear on your dashboard and leaderboard tabs
            </p>
          </div>
        ) : (
          <div className="bg-elevated/50 rounded-xl p-4 border border-border-token text-center">
            <p className="text-secondary">No favorite games selected</p>
            <button
              type="button"
              onClick={startEditingFavorites}
              className="mt-2 text-accent text-sm font-medium"
            >
              + Add favorites
            </button>
          </div>
        )}
      </div>

      {/* Membership */}
      <div className="px-4 mt-6">
        <h2 className="font-bold text-primary flex items-center gap-2 mb-3">
          <span className="text-xl">🎫</span> Membership
        </h2>
        <div className={`rounded-xl p-4 border ${
          playerData.passStatus === 'active'
            ? 'bg-accent/10 border-accent/30'
            : 'bg-elevated/50 border-border-token'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-primary font-semibold">
              {playerData.passTier === 'player' ? 'Player Pass' :
               playerData.passTier === 'all_access' ? 'All Access Pass' :
               playerData.passTier === 'shadow_vip' ? 'Shadow VIP' :
               'Free Member'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              playerData.passStatus === 'active'
                ? 'bg-green-500/20 text-green-400'
                : playerData.passStatus === 'grace_period'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-surface text-secondary'
            }`}>
              {playerData.passStatus === 'active' ? 'Active' :
               playerData.passStatus === 'grace_period' ? 'Grace Period' :
               playerData.passStatus === 'cancelled' ? 'Cancelled' :
               playerData.passStatus === 'expired' ? 'Expired' :
               'Free'}
            </span>
          </div>
          {playerData.passExpiresAt && playerData.passStatus === 'active' && (
            <p className="text-secondary text-xs mt-1">
              Renews {new Date(playerData.passExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {!playerData.passTier || playerData.passTier === 'none' ? (
            <p className="text-secondary text-xs mt-1">
              Ask staff in-store to upgrade your membership and unlock the Prize Wall.
            </p>
          ) : null}
        </div>
      </div>

      {/* Settings placeholder */}
      <div className="px-4 mt-6 mb-6">
        <h2 className="font-bold text-primary flex items-center gap-2 mb-3">
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
              className="bg-elevated/50 rounded-xl p-4 flex items-center justify-between border border-border-token"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{setting.icon}</span>
                <span className="text-primary">{setting.label}</span>
              </div>
              <div className="text-secondary flex items-center gap-2">
                {setting.value}
                <span className="text-tertiary">›</span>
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
          <div className="p-4 border-b border-border-token flex items-center justify-between">
            <button 
              type="button" 
              onClick={() => setEditingFavorites(false)} 
              className="text-secondary"
            >
              Cancel
            </button>
            <h2 className="text-primary font-bold">Favorite Games</h2>
            <button 
              type="button" 
              onClick={saveFavoriteGames} 
              disabled={savingFavorites}
              className="text-accent font-bold disabled:opacity-50"
            >
              {savingFavorites ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="p-4 border-b border-border-token bg-surface/50">
            <div className="flex items-center justify-between">
              <span className="text-secondary text-sm">Selected: {tempFavorites.length}/8</span>
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
                      className="flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-lg text-sm border border-accent/30"
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
            <p className="text-secondary text-sm mb-4">
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
                        ? 'bg-accent/10 border-accent text-primary'
                        : isDisabled
                          ? 'bg-elevated/30 border-border-token/30 text-tertiary cursor-not-allowed'
                          : 'bg-elevated/50 border-border-token text-primary hover:border-border-token'
                    }`}
                  >
                    <span className="text-2xl">{game.icon}</span>
                    <span className="font-medium">{game.name}</span>
                    {isSelected && (
                      <span className="ml-auto text-accent">✓</span>
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
