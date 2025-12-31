'use client';

import React, { useState } from 'react';
import type { ShopItem, ShopCategory } from '@/lib/types';

const shopCategories: ShopCategory[] = [
  { id: 'featured', name: 'Featured', icon: '⭐' },
  { id: 'cosmetics', name: 'Cosmetics', icon: '🎨' },
  { id: 'boosts', name: 'Boosts', icon: '⚡' },
  { id: 'tickets', name: 'Tickets', icon: '🎟️' },
  { id: 'bundles', name: 'Bundles', icon: '📦' },
];

const shopItems: ShopItem[] = [
  // Featured
  { id: 'feat-1', name: 'Pirate King Bundle', category: 'featured', price: 1500, currency: 'gems', icon: '👑', description: 'Exclusive frame + badge + 500 XP', rarity: 'legendary', tag: 'LIMITED', includes: ['Crown Frame', 'Pirate King Badge', '500 XP Boost'] },
  { id: 'feat-2', name: 'Season Pass', category: 'featured', price: 9.99, currency: 'usd', icon: '🏆', description: 'Unlock all season rewards', rarity: 'epic', tag: 'BEST VALUE' },
  { id: 'feat-3', name: 'Starter Pack', category: 'featured', price: 4.99, currency: 'usd', icon: '🎁', description: '500 Gems + 3 Tickets + Bonus XP', rarity: 'rare', tag: 'NEW PLAYER', originalPrice: 9.99 },
  // Cosmetics
  { id: 'cos-1', name: 'Neon Frame', category: 'cosmetics', price: 400, currency: 'gems', icon: '💠', description: 'Animated neon border', rarity: 'epic' },
  { id: 'cos-2', name: 'Fire Badge', category: 'cosmetics', price: 200, currency: 'gems', icon: '🔥', description: 'Show your streak pride', rarity: 'rare' },
  { id: 'cos-3', name: 'Galaxy Background', category: 'cosmetics', price: 350, currency: 'gems', icon: '🌌', description: 'Cosmic avatar background', rarity: 'epic' },
  { id: 'cos-4', name: 'Diamond Frame', category: 'cosmetics', price: 800, currency: 'gems', icon: '💎', description: 'Premium sparkle effect', rarity: 'legendary' },
  // Boosts
  { id: 'boost-1', name: '2x XP (24hr)', category: 'boosts', price: 100, currency: 'gems', icon: '⚡', description: 'Double all XP earned', rarity: 'rare', duration: '24 hours' },
  { id: 'boost-2', name: '2x XP (7 days)', category: 'boosts', price: 500, currency: 'gems', icon: '🚀', description: 'Week-long XP boost', rarity: 'epic', duration: '7 days' },
  { id: 'boost-3', name: 'Streak Shield', category: 'boosts', price: 150, currency: 'gems', icon: '🛡️', description: 'Protect your streak once', rarity: 'rare' },
  // Tickets
  { id: 'tix-1', name: '1 Spin Ticket', category: 'tickets', price: 50, currency: 'gems', icon: '🎟️', description: 'Extra daily spin', rarity: 'common' },
  { id: 'tix-2', name: '5 Spin Bundle', category: 'tickets', price: 200, currency: 'gems', icon: '🎫', description: 'Save 50 gems!', rarity: 'uncommon', originalPrice: 250 },
  // Bundles
  { id: 'bun-1', name: 'Gem Pouch', category: 'bundles', price: 4.99, currency: 'usd', icon: '💰', description: '500 Gems', rarity: 'common', gems: 500 },
  { id: 'bun-2', name: 'Gem Chest', category: 'bundles', price: 9.99, currency: 'usd', icon: '💎', description: '1200 Gems (+20% bonus)', rarity: 'rare', gems: 1200, tag: 'POPULAR' },
  { id: 'bun-3', name: 'Gem Vault', category: 'bundles', price: 24.99, currency: 'usd', icon: '🏦', description: '3500 Gems (+40% bonus)', rarity: 'epic', gems: 3500, tag: 'BEST VALUE' },
];

const rarityBorders: Record<string, string> = {
  common: 'border-slate-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
};

