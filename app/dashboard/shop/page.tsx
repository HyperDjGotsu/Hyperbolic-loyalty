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

interface ShopCategory {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

interface StoreConfig {
  currency_name: string;
  currency_icon: string;
  shop_title: string;
  shop_description: string;
  shop_categories: ShopCategory[];
}

function IconRenderer({ value, className }: { value: string; className?: string }) {
  if (value.startsWith('http')) {
    return <img src={value} alt="icon" className={className || 'w-5 h-5 object-contain'} />;
  }
  return <span className={className}>{value}</span>;
}

const DEFAULT_CATEGORIES: ShopCategory[] = [
  { id: 'base', name: 'Base', icon: '😎', enabled: true },
  { id: 'background', name: 'Background', icon: '🎨', enabled: true },
  { id: 'frame', name: 'Frame', icon: '✨', enabled: true },
  { id: 'badge', name: 'Badge', icon: '🏷️', enabled: true },
  { id: 'title', name: 'Title', icon: '📛', enabled: true },
];

const rarityColors: Record<string, { border: string; bg: string; text: string }> = {
  common: { border: 'border-border-token', bg: 'bg-elevated/50', text: 'text-secondary' },
  uncommon: { border: 'border-green-500', bg: 'bg-green-500/20', text: 'text-green-400' },
  rare: { border: 'border-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  legendary: { border: 'border-yellow-500', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
};

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

export default function ShopPage() {
  const { user, isLoaded } = useUser();
  const [balance, setBalance] = useState(0);
  const [shopItems, setShopItems] = useState<Record<string, ShopItem[]>>({});
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    currency_name: 'Points',
    currency_icon: '⭐',
    shop_title: 'Prize Wall',
    shop_description: 'avatar cosmetics',
    shop_categories: DEFAULT_CATEGORIES,
  });
  const [activeCategory, setActiveCategory] = useState('');

  const visibleCategories = (storeConfig.shop_categories ?? DEFAULT_CATEGORIES).filter(c => c.enabled);

  const loadShopData = useCallback(async () => {
    setLoading(true);
    try {
      const [shopRes, invRes, configRes] = await Promise.all([
        fetch('/api/shop'),
        fetch('/api/player/inventory'),
        fetch('/api/store-config'),
      ]);

      if (shopRes.ok) {
        const shopData = await shopRes.json();
        setShopItems(shopData.grouped || {});
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setBalance(invData.gems || 0);
        const owned = new Set<string>();
        invData.items?.forEach((item: ShopItem) => owned.add(item.id));
        setOwnedIds(owned);
      }

      if (configRes.ok) {
        const config = await configRes.json();
        const categories: ShopCategory[] = config.shop_categories ?? DEFAULT_CATEGORIES;
        setStoreConfig({ ...config, shop_categories: categories });
        // Set initial active tab to first enabled category
        const firstEnabled = categories.find(c => c.enabled);
        if (firstEnabled) setActiveCategory(firstEnabled.id);
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
    if (balance < item.price) {
      alert(`Not enough ${storeConfig.currency_name}!`);
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
        setBalance(data.newBalance);
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
              className="w-8 h-8 rounded-full border-2 border-border-strong"
              style={{ backgroundColor: item.assetData?.color }}
            />
          )}
          {item.category === 'frame' && (
            <div className={`w-8 h-8 rounded-full border-4 ${frameStyles[item.assetData?.style] || ''} bg-elevated`} />
          )}
          {item.category === 'title' && '📛'}
        </div>

        <div className="text-primary font-semibold text-sm">{item.name}</div>
        <div className="text-secondary text-xs mt-0.5">{item.description}</div>

        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs uppercase ${rarity.text}`}>{item.rarity}</span>
          {!owned && (
            <span className="text-primary font-bold text-sm flex items-center gap-1">
              {item.price} <IconRenderer value={storeConfig.currency_icon} className="w-4 h-4 object-contain" />
            </span>
          )}
        </div>

        {purchasing === item.id && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <span className="text-primary animate-pulse">Buying...</span>
          </div>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🛍️</div>
          <div className="text-secondary">Loading shop...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border-token">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-primary">{storeConfig.shop_title}</h1>
              <p className="text-secondary text-sm">
                Spend your {storeConfig.currency_name} on {storeConfig.shop_description}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-elevated px-4 py-2 rounded-full">
              <IconRenderer value={storeConfig.currency_icon} className="w-6 h-6 object-contain text-xl" />
              <span className="text-primary font-bold">{balance.toLocaleString()}</span>
              <span className="text-secondary text-sm">{storeConfig.currency_name}</span>
            </div>
          </div>

          {/* Category tabs — only enabled ones */}
          {visibleCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleCategories.map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-accent text-primary'
                      : 'bg-elevated text-secondary hover:bg-elevated'
                  }`}
                >
                  <IconRenderer value={cat.icon} className="w-4 h-4 object-contain" />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}
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
            <div className="text-secondary">No items in this category</div>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="p-4 pt-0">
        <div className="bg-elevated/50 rounded-xl p-4 border border-border-token text-center">
          <p className="text-secondary text-sm">
            💡 Go to <span className="text-accent">Profile</span> to customize your avatar with purchased items
          </p>
        </div>
      </div>
    </div>
  );
}
