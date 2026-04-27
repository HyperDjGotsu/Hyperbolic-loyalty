'use client';

import React, { useState } from 'react';
import { rarityColors } from '@/components/ui';

interface SpinPrize {
  xp: number;
  label: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface DailyGachaProps {
  onComplete: () => void;
  onClose: () => void;
}

export const DailyGacha = ({ onComplete, onClose }: DailyGachaProps) => {
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'result' | 'error'>('ready');
  const [prize, setPrize] = useState<SpinPrize | null>(null);
  const [newTotalXp, setNewTotalXp] = useState<number | null>(null);
  const [nextSpinAt, setNextSpinAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const spin = async () => {
    setPhase('spinning');

    try {
      const res = await fetch('/api/xp/daily-spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (data.alreadySpun) {
        setErrorMessage('Already spun today!');
        setPhase('error');
        return;
      }

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Spin failed — try again');
        setPhase('error');
        return;
      }

      setPrize(data.prize);
      setNewTotalXp(data.newTotalXp);
      setNextSpinAt(data.nextSpinAt);

      // Brief spin animation before showing result
      setTimeout(() => setPhase('result'), 1800);
    } catch {
      setErrorMessage('Network error — try again');
      setPhase('error');
    }
  };

  const handleClaim = () => {
    onComplete();
  };

  const rarityColor = prize ? rarityColors[prize.rarity] : rarityColors.common;

  const formatNextSpin = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short',
    });
  };

  return (
    <div className="fixed inset-0 bg-[#080810]/95 backdrop-blur-sm flex items-center justify-center z-50">

      {phase === 'result' && prize && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 40%, ${rarityColor.glow}18 0%, transparent 65%)`,
          }}
        />
      )}

      <div className="relative w-full max-w-sm mx-4 text-center">

        {/* Header */}
        <div className="mb-8">
          <p className="font-orbitron text-[10px] tracking-[0.3em] uppercase text-[#00c8ea]/60 mb-2">
            {phase === 'ready' && 'Daily Reward'}
            {phase === 'spinning' && 'Rolling...'}
            {phase === 'result' && rarityColor.name}
            {phase === 'error' && 'Error'}
          </p>
          <h2 className="font-orbitron font-black text-2xl text-white tracking-tight">
            {phase === 'ready' && 'DAILY SPIN'}
            {phase === 'spinning' && 'SPINNING'}
            {phase === 'result' && prize && `${prize.xp} XP`}
            {phase === 'error' && 'FAILED'}
          </h2>
        </div>

        {/* Spinner orb */}
        {(phase === 'ready' || phase === 'spinning') && (
          <div className="flex items-center justify-center mb-10">
            <div
              className="w-28 h-28 rounded-full border border-[#00c8ea]/20 flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(0,200,234,0.08) 0%, transparent 70%)',
                animation: phase === 'spinning' ? 'spin 0.7s linear infinite' : undefined,
              }}
            >
              <div
                className="w-16 h-16 rounded-full border border-[#00c8ea]/30"
                style={{
                  background: phase === 'spinning'
                    ? 'radial-gradient(circle, rgba(0,200,234,0.2) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(0,200,234,0.1) 0%, transparent 70%)',
                }}
              />
            </div>
          </div>
        )}

        {/* Result card */}
        {phase === 'result' && prize && (
          <div className="mb-8">
            <div
              className="inline-block rounded-2xl p-px mb-6"
              style={{ background: `linear-gradient(135deg, ${rarityColor.primary}60, ${rarityColor.glow}40)` }}
            >
              <div className="bg-[#0f0f1a] rounded-2xl px-10 py-8">
                <div
                  className="font-orbitron font-black text-5xl mb-2"
                  style={{ color: rarityColor.primary }}
                >
                  +{prize.xp}
                </div>
                <div className="text-white/40 text-xs uppercase tracking-widest font-orbitron">XP</div>
                <div className="mt-4 text-white/70 text-sm">{prize.label}</div>
              </div>
            </div>

            {newTotalXp !== null && (
              <p className="text-white/30 text-xs font-mono mb-1">
                Total XP: <span className="text-[#00c8ea]/70">{newTotalXp.toLocaleString()}</span>
              </p>
            )}
            {nextSpinAt && (
              <p className="text-white/20 text-xs">
                Next spin available at {formatNextSpin(nextSpinAt)}
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && (
          <div className="mb-8">
            <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl p-6 mb-4">
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Actions */}
        {phase === 'ready' && (
          <div className="space-y-3">
            <button
              onClick={spin}
              className="w-full bg-[#00c8ea] text-[#080810] font-orbitron font-bold uppercase tracking-wider py-4 rounded-xl hover:bg-[#00f0ff] active:scale-[0.98] transition-all"
            >
              Spin
            </button>
            <button
              onClick={onClose}
              className="w-full text-white/30 text-sm hover:text-white/60 transition-colors py-2"
            >
              Cancel
            </button>
          </div>
        )}

        {phase === 'result' && (
          <button
            onClick={handleClaim}
            className="w-full bg-[#00c8ea] text-[#080810] font-orbitron font-bold uppercase tracking-wider py-4 rounded-xl hover:bg-[#00f0ff] active:scale-[0.98] transition-all"
          >
            Claim
          </button>
        )}

        {phase === 'spinning' && (
          <p className="text-white/20 text-xs font-mono animate-pulse">Rolling prize...</p>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
