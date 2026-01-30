'use client';

import { useState, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface CardData {
  name: string;
  number: string;
  set: string;
  rarity: string;
  game: string;
  gameDisplay: string;
  price: number | null;
  priceChange7d: number | null;
  printing?: string;
  imageUrl?: string;
}

interface PoolCard {
  id: string;
  name: string;
  number: string;
  game: string;
  gameId: string;
  cardData: CardData;
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

interface COTDData {
  card: CardData;
  source: string;
  featured_date: string;
}

// =============================================================================
// MAIN CARD OF THE DAY COMPONENT (Desktop)
// =============================================================================

export function CardOfTheDay() {
  const [cotd, setCotd] = useState<COTDData | null>(null);
  const [voting, setVoting] = useState<VotingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [castingVote, setCastingVote] = useState(false);
  const [showVoting, setShowVoting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load both COTD and voting data in parallel
      const [cotdRes, voteRes] = await Promise.all([
        fetch('/api/card-of-the-day'),
        fetch('/api/cotd/vote'),
      ]);

      const cotdData = await cotdRes.json();
      const voteData = await voteRes.json();

      if (cotdData.card) {
        setCotd(cotdData);
      }

      if (voteData.votingActive && voteData.pool?.length > 0) {
        setVoting(voteData);
        setShowVoting(true); // Auto-show voting if active
      }
    } catch (error) {
      console.error('Failed to load COTD:', error);
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (cardId: string) => {
    if (castingVote) return;
    setCastingVote(true);

    try {
      const res = await fetch('/api/cotd/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolCardId: cardId }),
      });

      const data = await res.json();
      if (!data.error) {
        // Reload voting data
        const voteRes = await fetch('/api/cotd/vote');
        const voteData = await voteRes.json();
        setVoting(voteData);
      }
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setCastingVote(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return null;
    return `$${price.toFixed(2)}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-card bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-700 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  // No data
  if (!cotd && !voting) {
    return null;
  }

  return (
    <div className="animate-card bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6 transition-all hover:border-white/10">
      {/* Header with toggle if voting is active */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[15px] font-semibold flex items-center gap-2">
          🃏 Card of the Day
        </h3>
        {voting && voting.votingActive && cotd && (
          <button
            onClick={() => setShowVoting(!showVoting)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              showVoting
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {showVoting ? '📊 Today' : '🗳️ Vote'}
          </button>
        )}
      </div>

      {/* Voting UI */}
      {showVoting && voting && voting.votingActive ? (
        <div>
          <p className="text-xs text-slate-400 mb-3">
            Vote for tomorrow&apos;s card! Winners get <span className="text-cyan-400">+10 XP</span>
          </p>

          <div className="space-y-2">
            {voting.pool.map((card) => {
              const isVoted = voting.playerVote?.cardId === card.id;
              const isLeading = card.votes === Math.max(...voting.pool.map(c => c.votes)) && card.votes > 0;

              return (
                <button
                  key={card.id}
                  onClick={() => castVote(card.id)}
                  disabled={castingVote}
                  className={`w-full p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isVoted
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-[#07070b] border-transparent hover:border-purple-500/50'
                  } ${castingVote ? 'opacity-50' : ''}`}
                >
                  {/* Vote percentage bar */}
                  {voting.totalVotes > 0 && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 ${isVoted ? 'bg-purple-500/20' : 'bg-cyan-500/10'}`}
                      style={{ width: `${card.percentage}%` }}
                    />
                  )}

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{card.name}</div>
                      <div className="text-xs text-slate-500">
                        {card.game} • #{card.number}
                        {card.cardData?.printing && card.cardData.printing !== 'Standard' && (
                          <span className="text-purple-400 ml-1">✨</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right min-w-[50px]">
                      <div className={`text-sm font-bold ${isLeading ? 'text-yellow-400' : 'text-white'}`}>
                        {card.percentage}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {card.votes} vote{card.votes !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {isVoted && <span className="text-purple-400">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
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
      ) : cotd ? (
        /* Today's Card Display */
        <div>
          <div className="bg-[#07070b] rounded-xl p-4">
            <div className="flex items-start gap-4">
              {/* Card Info */}
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold truncate">{cotd.card.name}</div>
                <div className="text-sm text-slate-400 mt-1">
                  {cotd.card.set} • {cotd.card.rarity}
                </div>
                {cotd.card.printing && cotd.card.printing !== 'Standard' && (
                  <div className="text-sm text-purple-400 mt-1">✨ {cotd.card.printing}</div>
                )}
                <div className="text-xs text-slate-500 mt-2">#{cotd.card.number}</div>
              </div>

              {/* Price */}
              {cotd.card.price && (
                <div className="text-right">
                  <div className="text-xl font-bold text-cyan-400">
                    {formatPrice(cotd.card.price)}
                  </div>
                  {cotd.card.priceChange7d && (
                    <div className={`text-xs ${cotd.card.priceChange7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {cotd.card.priceChange7d >= 0 ? '↑' : '↓'} {Math.abs(cotd.card.priceChange7d).toFixed(1)}% 7d
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Source badge */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">{cotd.card.gameDisplay}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              cotd.source === 'staff_pick'
                ? 'bg-purple-500/20 text-purple-400'
                : cotd.source === 'community_vote'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {cotd.source === 'staff_pick' ? '👤 Staff Pick' :
               cotd.source === 'community_vote' ? '🗳️ Community Choice' : '🤖 Featured'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// =============================================================================
// COMPACT VERSION (Mobile)
// =============================================================================

export function CardOfTheDayCompact() {
  const [cotd, setCotd] = useState<COTDData | null>(null);
  const [voting, setVoting] = useState<VotingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [castingVote, setCastingVote] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cotdRes, voteRes] = await Promise.all([
        fetch('/api/card-of-the-day'),
        fetch('/api/cotd/vote'),
      ]);

      const cotdData = await cotdRes.json();
      const voteData = await voteRes.json();

      if (cotdData.card) setCotd(cotdData);
      if (voteData.votingActive && voteData.pool?.length > 0) setVoting(voteData);
    } catch (error) {
      console.error('Failed to load COTD:', error);
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (cardId: string) => {
    if (castingVote) return;
    setCastingVote(true);

    try {
      const res = await fetch('/api/cotd/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolCardId: cardId }),
      });

      if (!(await res.json()).error) {
        const voteRes = await fetch('/api/cotd/vote');
        setVoting(await voteRes.json());
      }
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setCastingVote(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-3"></div>
        <div className="h-16 bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (!cotd && !voting) return null;

  // If voting is active, prioritize showing voting UI
  const showVotingUI = voting && voting.votingActive && !voting.hasVoted;

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          🃏 Card of the Day
        </h3>
        {voting && voting.votingActive && (
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
            {voting.hasVoted ? '✓ Voted' : '🗳️ Vote!'}
          </span>
        )}
      </div>

      {/* Voting UI (compact) */}
      {showVotingUI ? (
        <div>
          <p className="text-[10px] text-slate-400 mb-2">
            Pick tomorrow&apos;s card for <span className="text-cyan-400">+10 XP</span>
          </p>
          <div className="space-y-1.5">
            {voting.pool.slice(0, expanded ? undefined : 3).map((card) => {
              const isVoted = voting.playerVote?.cardId === card.id;

              return (
                <button
                  key={card.id}
                  onClick={() => castVote(card.id)}
                  disabled={castingVote}
                  className={`w-full p-2 rounded-lg text-left text-xs transition-all ${
                    isVoted
                      ? 'bg-purple-500/20 border border-purple-500'
                      : 'bg-slate-800/50 border border-transparent hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate flex-1">{card.name}</span>
                    <span className="text-slate-400 ml-2">{card.percentage}%</span>
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
      ) : cotd ? (
        /* Today's card (compact) */
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{cotd.card.name}</div>
            <div className="text-[10px] text-slate-400">
              {cotd.card.gameDisplay} • #{cotd.card.number}
            </div>
          </div>
          {cotd.card.price && (
            <div className="text-cyan-400 font-bold text-sm">
              ${cotd.card.price.toFixed(2)}
            </div>
          )}
        </div>
      ) : null}

      {/* Voted confirmation */}
      {voting?.hasVoted && !showVotingUI && (
        <div className="mt-2 text-[10px] text-green-400 text-center">
          ✓ Vote cast for tomorrow
        </div>
      )}
    </div>
  );
}

// Default export for backward compatibility
export default CardOfTheDay;
