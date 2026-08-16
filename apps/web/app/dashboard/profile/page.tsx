'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
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
  previous_photo_url?: string | null;
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

const privacyOptions = {
  profileVisibility: [
    { id: 'public', label: 'Public', icon: '🌐', description: 'Anyone can see your profile' },
    { id: 'friends', label: 'Friends Only', icon: '👥', description: 'Only friends can see your profile' },
    { id: 'private', label: 'Private', icon: '🔒', description: 'Only you can see your profile' },
  ],
};

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
  isStaff: boolean;
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

const DEFAULT_BASE_ITEMS: ShopItem[] = [
  '😎','😊','😄','😍','🤩','😏','😤','🥳','🤠','👻','🐶','🐱',
  '🦊','🐺','🦁','🐸','🤖','👾','🎭','🧙','🥷','🧛','🐉','⚡',
].map((emoji, i) => ({ id: `d-base-${i}`, name: emoji, description: '', category: 'base', price: 0, rarity: 'common', assetData: { emoji }, isDefault: true }));

const DEFAULT_BG_ITEMS: ShopItem[] = [
  { color: '#ef4444', name: 'Red' }, { color: '#f97316', name: 'Orange' }, { color: '#eab308', name: 'Yellow' }, { color: '#22c55e', name: 'Green' },
  { color: '#14b8a6', name: 'Teal' }, { color: '#3b82f6', name: 'Blue' }, { color: '#8b5cf6', name: 'Violet' }, { color: '#ec4899', name: 'Pink' },
  { color: '#b91c1c', name: 'Dark Red' }, { color: '#c2410c', name: 'Dark Orange' }, { color: '#a16207', name: 'Dark Yellow' }, { color: '#15803d', name: 'Dark Green' },
  { color: '#0f766e', name: 'Dark Teal' }, { color: '#1d4ed8', name: 'Dark Blue' }, { color: '#6d28d9', name: 'Dark Violet' }, { color: '#be185d', name: 'Dark Pink' },
  { color: '#7f1d1d', name: 'Deep Red' }, { color: '#7c2d12', name: 'Ember' }, { color: '#713f12', name: 'Gold' }, { color: '#14532d', name: 'Forest' },
  { color: '#134e4a', name: 'Deep Teal' }, { color: '#1e3a8a', name: 'Navy' }, { color: '#4c1d95', name: 'Deep Violet' }, { color: '#831843', name: 'Deep Pink' },
  { color: '#fca5a5', name: 'Light Red' }, { color: '#fdba74', name: 'Light Orange' }, { color: '#fde68a', name: 'Light Yellow' }, { color: '#86efac', name: 'Light Green' },
  { color: '#5eead4', name: 'Light Teal' }, { color: '#93c5fd', name: 'Light Blue' }, { color: '#c4b5fd', name: 'Light Violet' }, { color: '#f9a8d4', name: 'Light Pink' },
  { color: '#f5f5f5', name: 'White' }, { color: '#d4d4d4', name: 'Light Gray' }, { color: '#a3a3a3', name: 'Gray' }, { color: '#737373', name: 'Mid Gray' },
  { color: '#525252', name: 'Dark Gray' }, { color: '#404040', name: 'Darker Gray' }, { color: '#262626', name: 'Near Black' }, { color: '#171717', name: 'Black' },
  { color: '#1a1810', name: 'Warm Black' }, { color: '#1c1917', name: 'Warm Dark' }, { color: '#1a1a2e', name: 'Deep' }, { color: '#0f172a', name: 'Void' },
  { color: '#1e1b4b', name: 'Midnight' }, { color: '#0c4a6e', name: 'Ocean' }, { color: '#14532d', name: 'Pine' }, { color: '#1f2937', name: 'Slate' },
].map((bg, i) => ({ id: `d-bg-${i}`, name: bg.name, description: '', category: 'background', price: 0, rarity: 'common', assetData: { color: bg.color }, isDefault: true }));

