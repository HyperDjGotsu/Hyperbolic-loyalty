'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

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

const rarityColors: Record<string, { border: string; bg: string; text: string }> = {
  common: { border: 'border-slate-500', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  uncommon: { border: 'border-green-500', bg: 'bg-green-500/20', text: 'text-green-400' },
  rare: { border: 'border-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  legendary: { border: 'border-yellow-500', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
};

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

export default function ShopPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'shop' | 'customize'>('shop');
  const [activeCategory, setActiveCategory] = useState('base');
  const [gems, setGems] = useState(0);
  const [shopItems, setShopItems] = useState<Record<string, ShopItem[]>>({});
  const [ownedItems, setOwnedItems] = useState<Record<string, ShopItem[]>>({});
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    base: '😎',
    background: '#3b82f6',
    frame: 'none',
    badge: null,
    photo_url: null,
  });
  const [tempAvatar, setTempAvatar] = useState<AvatarConfig>(avatarConfig);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = [
    { id: 'base', name: 'Base', icon: '😎' },
    { id: 'background', name: 'Background', icon: '🎨' },
    { id: 'frame', name: 'Frame', icon: '✨' },
    { id: 'badge', name: 'Badge', icon: '🏷️' },
    { id: 'title', name: 'Title', icon: '📛' },
  ];

  const loadShopData = useCallback(async () => {
    setLoading(true);
    try {
      // Load shop items
      const shopRes = await fetch('/api/shop');
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        setShopItems(shopData.grouped || {});
      }

      // Load inventory
      const invRes = await fetch('/api/player/inventory');
      if (invRes.ok) {
        const invData = await invRes.json();
        setGems(invData.gems || 0);
        setOwnedItems(invData.grouped || {});
        const loadedConfig = invData.avatarConfig || avatarConfig;
        setAvatarConfig(loadedConfig);
        setTempAvatar(loadedConfig);
        
        // Build owned IDs set
        const owned = new Set<string>();
        invData.items?.forEach((item: ShopItem) => owned.add(item.id));
        setOwnedIds(owned);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      loadShopData();
    }
  }, [isLoaded, user, loadShopData]);

  const purchaseItem = async (item: ShopItem) => {
    if (ownedIds.has(item.id) || item.isDefault) return;
    if (gems < item.price) {
      alert('Not enough gems!');
      return;
    }

    setPurchasing(item.id);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });

      const data = await res.json();
      if (res.ok) {
        setGems(data.newBalance);
        setOwnedIds(prev => new Set(prev).add(item.id));
        // Add to owned items
        setOwnedItems(prev => ({
          ...prev,
          [item.category]: [...(prev[item.category] || []), item],
        }));
        alert(`🎉 Purchased ${item.name}!`);
      } else {
        alert(data.error || 'Failed to purchase');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to purchase item');
    } finally {
      setPurchasing(null);
    }
  };

  const saveAvatar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Starting save...', tempAvatar);
    setSaving(true);
    
    try {
      const res = await fetch('/api/player/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempAvatar),
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (res.ok) {
        setAvatarConfig(tempAvatar);
        alert('✅ Avatar saved!');
      } else {
        alert('Failed to save avatar: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save avatar: ' + String(error));
    } finally {
      setSaving(false);
    }
  };

  const isOwned = (item: ShopItem) => item.isDefault || ownedIds.has(item.id);

  const AvatarPreview = ({ config, size = 'lg' }: { config: AvatarConfig; size?: 'sm' | 'lg' }) => {
    const sizeClass = size === 'lg' ? 'w-24 h-24 text-4xl' : 'w-12 h-12 text-xl';
    const frameClass = frameStyles[config.frame] || 'border-transparent';
    
    return (
      <div className="relative inline-block">
        <div 
          className={`${sizeClass} rounded-full flex items-center justify-center border-4 ${frameClass}`}
          style={{ backgroundColor: config.background }}
        >
          {config.photo_url ? (
            <img src={config.photo_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            config.base
          )}
        </div>
        {config.badge && (
          <div className="absolute -bottom-1 -right-1 text-lg bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center border border-slate-700">
            {config.badge}
          </div>
        )}
      </div>
    );
  };

  const ShopItemCard = ({ item }: { item: ShopItem }) => {
    const owned = isOwned(item);
    const rarity = rarityColors[item.rarity] || rarityColors.common;
    
    return (
      <button
        type="button"
        onClick={() => !owned && purchaseItem(item)}
        disabled={owned || purchasing === item.id}
        className={`relative p-3 rounded-xl border-2 ${rarity.border} ${rarity.bg} text-left transition-all ${
          owned ? 'opacity-60' : 'hover:scale-105 active:scale-95'
        }`}
      >
        {owned && (
          <div className="absolute top-1 right-1 text-green-400 text-xs font-bold">✓ OWNED</div>
        )}
        
        <div className="text-2xl mb-2">
          {item.category === 'base' && item.assetData?.emoji}
          {item.category === 'badge' && item.assetData?.emoji}
          {item.category === 'background' && (
            <div 
              className="w-8 h-8 rounded-full border-2 border-white/30"
              style={{ backgroundColor: item.assetData?.color }}
            />
          )}
          {item.category === 'frame' && (
            <div className={`w-8 h-8 rounded-full border-4 ${frameStyles[item.assetData?.style] || ''} bg-slate-700`} />
          )}
          {item.category === 'title' && '📛'}
        </div>
        
        <div className="text-white font-semibold text-sm">{item.name}</div>
        <div className="text-slate-400 text-xs mt-0.5">{item.description}</div>
        
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs uppercase ${rarity.text}`}>{item.rarity}</span>
          {!owned && (
            <span className="text-white font-bold text-sm flex items-center gap-1">
              {item.price} 💎
            </span>
          )}
        </div>
        
        {purchasing === item.id && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <span className="text-white animate-pulse">Buying...</span>
          </div>
        )}
      </button>
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
        // Toggle badge off if already selected
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
        <div className="text-white text-xs mt-1 text-center">{item.name}</div>
        {isSelected && <div className="text-cyan-400 text-xs mt-0.5">✓</div>}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">🛍️</div>
          <div className="text-slate-400">Loading shop...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">Shop</h1>
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full">
              <span className="text-xl">💎</span>
              <span className="text-white font-bold">{gems.toLocaleString()}</span>
            </div>
          </div>

          {/* Main tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('shop')}
              className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'shop'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🛍️ Buy Items
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customize')}
              className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'customize'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              ✨ Customize
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {categories.map(cat => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shop Tab */}
      {activeTab === 'shop' && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {(shopItems[activeCategory] || []).map(item => (
              <ShopItemCard key={item.id} item={item} />
            ))}
          </div>
          
          {(!shopItems[activeCategory] || shopItems[activeCategory].length === 0) && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏪</div>
              <div className="text-slate-400">No items in this category</div>
            </div>
          )}
        </div>
      )}

      {/* Customize Tab */}
      {activeTab === 'customize' && (
        <div className="p-4">
          {/* Avatar Preview */}
          <div className="bg-slate-800/50 rounded-xl p-6 mb-4 border border-slate-700/50">
            <div className="flex items-center justify-center mb-4">
              <AvatarPreview config={tempAvatar} size="lg" />
            </div>
            <div className="text-center text-slate-400 text-sm mb-4">
              Preview your changes
            </div>
            <button
              type="button"
              onClick={saveAvatar}
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Avatar'}
            </button>
          </div>

          {/* Owned items in current category */}
          <div className="mb-2 text-slate-400 text-sm">
            Your {categories.find(c => c.id === activeCategory)?.name} Options
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {activeCategory === 'badge' && (
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
            )}
            {(ownedItems[activeCategory] || []).map(item => (
              <CustomizeItemCard key={item.id} item={item} />
            ))}
          </div>

          {(!ownedItems[activeCategory] || ownedItems[activeCategory].length === 0) && activeCategory !== 'badge' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📦</div>
              <div className="text-slate-400">No items owned in this category</div>
              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className="mt-2 text-cyan-400 text-sm"
              >
                Browse shop →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
