'use client';

import { useState, useEffect } from 'react';

interface PoolCard {
  id: string;
  name: string;
  number: string;
  game: string;
  gameId: string;
  cardData: {
    price?: number;
    printing?: string;
    set?: string;
    rarity?: string;
  };
  votes: number;
  percentage: number;
}

interface VotingData {
  votingActive: boolean;
  pool: PoolCard[];
  totalVotes: number;
  playerVote: {
    cardId: string;
    votedAt: string;
  } | null;
  hasVoted: boolean;
  voteDate: string;
  votingEndsAt: string;
}

export default function COTDVotingWidget() {
  const [data, setData] = useState<VotingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVotingPool();
  }, []);

  const loadVotingPool = async () => {
    try {
      const res = await fetch('/api/cotd/vote');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Failed to load voting');
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (cardId: string) => {
    if (voting) return;
    
    setVoting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/cotd/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolCardId: cardId }),
      });
      
      const json = await res.json();
      
      if (json.error) {
        setError(json.error);
      } else {
        // Reload to get updated counts
        await loadVotingPool();
      }
    } catch (err) {
      setError('Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return null;
    return `$${price.toFixed(2)}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-elevated rounded-xl p-4 border border-border-token">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-700 rounded w-1/2 mb-3"></div>
          <div className="space-y-2">
            <div className="h-16 bg-slate-800 rounded"></div>
            <div className="h-16 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // No voting active
  if (!data?.votingActive || data.pool.length === 0) {
    return null; // Don't show widget if no voting
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl p-4 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗳️</span>
          <h3 className="font-bold text-white">Vote for Tomorrow&apos;s Card</h3>
        </div>
        {data.hasVoted && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
            ✓ Voted
          </span>
        )}
      </div>

      {/* Subtitle */}
      <p className="text-xs text-slate-400 mb-3">
        Pick the winner and earn <span className="text-cyan-400 font-medium">+10 XP</span> if your card wins!
      </p>

      {/* Error */}
      {error && (
        <div className="text-red-400 text-sm mb-3 p-2 bg-red-500/10 rounded-lg">
          {error}
        </div>
      )}

      {/* Voting Cards */}
      <div className="space-y-2">
        {data.pool.map((card) => {
          const isVoted = data.playerVote?.cardId === card.id;
          const isLeading = card.votes === Math.max(...data.pool.map(c => c.votes)) && card.votes > 0;
          
          return (
            <button
              key={card.id}
              onClick={() => castVote(card.id)}
              disabled={voting}
              className={`w-full p-3 rounded-lg border transition-all text-left relative overflow-hidden ${
                isVoted
                  ? 'bg-purple-500/20 border-purple-500'
                  : 'bg-elevated border-border-token hover:border-purple-500/50 hover:bg-elevated'
              } ${voting ? 'opacity-50 cursor-wait' : ''}`}
            >
              {/* Vote percentage bar */}
              {data.totalVotes > 0 && (
                <div 
                  className={`absolute left-0 top-0 bottom-0 ${isVoted ? 'bg-purple-500/20' : 'bg-cyan-500/10'}`}
                  style={{ width: `${card.percentage}%` }}
                />
              )}
              
              <div className="relative flex items-center gap-3">
                {/* Card Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{card.name}</div>
                  <div className="text-xs text-slate-400">
                    {card.game} • #{card.number}
                    {card.cardData.printing && card.cardData.printing !== 'Standard' && (
                      <span className="text-purple-400 ml-1">✨ {card.cardData.printing}</span>
                    )}
                  </div>
                </div>

                {/* Price */}
                {card.cardData.price && (
                  <div className="text-xs text-cyan-400 font-medium">
                    {formatPrice(card.cardData.price)}
                  </div>
                )}

                {/* Votes */}
                <div className="text-right min-w-[50px]">
                  <div className={`text-sm font-bold ${isLeading ? 'text-yellow-400' : 'text-white'}`}>
                    {card.percentage}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {card.votes} vote{card.votes !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Voted indicator */}
                {isVoted && (
                  <div className="text-purple-400">
                    ✓
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{data.totalVotes} total vote{data.totalVotes !== 1 ? 's' : ''}</span>
        <span>Voting for {new Date(data.voteDate + 'T12:00:00').toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })}</span>
      </div>
    </div>
  );
}