const DEFAULT_FRAME_ITEMS: ShopItem[] = [
  { style: 'none', name: 'None' }, { style: 'silver', name: 'Silver' },
  { style: 'gold', name: 'Gold' }, { style: 'diamond', name: 'Diamond' },
  { style: 'fire', name: 'Fire' }, { style: 'electric', name: 'Electric' },
  { style: 'legendary', name: 'Legendary' }, { style: 'pirate', name: 'Pirate' },
].map((f, i) => ({ id: `d-frame-${i}`, name: f.name, description: '', category: 'frame', price: 0, rarity: 'common', assetData: { style: f.style }, isDefault: true }));

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
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
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Privacy state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Notification preferences state
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    daily_rewards: true,
    events: true,
    leaderboard: true,
    social: true,
    store: true,
  });
  const [savingNotif, setSavingNotif] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm1' | 'confirm2'>('confirm1');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadPlayerData = useCallback(async () => {
    setLoading(true);
    try {
      // Load store config for currency name
      fetch(`/api/store-config?t=${Date.now()}`).then(r => r.ok ? r.json() : null).then(cfg => {
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
              id: data.player_id,
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
              isStaff: data.isStaff || false,
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

  const loadNotifPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/player/notification-preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.prefs) setNotifPrefs(data.prefs);
      }
    } catch (err) {
      console.error('Error loading notification prefs:', err);
    }
  }, []);

  const saveNotifPrefs = async () => {
    setSavingNotif(true);
    try {
      const res = await fetch('/api/player/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifPrefs),
      });
      if (res.ok) setShowNotifModal(false);
    } catch (err) {
      console.error('Error saving notification prefs:', err);
    } finally {
      setSavingNotif(false);
    }
  };

  const loadPrivacySettings = useCallback(async () => {
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
  }, []);

  const savePrivacySettings = async () => {
    setSavingPrivacy(true);
    try {
      const res = await fetch('/api/player/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(privacySettings),
      });
      if (res.ok) {
        setShowPrivacyModal(false);
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteStep('confirm1');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/player/delete', { method: 'DELETE' });
      const data = await res.json().catch(() => ({})) as Record<string, string>;

      if (res.ok && data.success) {
        setShowDeleteModal(false);
        await signOut({ redirectUrl: '/' });
        return;
      }

      if (data.error === 'staff_active') {
        setDeleteError(
          data.message ||
          'Your account has active staff permissions. Ask your network administrator to remove your staff role before deleting your account.'
        );
        return;
      }

      if (data.error === 'deletion_in_progress') {
        setDeleteError('Account deletion is already in progress. Please try again later.');
        return;
      }

      setDeleteError('Account deletion failed. Please contact support.');
    } catch {
      setDeleteError('Account deletion failed. Please contact support.');
    } finally {
      setDeletingAccount(false);
    }
  };

  useEffect(() => {
    setIsDarkMode(localStorage.getItem('theme') !== 'light');
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      loadPlayerData();
      loadFavoriteGames();
      loadReferralStats();
      loadPrivacySettings();
      loadNotifPrefs();
    }
  }, [isLoaded, user, loadPlayerData, loadFavoriteGames, loadReferralStats, loadPrivacySettings, loadNotifPrefs]);

  const saveAvatar = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/player/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempAvatar),
      });

      const data = await res.json();
      if (res.ok) {
        const saved: AvatarConfig = data.avatarConfig ?? tempAvatar;
        setPlayerData(prev => prev ? { ...prev, avatarConfig: saved } : null);
        setTempAvatar(saved);
        setEditingAvatar(false);
        alert('✅ Avatar saved!');
      } else {
        alert('Failed to save avatar: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  const [photoUploading, setPhotoUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected after an error
    e.target.value = '';
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/player/avatar-photo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert('Photo upload failed: ' + (data.error || 'Unknown error'));
        return;
      }
      setTempAvatar(prev => ({
        ...prev,
        photo_url: data.photo_url,
        previous_photo_url: data.previous_photo_url ?? null,
      }));
    } catch {
      alert('Photo upload failed. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRevertPhoto = async () => {
    setPhotoUploading(true);
    try {
      const res = await fetch('/api/player/avatar-photo', { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) {
        alert('Revert failed: ' + (data.error || 'Unknown error'));
        return;
      }
      setTempAvatar(prev => ({
        ...prev,
        photo_url: data.photo_url,
        previous_photo_url: data.previous_photo_url ?? null,
      }));
    } catch {
      alert('Revert failed. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoUploading(true);
    try {
      const res = await fetch('/api/player/avatar-photo', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert('Remove failed: ' + (data.error || 'Unknown error'));
        return;
      }
      setTempAvatar(prev => ({ ...prev, photo_url: null, previous_photo_url: null }));
    } catch {
      alert('Remove failed. Please try again.');
    } finally {
      setPhotoUploading(false);
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
        if (typeof window !== 'undefined') localStorage.setItem('hxp_done_games', 'true');
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
          <div className="absolute bottom-0 right-0 bg-accent w-7 h-7 rounded-full flex items-center justify-center border-2 border-surface">
            <span className="text-xs">✏️</span>
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

  const NotifToggle = ({ icon, label, description, value, onChange }: {
    icon: string; label: string; description: string; value: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="bg-elevated/50 rounded-xl p-4 flex items-center justify-between border border-border-token">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <span className="text-primary text-sm font-medium">{label}</span>
          <div className="text-secondary text-xs">{description}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-accent' : 'bg-elevated border border-border-strong'}`}
      >
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const NotificationsModal = () => (
    <div className="fixed inset-0 bg-base z-50 flex flex-col">
      <div className="p-4 border-b border-border-token flex items-center justify-between bg-surface">
        <button type="button" onClick={() => setShowNotifModal(false)} className="text-secondary hover:text-primary transition-colors">
          ← Back
        </button>
        <h2 className="text-primary font-bold">Notifications</h2>
        <div className="w-12" />
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3 bg-base">
        <p className="text-secondary text-sm pb-1">Choose what you want to hear about. You can change these any time.</p>

        <NotifToggle
          icon="🎰"
          label="Daily & Rewards"
          description="Daily spin ready, XP earned, achievements unlocked"
          value={notifPrefs.daily_rewards}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, daily_rewards: v }))}
        />
        <NotifToggle
          icon="📅"
          label="Events"
          description="New events announced, reminders 2h before, post-event recap"
          value={notifPrefs.events}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, events: v }))}
        />
        <NotifToggle
          icon="🏆"
          label="Leaderboard"
          description="Rank changes, Emperor dethroned, Bounty Hunter Night alerts"
          value={notifPrefs.leaderboard}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, leaderboard: v }))}
        />
        <NotifToggle
          icon="👥"
          label="Social"
          description="Friend requests, referral bonuses when friends attend events"
          value={notifPrefs.social}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, social: v }))}
        />
        <NotifToggle
          icon="🛍️"
          label="Store"
          description="New Prize Wall items, pass expiring soon"
          value={notifPrefs.store}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, store: v }))}
        />

        <div className="pt-4 pb-8">
          <button
            type="button"
            onClick={saveNotifPrefs}
            disabled={savingNotif}
            className="w-full py-4 rounded-xl bg-accent text-white font-bold text-base disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {savingNotif ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );

  const ToggleSetting = ({ icon, label, description, value, onChange }: {
    icon: string; label: string; description: string; value: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="bg-elevated/50 rounded-xl p-4 flex items-center justify-between border border-border-token">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <span className="text-primary text-sm">{label}</span>
          <div className="text-secondary text-xs">{description}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors relative ${value ? 'bg-accent' : 'bg-elevated'}`}
      >
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const PrivacySettingsModal = () => (
    <div className="fixed inset-0 bg-base z-50 flex flex-col">
      <div className="p-4 border-b border-border-token flex items-center justify-between bg-surface">
        <button type="button" onClick={() => setShowPrivacyModal(false)} className="text-secondary hover:text-primary transition-colors">
          ← Back
        </button>
        <h2 className="text-primary font-bold">Privacy Settings</h2>
        <div className="w-12" />
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-6 bg-base">
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="font-bold text-primary">Your Safety Matters</div>
              <div className="text-secondary text-sm mt-1">Control who can see your profile, find you in search, and contact you.</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-primary mb-3">👁️ Profile Visibility</h3>
          <div className="space-y-2">
            {privacyOptions.profileVisibility.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPrivacySettings((prev) => ({ ...prev, profileVisibility: opt.id as PrivacySettings['profileVisibility'] }))}
                className={`w-full p-4 rounded-xl flex items-center justify-between ${
                  privacySettings.profileVisibility === opt.id
                    ? 'bg-accent/10 border-2 border-accent'
                    : 'bg-elevated/50 border-2 border-transparent hover:border-border-token'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left">
                    <div className="text-primary font-medium">{opt.label}</div>
                    <div className="text-secondary text-sm">{opt.description}</div>
                  </div>
                </div>
                {privacySettings.profileVisibility === opt.id && <span className="text-accent">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-primary mb-3">🏆 Leaderboard</h3>
          <ToggleSetting
            icon="🎭"
            label="Show as Anonymous"
            description="Hide your name on leaderboard (rank still visible)"
            value={privacySettings.showAsAnonymous}
            onChange={(v) => setPrivacySettings((prev) => ({ ...prev, showAsAnonymous: v }))}
          />
        </div>

        <div>
          <h3 className="font-bold text-primary mb-3">🔍 Discovery</h3>
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

        <div className="pt-4 pb-8">
          <button
            type="button"
            onClick={savePrivacySettings}
            disabled={savingPrivacy}
            className="w-full py-4 rounded-xl bg-accent text-white font-bold text-base disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {savingPrivacy ? 'Saving...' : '💾 Save Privacy Settings'}
          </button>
        </div>
      </div>
    </div>
  );

  // Avatar Editor Modal
  const AvatarEditorModal = () => (
    <div className="fixed inset-0 bg-base z-50 flex flex-col">
      <div className="p-4 border-b border-border-token flex items-center justify-between bg-surface">
        <button
          type="button"
          disabled={photoUploading}
          onClick={() => {
            setTempAvatar(playerData?.avatarConfig || defaultAvatarConfig);
            setEditingAvatar(false);
          }}
          className="text-secondary hover:text-primary transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <h2 className="text-primary font-bold">Edit Avatar</h2>
        <button
          type="button"
          onClick={saveAvatar}
          disabled={saving || photoUploading}
          className="text-accent font-bold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Preview */}
      <div className="p-8 flex justify-center bg-surface border-b border-border-token">
        <AvatarPreview config={tempAvatar} size="xl" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-token bg-surface">
        {[
          { id: 'photo', label: '📷', name: 'Photo' },
          { id: 'base', label: '😎', name: 'Base' },
          { id: 'background', label: '🎨', name: 'BG' },
          { id: 'frame', label: '✨', name: 'Frame' },
          { id: 'badge', label: '🏷️', name: 'Badge' },
        ].map(tab => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs transition-colors ${
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="text-lg">{tab.label}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-base">
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
              disabled={photoUploading}
              className="w-full p-6 border-2 border-dashed border-border-token rounded-xl text-center hover:border-accent transition-colors bg-elevated/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-4xl mb-2">{photoUploading ? '⏳' : '📷'}</div>
              <div className="text-primary font-medium">{photoUploading ? 'Uploading…' : 'Upload Photo'}</div>
              <div className="text-secondary text-sm">Tap to select an image (max 2 MB)</div>
            </button>
            {tempAvatar.previous_photo_url && !photoUploading && (
              <button
                type="button"
                onClick={handleRevertPhoto}
                className="w-full p-3 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-500/30 text-sm"
              >
                ↩ Revert to previous photo
              </button>
            )}
            {tempAvatar.photo_url && (
              <button
                type="button"
                disabled={photoUploading}
                onClick={() => void handleRemovePhoto()}
                className="w-full p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 disabled:opacity-50"
              >
                Remove Photo
              </button>
            )}
          </div>
        )}
        
        {activeTab === 'base' && (
          <div className="grid grid-cols-4 gap-3">
            {[...DEFAULT_BASE_ITEMS, ...(ownedItems.base || []).filter(i => !DEFAULT_BASE_ITEMS.some(d => d.assetData?.emoji === i.assetData?.emoji))].map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {activeTab === 'background' && (
          <div className="grid grid-cols-4 gap-3">
            {[...DEFAULT_BG_ITEMS, ...(ownedItems.background || []).filter(i => !DEFAULT_BG_ITEMS.some(d => d.assetData?.color === i.assetData?.color))].map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {activeTab === 'frame' && (
          <div className="grid grid-cols-4 gap-3">
            {[...DEFAULT_FRAME_ITEMS, ...(ownedItems.frame || []).filter(i => !DEFAULT_FRAME_ITEMS.some(d => d.assetData?.style === i.assetData?.style))].map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {activeTab === 'badge' && (
          <div className="grid grid-cols-4 gap-3">
            {(ownedItems.badge || []).length === 0 ? (
              <div className="col-span-4 text-center py-8 text-secondary text-sm">
                Earn badges by participating in events and achievements.
              </div>
            ) : (ownedItems.badge || []).map(item => (
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
          />
          <h1 className="text-primary text-2xl font-bold mt-4">{playerData.displayName}</h1>
          <div className="text-secondary font-mono text-sm">{playerData.id}</div>

          <button
            type="button"
            onClick={() => { setTempAvatar(playerData.avatarConfig); setEditingAvatar(true); }}
            className="mt-3 px-4 py-1.5 rounded-full bg-elevated border border-border-token text-secondary text-sm hover:text-primary hover:border-border-strong transition-colors"
          >
            Edit Avatar
          </button>

          {/* Status Badge */}
          <button
            type="button"
            onClick={() => setStatusModalOpen(true)}
            className="mt-2"
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
            <div className="text-2xl mb-1">
              {storeConfig.currency_icon.startsWith('http')
                ? <img src={storeConfig.currency_icon} alt="" className="w-7 h-7 object-contain mx-auto" />
                : storeConfig.currency_icon}
            </div>
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
                  <span>They attend their first event → You get <span className="text-purple-400">+50 XP + 10 Points</span></span>
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

      {/* Sign Out */}
      <div className="px-4 mt-8">
        <button
          type="button"
          onClick={() => signOut({ redirectUrl: '/' })}
          className="w-full py-3 rounded-xl border border-border-token text-secondary hover:text-primary hover:border-border-token/80 font-medium text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Danger Zone */}
      <div className="px-4 mt-6 mb-6">
        <div className="border-t border-red-500/20 pt-6">
          <h2 className="text-xs font-bold text-secondary/60 uppercase tracking-widest mb-3">
            Danger Zone
          </h2>
          <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-primary text-sm font-medium">Delete Account</div>
                <div className="text-secondary text-xs mt-0.5">
                  Permanently delete your account and all data
                </div>
              </div>
              <button
                type="button"
                onClick={openDeleteModal}
                className="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 font-semibold text-sm hover:bg-red-500/25 transition-colors flex-shrink-0 ml-4"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="px-4 mt-6 mb-6">
        <h2 className="font-bold text-primary flex items-center gap-2 mb-3">
          <span className="text-xl">⚙️</span> Settings
        </h2>
        <div className="space-y-2">
          {/* Theme */}
          <div className="bg-elevated/50 rounded-xl p-4 flex items-center justify-between border border-border-token">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎨</span>
              <div>
                <div className="text-primary text-sm font-medium">Theme</div>
                <div className="text-tertiary text-xs">{isDarkMode ? 'Dark mode' : 'Light mode'}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = isDarkMode ? 'light' : 'dark';
                const tone = next === 'light' ? 'paper' : 'warm';
                localStorage.setItem('theme', next);
                localStorage.setItem('tone', tone);
                document.documentElement.setAttribute('data-tone', tone);
                setIsDarkMode(!isDarkMode);
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-accent' : 'bg-border-strong'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                isDarkMode ? 'left-1' : 'left-7'
              }`} />
            </button>
          </div>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setShowNotifModal(true)}
            className="w-full bg-elevated/50 rounded-xl p-4 flex items-center justify-between border border-border-token hover:border-border-strong transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <div className="text-left">
                <div className="text-primary text-sm font-medium">Notifications</div>
                <div className="text-tertiary text-xs">Event reminders & XP alerts</div>
              </div>
            </div>
            <span className="text-secondary text-sm">›</span>
          </button>

          {/* Privacy */}
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="w-full bg-elevated/50 rounded-xl p-4 flex items-center justify-between border border-border-token hover:border-border-strong transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🛡️</span>
              <div className="text-left">
                <div className="text-primary text-sm font-medium">Privacy</div>
                <div className="text-tertiary text-xs">Leaderboard & profile visibility</div>
              </div>
            </div>
            <span className="text-secondary text-sm">›</span>
          </button>

          {/* Staff-only HQ link */}
          {playerData.isStaff && (
            <a
              href="/hq"
              className="w-full bg-accent/10 rounded-xl p-4 flex items-center justify-between border border-accent/30 hover:bg-accent/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">⚔️</span>
                <div className="text-left">
                  <div className="text-accent text-sm font-medium">Staff HQ</div>
                  <div className="text-tertiary text-xs">Player management & admin</div>
                </div>
              </div>
              <span className="text-accent text-sm">›</span>
            </a>
          )}
        </div>
      </div>

      {/* Notifications Modal */}
      {showNotifModal && <NotificationsModal />}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && <PrivacySettingsModal />}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-sm border border-border-token overflow-hidden">
            <div className="p-5 border-b border-border-token">
              <h2 className="text-primary font-bold text-lg">
                {deleteStep === 'confirm1' ? 'Delete your account?' : 'Are you absolutely sure?'}
              </h2>
            </div>
            <div className="p-5">
              {deleteStep === 'confirm1' ? (
                <p className="text-secondary text-sm">
                  This will permanently delete your Player Pass account, XP history, and all associated data.
                  This cannot be undone.
                </p>
              ) : (
                <p className="text-secondary text-sm">
                  Your account will be permanently deleted immediately. There is no recovery or grace period.
                </p>
              )}

              {deleteError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{deleteError}</p>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteError(null);
                  }}
                  disabled={deletingAccount}
                  className="flex-1 py-3 rounded-xl bg-elevated border border-border-token text-secondary font-medium text-sm hover:text-primary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                {deleteStep === 'confirm1' ? (
                  <button
                    type="button"
                    onClick={() => setDeleteStep('confirm2')}
                    className="flex-1 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 font-semibold text-sm hover:bg-red-500/25 transition-colors"
                  >
                    Yes, Delete Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleDeleteAccount()}
                    disabled={deletingAccount}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deletingAccount ? 'Deleting...' : 'Delete permanently'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