const rarityGlows: Record<string, string> = {
  common: '',
  uncommon: 'shadow-green-500/20',
  rare: 'shadow-blue-500/20',
  epic: 'shadow-purple-500/30',
  legendary: 'shadow-yellow-500/40 shadow-lg',
};

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState('featured');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [playerGems] = useState(1250);
  const [playerTickets] = useState(3);

  const filteredItems = shopItems.filter((item) => item.category === activeCategory);

  const canAfford = (item: ShopItem) => {
    if (item.currency === 'gems') return playerGems >= item.price;
    if (item.currency === 'tickets') return playerTickets >= item.price;
    return true;
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header with currencies */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white font-orbitron">Shop</h1>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full">
                <span>💎</span>
                <span className="text-white font-bold">{playerGems.toLocaleString()}</span>
                <button className="ml-1 w-5 h-5 bg-green-500 rounded-full text-xs text-white font-bold">
                  +
                </button>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full">
                <span>🎟️</span>
                <span className="text-white font-bold">{playerTickets}</span>
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {shopCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
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

      {/* Items grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const affordable = canAfford(item);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`relative bg-slate-800/50 rounded-xl p-3 border-2 ${
                  rarityBorders[item.rarity]
                } ${rarityGlows[item.rarity]} text-left transition-transform hover:scale-105 active:scale-95`}
              >
                {item.tag && (
                  <div
                    className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                      item.tag === 'LIMITED'
                        ? 'bg-red-500 text-white'
                        : item.tag === 'BEST VALUE'
                        ? 'bg-green-500 text-white'
                        : item.tag === 'NEW PLAYER'
                        ? 'bg-cyan-500 text-white'
                        : item.tag === 'POPULAR'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-600 text-white'
                    }`}
                  >
                    {item.tag}
                  </div>
                )}
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="text-white font-semibold text-sm leading-tight">{item.name}</div>
                <div className="text-slate-500 text-xs mt-1 line-clamp-2">{item.description}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {item.originalPrice && (
                      <span className="text-slate-500 text-xs line-through">
                        {item.currency === 'usd' ? `$${item.originalPrice}` : item.originalPrice}
                      </span>
                    )}
                    <span
                      className={`font-bold ${
                        affordable || item.currency === 'usd' ? 'text-white' : 'text-red-400'
                      }`}
                    >
                      {item.currency === 'usd' ? `$${item.price}` : item.price}
                    </span>
                    {item.currency === 'gems' && <span className="text-sm">💎</span>}
                    {item.currency === 'tickets' && <span className="text-sm">🎟️</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Item detail modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden border border-slate-700 animate-slide-up">
            <div
              className={`p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-b-2 ${
                rarityBorders[selectedItem.rarity]
              }`}
            >
              <div className="text-center">
                <div className="text-6xl mb-3">{selectedItem.icon}</div>
                <h2 className="text-xl font-bold text-white">{selectedItem.name}</h2>
                <div
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                    selectedItem.rarity === 'legendary'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : selectedItem.rarity === 'epic'
                      ? 'bg-purple-500/20 text-purple-400'
                      : selectedItem.rarity === 'rare'
                      ? 'bg-blue-500/20 text-blue-400'
                      : selectedItem.rarity === 'uncommon'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {selectedItem.rarity}
                </div>
              </div>
            </div>

            <div className="p-4">
              <p className="text-slate-300 text-center mb-4">{selectedItem.description}</p>

              {selectedItem.includes && (
                <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
                  <div className="text-slate-500 text-xs mb-2">INCLUDES:</div>
                  {selectedItem.includes.map((inc, i) => (
                    <div key={i} className="text-white text-sm flex items-center gap-2">
                      <span className="text-green-400">✓</span> {inc}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between bg-slate-800 rounded-xl p-3 mb-4">
                <div>
                  <div className="text-slate-500 text-xs">Price</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      {selectedItem.currency === 'usd'
                        ? `$${selectedItem.price}`
                        : selectedItem.price}
                    </span>
                    {selectedItem.currency === 'gems' && <span className="text-xl">💎</span>}
                    {selectedItem.currency === 'tickets' && <span className="text-xl">🎟️</span>}
                  </div>
                </div>
              </div>

              <button
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  canAfford(selectedItem) || selectedItem.currency === 'usd'
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {selectedItem.currency === 'usd'
                  ? '💳 Purchase'
                  : canAfford(selectedItem)
                  ? '✨ Buy Now'
                  : '❌ Not Enough'}
              </button>
            </div>

            <div className="p-4 pt-0">
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-3 text-slate-500 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
