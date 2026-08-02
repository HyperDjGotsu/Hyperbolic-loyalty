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
  source?: string;
  cached?: boolean;
}


interface PoolCard {
  id: string;
  name: string;
  number: string;
  game: string;
  gameId: string;
  cardData: {
    price?: number;
    printing?: string;
  };
  votes: number;
  percentage: number;
}

interface VotingData {
  votingActive: boolean;
  pool: PoolCard[];
  totalVotes: number;
  playerVote: { cardId: string } | null;
  hasVoted: boolean;
  voteDate: string;
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
  border: 'border-border-token',
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

function useVoting() {
  const [voting, setVoting] = useState<VotingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVoting = async () => {
    try {
      const response = await fetch('/api/cotd/vote');
      const data = await response.json();
      if (data.votingActive && data.pool?.length > 0) {
        setVoting(data);
      } else {
        setVoting(null);
      }
    } catch (err) {
      console.error('Failed to fetch voting:', err);
      setVoting(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoting();
  }, []);

  return { voting, loading, refetch: fetchVoting };
}

function useCardImage(game: string | undefined, cardNumber: string | undefined, _cardName: string | undefined) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [game, cardNumber]);

  const isOnePiece = game && (
    game === 'one-piece-card-game' ||
    game === 'One Piece' ||
    game.toLowerCase().includes('one piece')
  );

  const imageUrl = (isOnePiece && cardNumber && !imageError)
    ? `/api/card-image?game=${encodeURIComponent(game!)}&cardNumber=${encodeURIComponent(cardNumber)}`
    : null;

  const handleImageError = () => setImageError(true);

  return { imageUrl, imageLoading: false, imageError, handleImageError };
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
  const { voting, loading: votingLoading, refetch: refetchVoting } = useVoting();
  const { imageUrl, handleImageError } = useCardImage(
    card?.gameDisplay,
    card?.number,
    card?.name
  );
  const [showVoting, setShowVoting] = useState(false);
  const [castingVote, setCastingVote] = useState(false);

  // Auto-show voting if active and user hasn't voted
  useEffect(() => {
    if (voting && !voting.hasVoted) {
      setShowVoting(true);
    }
  }, [voting]);

