'use client';

import { useState, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface CardOfTheDayData {
  name: string;
  game: string;
  gameDisplay: string;
  set: string;
  rarity: string;
  number: string;
  price: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  tcgplayerId: string;
  tcgplayerUrl: string;
  fetchedAt: string;
  cached?: boolean;
}

interface CardImageResponse {
  imageUrl: string | null;
  source: string;
  cached: boolean;
}

// =============================================================================
// THEME CONFIGURATION - Easy to extend for new games
// =============================================================================

interface GameTheme {
  gradient: string;
  accent: string;
  icon: string;
  border: string;
}

const GAME_THEMES: Record<string, GameTheme> = {
  'One Piece': {
    gradient: 'from-red-600/20 to-orange-500/20',
    accent: 'text-red-400',
    icon: '🏴‍☠️',
    border: 'border-red-500/30',
  },
  'Pokémon': {
    gradient: 'from-yellow-500/20 to-amber-500/20',
    accent: 'text-yellow-400',
    icon: '⚡',
    border: 'border-yellow-500/30',
  },
  'Magic: The Gathering': {
    gradient: 'from-purple-600/20 to-indigo-500/20',
    accent: 'text-purple-400',
    icon: '🔮',
    border: 'border-purple-500/30',
  },
  'Disney Lorcana': {
    gradient: 'from-blue-500/20 to-cyan-500/20',
    accent: 'text-blue-400',
    icon: '✨',
    border: 'border-blue-500/30',
  },
  'Digimon': {
    gradient: 'from-orange-500/20 to-yellow-500/20',
    accent: 'text-orange-400',
    icon: '🦖',
    border: 'border-orange-500/30',
  },
  'Dragon Ball Super': {
    gradient: 'from-orange-600/20 to-yellow-400/20',
    accent: 'text-orange-400',
    icon: '🐉',
    border: 'border-orange-500/30',
  },
  'Gundam': {
    gradient: 'from-blue-600/20 to-red-500/20',
    accent: 'text-blue-400',
    icon: '🤖',
    border: 'border-blue-500/30',
  },
  'Hololive': {
    gradient: 'from-cyan-500/20 to-blue-500/20',
    accent: 'text-cyan-400',
    icon: '🎤',
    border: 'border-cyan-500/30',
  },
  'Yu-Gi-Oh!': {
    gradient: 'from-indigo-600/20 to-purple-500/20',
    accent: 'text-indigo-400',
    icon: '🃏',
    border: 'border-indigo-500/30',
  },
  'Union Arena': {
    gradient: 'from-teal-500/20 to-emerald-500/20',
    accent: 'text-teal-400',
    icon: '🏟️',
    border: 'border-teal-500/30',
  },
  'Star Wars Unlimited': {
    gradient: 'from-yellow-500/20 to-black/20',
    accent: 'text-yellow-400',
    icon: '⭐',
    border: 'border-yellow-500/30',
  },
};

const DEFAULT_THEME: GameTheme = {
  gradient: 'from-zinc-700/20 to-zinc-600/20',
  accent: 'text-cyan-400',
  icon: '🎴',
  border: 'border-zinc-700',
};

function getTheme(gameDisplay: string): GameTheme {
  return GAME_THEMES[gameDisplay] || DEFAULT_THEME;
}

// =============================================================================
// HOOKS - Reusable data fetching
// =============================================================================

function useCardOfTheDay() {
  const [card, setCard] = useState<CardOfTheDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCard() {
      try {
        const response = await fetch('/api/card-of-the-day');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch card');
        }

        setCard(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchCard();
  }, []);

  return { card, loading, error };
}

function useCardImage(game: string | undefined, cardNumber: string | undefined, cardName: string | undefined) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!game || (!cardNumber && !cardName)) {
      setImageUrl(null);
      return;
    }

    async function fetchImage() {
      setImageLoading(true);
      setImageError(false);
      
      try {
        const params = new URLSearchParams({ game });
        if (cardNumber) params.set('cardNumber', cardNumber);
        if (cardName) params.set('cardName', cardName);

        const response = await fetch(`/api/card-image?${params.toString()}`);
        
        if (response.ok) {
          const data: CardImageResponse = await response.json();
          setImageUrl(data.imageUrl);
        } else {
          setImageUrl(null);
        }
      } catch {
        setImageUrl(null);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    }

    fetchImage();
  }, [game, cardNumber, cardName]);

  const handleImageError = () => {
    setImageError(true);
    setImageUrl(null);
  };

  return { imageUrl, imageLoading, imageError, handleImageError };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatPriceChange(change: number | null): string | null {
  if (change === null) return null;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function formatPrice(price: number | null): string {
  return price ? `$${price.toFixed(2)}` : 'N/A';
}

// =============================================================================
// DESKTOP COMPONENT - Full card for sidebar
// =============================================================================

export function CardOfTheDay() {
  const { card, loading, error } = useCardOfTheDay();
  const { imageUrl, handleImageError } = useCardImage(
    card?.gameDisplay,
    card?.number,
    card?.name
  );

  if (loading) {
    return <CardOfTheDaySkeleton />;
  }

  if (error || !card) {
    return null; // Silently fail - don't break the dashboard
  }

  const theme = getTheme(card.gameDisplay);
  const priceChange7d = formatPriceChange(card.priceChange7d);
  const priceChange30d = formatPriceChange(card.priceChange30d);
  const isPositive7d = card.priceChange7d !== null && card.priceChange7d >= 0;
  const isPositive30d = card.priceChange30d !== null && card.priceChange30d >= 0;

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden transition-all hover:border-white/10">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{theme.icon}</span>
          <span className="text-[15px] font-semibold">Card of the Day</span>
        </div>
        <span className={`text-xs font-medium ${theme.accent}`}>
          {card.gameDisplay}
        </span>
      </div>

      {/* Card content */}
      <div className={`p-6 bg-gradient-to-br ${theme.gradient}`}>
        <div className="flex gap-4">
          {/* Card image or placeholder */}
          <div className="shrink-0">
            <div className="w-[100px] h-[140px] rounded-lg overflow-hidden bg-[#07070b] shadow-lg">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={card.name}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br ${theme.gradient} border ${theme.border}`}>
                  {theme.icon}
                </div>
              )}
            </div>
          </div>

          {/* Card info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg leading-tight mb-1 line-clamp-2">
              {card.name}
            </h3>
            <p className="text-zinc-500 text-sm mb-4">
              {card.set} • {card.rarity}
            </p>

            {/* Price section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">
                    Market Price
                  </p>
                  <p className="text-white text-2xl font-bold">
                    {formatPrice(card.price)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  {priceChange7d && (
                    <div className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      isPositive7d 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {priceChange7d} <span className="opacity-80">7d</span>
                    </div>
                  )}
                  {priceChange30d && (
                    <div className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      isPositive30d 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {priceChange30d} <span className="opacity-80">30d</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TCGPlayer link */}
        <a
          href={card.tcgplayerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#07070b] hover:bg-[#0d0d12] transition-colors ${theme.accent} text-sm font-medium`}
        >
          View on TCGPlayer
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// =============================================================================
// MOBILE COMPONENT - Compact card with image
// =============================================================================

export function CardOfTheDayCompact() {
  const { card, loading } = useCardOfTheDay();
  const { imageUrl, handleImageError } = useCardImage(
    card?.gameDisplay,
    card?.number,
    card?.name
  );

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-3 animate-pulse border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-14 h-20 bg-slate-700 rounded-lg" />
          <div className="flex-1">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-700 rounded w-1/3" />
          </div>
          <div className="text-right">
            <div className="h-5 bg-slate-700 rounded w-16 mb-1" />
            <div className="h-4 bg-slate-700 rounded w-12" />
          </div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const theme = getTheme(card.gameDisplay);
  const isPositive7d = card.priceChange7d !== null && card.priceChange7d >= 0;

  return (
    <a
      href={card.tcgplayerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 hover:bg-slate-800/70 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Card image or icon */}
        <div className="w-14 h-20 rounded-lg overflow-hidden bg-slate-700 shrink-0 shadow-lg">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={card.name}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br ${theme.gradient} border ${theme.border}`}>
              {theme.icon}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium line-clamp-2 leading-tight">
            {card.name}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Card of the Day
          </p>
          <p className={`text-xs mt-0.5 ${theme.accent}`}>
            {card.gameDisplay}
          </p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-white font-bold text-base">
            {formatPrice(card.price)}
          </p>
          {card.priceChange7d !== null && (
            <p className={`text-xs font-medium ${isPositive7d ? 'text-green-400' : 'text-red-400'}`}>
              {formatPriceChange(card.priceChange7d)}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

// =============================================================================
// SKELETON - Loading state
// =============================================================================

function CardOfTheDaySkeleton() {
  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-zinc-800 rounded" />
          <div className="h-5 bg-zinc-800 rounded w-28" />
        </div>
        <div className="h-4 bg-zinc-800 rounded w-20" />
      </div>
      <div className="p-6">
        <div className="flex gap-4">
          <div className="w-[100px] h-[140px] bg-zinc-800 rounded-lg shrink-0" />
          <div className="flex-1">
            <div className="h-6 bg-zinc-800 rounded w-3/4 mb-2" />
            <div className="h-4 bg-zinc-800 rounded w-1/2 mb-6" />
            <div className="flex justify-between items-end">
              <div>
                <div className="h-3 bg-zinc-800 rounded w-20 mb-2" />
                <div className="h-8 bg-zinc-800 rounded w-24" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 bg-zinc-800 rounded w-16" />
                <div className="h-8 bg-zinc-800 rounded w-16" />
              </div>
            </div>
          </div>
        </div>
        <div className="h-10 bg-zinc-800 rounded-xl mt-4" />
      </div>
    </div>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default CardOfTheDay;
