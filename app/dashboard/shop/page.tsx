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
  const [activeCategory, setActiveCategory] = useState('base');
  const [gems, setGems] = useState(0);
  const [shopItems, setShopItems] = useState<Record<string, ShopItem[]>>({});
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

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

      // Load inventory to check what's owned
      const invRes = await fetch('/api/player/inventory');
      if (invRes.ok) {
        const invData = await invRes.json();
        setGems(invData.gems || 0);
        
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

  const isOwned = (item: ShopItem) => item.isDefault || ownedIds.has(item.id);

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
            <div>
              <h1 className="text-xl font-bold text-white">Shop</h1>
              <p className="text-slate-400 text-sm">Buy cosmetics for your avatar</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full">
              <span className="text-xl">💎</span>
              <span className="text-white font-bold">{gems.toLocaleString()}</span>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shop Items */}
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

      {/* Tip */}
      <div className="p-4 pt-0">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
          <p className="text-slate-400 text-sm">
            💡 Go to <span className="text-cyan-400">Profile</span> to customize your avatar with purchased items
          </p>
        </div>
      </div>
    </div>
  );
}
