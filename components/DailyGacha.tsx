'use client';

import React, { useState } from 'react';
import { FloatingParticles, GlowButton, rarityColors } from '@/components/ui';
import type { GachaReward } from '@/lib/types';

const gachaRewards: GachaReward[] = [
  { name: '5 XP', rarity: 'common', probability: 0.35, icon: '⚪', xp: 5 },
  { name: '15 XP', rarity: 'uncommon', probability: 0.25, icon: '💚', xp: 15 },
  { name: '25 XP', rarity: 'rare', probability: 0.18, icon: '💙', xp: 25 },
  { name: '50 XP', rarity: 'epic', probability: 0.12, icon: '💎', xp: 50 },
  { name: '100 XP JACKPOT', rarity: 'legendary', probability: 0.04, icon: '🌟', xp: 100 },
  { name: 'Free Booster Pack', rarity: 'epic', probability: 0.06, icon: '📦', xp: 0 },
];

interface DailyGachaProps {
  onComplete: (result: GachaReward) => void;
  onClose: () => void;
}

export const DailyGacha = ({ onComplete, onClose }: DailyGachaProps) => {
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'result' | 'claiming' | 'error'>('ready');
  const [result, setResult] = useState<GachaReward | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const pullGacha = (): GachaReward => {
    const r = Math.random();
    let cumulative = 0;
    for (const reward of gachaRewards) {
      cumulative += reward.probability;
      if (r <= cumulative) return reward;
    }
    return gachaRewards[0];
  };

  const startPull = () => {
    const pulled = pullGacha();
    setResult(pulled);
    setPhase('spinning');
    setTimeout(() => setPhase('result'), 2000);
  };

  const claimReward = async () => {
    if (!result) return;
    
    setPhase('claiming');
    
    try {
      const response = await fetch('/api/xp/daily-spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xp: result.xp,
          rewardName: result.name,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        onComplete(result);
      } else if (data.alreadySpun) {
        setErrorMessage('Already spun today!');
        setPhase('error');
      } else {
        setErrorMessage(data.error || 'Failed to claim reward');
        setPhase('error');
      }
    } catch (error) {
      console.error('Claim error:', error);
      setErrorMessage('Network error');
      setPhase('error');
    }
  };

  const rarityColor = result ? rarityColors[result.rarity] : rarityColors.common;

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
      <FloatingParticles />
      
      {phase === 'result' && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle, ${rarityColor.glow} 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative w-full max-w-sm mx-4 text-center">
        <div className="mb-6">
          <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-orbitron">
            {phase === 'ready' && 'DAILY SPIN'}
            {phase === 'spinning' && 'SPINNING...'}
            {phase === 'result' && `${rarityColor.name.toUpperCase()}!`}
            {phase === 'claiming' && 'CLAIMING...'}
            {phase === 'error' && 'ERROR'}
          </div>
        </div>

        {phase === 'ready' && <div className="text-8xl mb-8 animate-bounce">⏳</div>}

        {phase === 'spinning' && (
          <div
            className="text-8xl mb-8"
            style={{ animation: 'spin 0.5s linear infinite' }}
          >
            ⏳
          </div>
        )}

        {phase === 'claiming' && (
          <div className="text-8xl mb-8 animate-pulse">✨</div>
        )}

        {phase === 'error' && (
          <div>
            <div className="text-8xl mb-8">❌</div>
            <p className="text-red-400 mb-4">{errorMessage}</p>
            <button onClick={onClose} className="text-slate-500">
              Close
            </button>
          </div>
        )}

        {phase === 'result' && result && (
          <div>
            <div
              className="inline-block p-1 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${rarityColor.primary}, ${rarityColor.glow})`,
                padding: '3px',
              }}
            >
              <div className="bg-slate-900 rounded-xl p-8">
                <div className="text-6xl mb-4">{result.icon}</div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: rarityColor.primary }}
                >
                  {result.name}
                </div>
                <div className="text-slate-500 uppercase tracking-wider text-sm mt-2">
                  {result.rarity}
                </div>
              </div>
            </div>
            <div className="mt-8">
              <GlowButton
                color={result.rarity === 'legendary' ? 'orange' : 'cyan'}
                onClick={claimReward}
                className="w-full py-4 text-lg"
              >
                ⏳ CLAIM REWARD ⏳
              </GlowButton>
            </div>
          </div>
        )}

        {phase === 'ready' && (
          <div className="mt-8">
            <GlowButton
              color="purple"
              onClick={startPull}
              className="w-full py-5 text-xl"
            >
              ⏳ FLIP THE HOURGLASS ⏳
            </GlowButton>
            <button onClick={onClose} className="mt-4 text-slate-500">
              Cancel
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