  const castVote = async (cardId: string) => {
    if (castingVote) return;
    setCastingVote(true);

    try {
      const res = await fetch('/api/cotd/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolCardId: cardId }),
      });

      if ((await res.json()).error === undefined) {
        await refetchVoting();
      }
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setCastingVote(false);
    }
  };

  if (loading || votingLoading) {
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
    <div className="bg-surface border border-border-token rounded-2xl overflow-hidden transition-all hover:border-border-strong">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-token flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{theme.icon}</span>
          <span className="text-[15px] font-semibold">Card of the Day</span>
          {/* Source badge - only show for staff pick or community vote */}
          {card.source && card.source !== 'auto' && (
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              card.source === 'staff_pick'
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {card.source === 'staff_pick' ? '👤 Staff Pick' : '🗳️ Community'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {voting && (
            <button
              onClick={() => setShowVoting(!showVoting)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                showVoting
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-elevated text-secondary hover:text-primary'
              }`}
            >
              {showVoting ? '📊 Today' : '🗳️ Vote'}
            </button>
          )}
          <span className={`text-xs font-medium ${theme.accent}`}>
            {card.gameDisplay}
          </span>
        </div>
      </div>

      {/* Voting UI */}
      {showVoting && voting ? (
        <div className="p-6">
          <p className="text-secondary text-sm mb-4">
            Vote for tomorrow&apos;s card! Winners get <span className="text-cyan-400 font-medium">+10 XP</span>
          </p>

          <div className="space-y-2">
            {voting.pool.map((poolCard) => {
              const isVoted = voting.playerVote?.cardId === poolCard.id;
              const isLeading = poolCard.votes === Math.max(...voting.pool.map(c => c.votes)) && poolCard.votes > 0;

              return (
                <button
                  key={poolCard.id}
                  onClick={() => castVote(poolCard.id)}
                  disabled={castingVote}
                  className={`w-full p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isVoted
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-base border-transparent hover:border-purple-500/50'
                  } ${castingVote ? 'opacity-50' : ''}`}
                >
                  {/* Vote percentage bar */}
                  {voting.totalVotes > 0 && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 ${isVoted ? 'bg-purple-500/20' : 'bg-cyan-500/10'}`}
                      style={{ width: `${poolCard.percentage}%` }}
                    />
                  )}

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{poolCard.name}</div>
                      <div className="text-xs text-tertiary">
                        {poolCard.game} • #{poolCard.number}
                        {poolCard.cardData?.printing && poolCard.cardData.printing !== 'Standard' && (
                          <span className="text-purple-400 ml-1">✨</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right min-w-[50px]">
                      <div className={`text-sm font-bold ${isLeading ? 'text-yellow-400' : 'text-primary'}`}>
                        {poolCard.percentage}%
                      </div>
                      <div className="text-[10px] text-tertiary">
                        {poolCard.votes} vote{poolCard.votes !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {isVoted && <span className="text-purple-400">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-tertiary">
            <span>{voting.totalVotes} total votes</span>
            <span>
              For {new Date(voting.voteDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          {voting.hasVoted && (
            <div className="mt-3 text-center text-xs text-green-400 bg-green-400/10 rounded-lg py-2">
              ✓ Vote cast! Check back tomorrow for results
            </div>
          )}
        </div>
      ) : (
        /* Original Card Display */
        <div className={`p-6 bg-gradient-to-br ${theme.gradient}`}>
          <div className="flex gap-4">
            {/* Card image or placeholder */}
            <div className="shrink-0">
              <div className="w-[100px] h-[140px] rounded-lg overflow-hidden bg-base shadow-lg">
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
              <h3 className="text-primary font-semibold text-lg leading-tight mb-1 line-clamp-2">
                {card.name}
              </h3>
              <p className="text-tertiary text-sm mb-4">
                {card.set} • {card.rarity}
              </p>

              {/* Price section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-tertiary text-[10px] uppercase tracking-wider mb-0.5">
                      Market Price
                    </p>
                    <p className="text-primary text-2xl font-bold">
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
            className={`mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-base hover:bg-elevated transition-colors ${theme.accent} text-sm font-medium`}
          >
            View on TCGPlayer
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MOBILE COMPONENT - Compact card with image
// =============================================================================

export function CardOfTheDayCompact() {
  const { card, loading } = useCardOfTheDay();
  const { voting, loading: votingLoading, refetch: refetchVoting } = useVoting();
  const { imageUrl, handleImageError } = useCardImage(
    card?.gameDisplay,
    card?.number,
    card?.name
  );
  const [castingVote, setCastingVote] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const castVote = async (cardId: string) => {
    if (castingVote) return;
    setCastingVote(true);

    try {
      const res = await fetch('/api/cotd/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolCardId: cardId }),
      });

      if ((await res.json()).error === undefined) {
        await refetchVoting();
      }
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setCastingVote(false);
    }
  };

  if (loading || votingLoading) {
    return (
      <div className="bg-elevated rounded-xl p-3 animate-pulse border border-border-token">
        <div className="flex items-center gap-3">
          <div className="w-14 h-20 bg-elevated rounded-lg" />
          <div className="flex-1">
            <div className="h-4 bg-elevated rounded w-3/4 mb-2" />
            <div className="h-3 bg-elevated rounded w-1/2 mb-2" />
            <div className="h-3 bg-elevated rounded w-1/3" />
          </div>
          <div className="text-right">
            <div className="h-5 bg-elevated rounded w-16 mb-1" />
            <div className="h-4 bg-elevated rounded w-12" />
          </div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const theme = getTheme(card.gameDisplay);
  const isPositive7d = card.priceChange7d !== null && card.priceChange7d >= 0;

  // Show voting UI if active and user hasn't voted
  const showVotingUI = voting && !voting.hasVoted;

  if (showVotingUI) {
    return (
      <div className="bg-elevated rounded-xl p-3 border border-purple-500/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">🗳️ Vote for Tomorrow</span>
          <span className="text-[10px] text-cyan-400">+10 XP if you win!</span>
        </div>
        <div className="space-y-1.5">
          {voting.pool.slice(0, expanded ? undefined : 3).map((poolCard) => {
            const isVoted = voting.playerVote?.cardId === poolCard.id;

            return (
              <button
                key={poolCard.id}
                onClick={() => castVote(poolCard.id)}
                disabled={castingVote}
                className={`w-full p-2 rounded-lg text-left text-xs transition-all ${
                  isVoted
                    ? 'bg-purple-500/20 border border-purple-500'
                    : 'bg-elevated border border-transparent hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate flex-1">{poolCard.name}</span>
                  <span className="text-secondary ml-2">{poolCard.percentage}%</span>
                  {isVoted && <span className="text-purple-400 ml-1">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
        {voting.pool.length > 3 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full mt-2 text-[10px] text-cyan-400 hover:underline"
          >
            +{voting.pool.length - 3} more options
          </button>
        )}
      </div>
    );
  }

  return (
    <a
      href={card.tcgplayerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-elevated rounded-xl p-3 border border-border-token hover:border-border-strong transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Card image or icon */}
        <div className="w-14 h-20 rounded-lg overflow-hidden bg-elevated shrink-0 shadow-lg">
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
          <p className="text-primary text-sm font-medium line-clamp-2 leading-tight">
            {card.name}
          </p>
          <p className="text-tertiary text-xs mt-1">
            Card of the Day
          </p>
          <p className={`text-xs mt-0.5 ${theme.accent}`}>
            {card.gameDisplay}
          </p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-primary font-bold text-base">
            {formatPrice(card.price)}
          </p>
          {card.priceChange7d !== null && (
            <p className={`text-xs font-medium ${isPositive7d ? 'text-green-400' : 'text-red-400'}`}>
              {formatPriceChange(card.priceChange7d)}
            </p>
          )}
        </div>
      </div>

      {/* Show voted indicator */}
      {voting?.hasVoted && (
        <div className="mt-2 text-[10px] text-green-400 text-center">
          ✓ Vote cast for tomorrow
        </div>
      )}
    </a>
  );
}

// =============================================================================
// SKELETON - Loading state
// =============================================================================

function CardOfTheDaySkeleton() {
  return (
    <div className="bg-surface border border-border-token rounded-2xl overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-border-token flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-elevated rounded" />
          <div className="h-5 bg-elevated rounded w-28" />
        </div>
        <div className="h-4 bg-elevated rounded w-20" />
      </div>
      <div className="p-6">
        <div className="flex gap-4">
          <div className="w-[100px] h-[140px] bg-elevated rounded-lg shrink-0" />
          <div className="flex-1">
            <div className="h-6 bg-elevated rounded w-3/4 mb-2" />
            <div className="h-4 bg-elevated rounded w-1/2 mb-6" />
            <div className="flex justify-between items-end">
              <div>
                <div className="h-3 bg-elevated rounded w-20 mb-2" />
                <div className="h-8 bg-elevated rounded w-24" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 bg-elevated rounded w-16" />
                <div className="h-8 bg-elevated rounded w-16" />
              </div>
            </div>
          </div>
        </div>
        <div className="h-10 bg-elevated rounded-xl mt-4" />
      </div>
    </div>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default CardOfTheDay;
