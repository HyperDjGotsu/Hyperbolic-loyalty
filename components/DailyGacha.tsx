'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { rarityColors } from '@/components/ui';

type Rarity = keyof typeof rarityColors;

interface SpinPrize {
  xp: number;
  label: string;
  rarity: Rarity;
}

interface DailyGachaProps {
  onComplete: () => void;
  onClose: () => void;
}

// Ticker cycles through these — randomised-feeling but deterministic sequence
const XP_SEQUENCE =     [5, 10, 25, 50, 100, 25, 10,  5, 50, 100, 10, 25,  5, 100, 50] as const;
const RARITY_SEQUENCE: Rarity[] =
  ['common', 'uncommon', 'rare', 'epic', 'legendary', 'rare', 'common', 'uncommon', 'epic', 'legendary',
   'common', 'rare', 'uncommon', 'legendary', 'epic'];

export const DailyGacha = ({ onComplete, onClose }: DailyGachaProps) => {
  const [phase, setPhase]           = useState<'ready' | 'spinning' | 'landing' | 'result' | 'error'>('ready');
  const [prize, setPrize]           = useState<SpinPrize | null>(null);
  const [newTotalXp, setNewTotalXp] = useState<number | null>(null);
  const [nextSpinAt, setNextSpinAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Ticker display state
  const [tickerXp, setTickerXp]       = useState<number>(5);
  const [tickerRarity, setTickerRarity] = useState<Rarity>('common');
  const [tickerKey, setTickerKey]     = useState(0);

  // Refs — never trigger re-renders
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPrize   = useRef<SpinPrize | null>(null);
  const isLanding      = useRef(false);
  const tickIndex      = useRef(0);

  const stopTicker = useCallback((finalPrize: SpinPrize) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    isLanding.current = true;
    // Show final value in ticker for one tick before switching to result card
    setTickerXp(finalPrize.xp);
    setTickerRarity(finalPrize.rarity);
    setTickerKey(k => k + 1);
    setPhase('landing');
    setTimeout(() => {
      setPrize(finalPrize);
      setPhase('result');
    }, 550);
  }, []);

  const tick = useCallback((delay: number, elapsed: number) => {
    if (isLanding.current) return;

    tickIndex.current = (tickIndex.current + 1) % XP_SEQUENCE.length;
    const xp     = XP_SEQUENCE[tickIndex.current];
    const rarity = RARITY_SEQUENCE[tickIndex.current % RARITY_SEQUENCE.length];

    setTickerXp(xp);
    setTickerRarity(rarity);
    setTickerKey(k => k + 1);

    // Deceleration curve: multiply by 1.14 each tick, cap at 380ms
    const nextDelay = Math.min(delay * 1.14, 380);
    const shouldLand = nextDelay >= 320 && elapsed >= 1600;

    if (shouldLand && pendingPrize.current) {
      stopTicker(pendingPrize.current);
      return;
    }

    timerRef.current = setTimeout(() => tick(nextDelay, elapsed + nextDelay), nextDelay);
  }, [stopTicker]);

  const spin = async () => {
    isLanding.current  = false;
    pendingPrize.current = null;
    tickIndex.current  = 0;
    setPhase('spinning');

    // Ticker starts immediately at 60ms per tick
    timerRef.current = setTimeout(() => tick(60, 60), 60);

    try {
      const res  = await fetch('/api/xp/daily-spin', { method: 'POST' });
      const data = await res.json();

      if (data.alreadySpun) {
        clearTimeout(timerRef.current!);
        setErrorMessage('Already spun today!');
        setPhase('error');
        return;
      }
      if (!res.ok || !data.success) {
        clearTimeout(timerRef.current!);
        setErrorMessage(data.error || 'Spin failed — try again');
        setPhase('error');
        return;
      }

      setNewTotalXp(data.newTotalXp);
      setNextSpinAt(data.nextSpinAt);
      // Ticker picks this up on its next decel threshold check
      pendingPrize.current = data.prize;
    } catch {
      clearTimeout(timerRef.current!);
      setErrorMessage('Network error — try again');
      setPhase('error');
    }
  };

  const formatNextSpin = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short',
    });

  const spinning = phase === 'spinning' || phase === 'landing';
  const activeColor = spinning ? rarityColors[tickerRarity] : prize ? rarityColors[prize.rarity] : rarityColors.common;

  return (
    <div className="fixed inset-0 bg-[#080810]/96 backdrop-blur-sm flex items-center justify-center z-50">

      {/* Ambient glow — shifts with ticker color during spin */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-200"
        style={{
          background: spinning || phase === 'result'
            ? `radial-gradient(ellipse at 50% 38%, ${activeColor.glow}12 0%, transparent 60%)`
            : 'none',
        }}
      />

      <div className="relative w-full max-w-xs mx-4 text-center">

        {/* Label */}
        <div className="mb-8">
          <p className="font-orbitron text-[10px] tracking-[0.3em] uppercase mb-2 transition-colors duration-200"
            style={{ color: spinning ? `${activeColor.primary}80` : '#00c8ea60' }}>
            {phase === 'ready'   && 'Daily Reward'}
            {spinning            && 'Rolling'}
            {phase === 'result'  && prize && rarityColors[prize.rarity].name}
            {phase === 'error'   && 'Error'}
          </p>
          <h2 className="font-orbitron font-black text-2xl text-white tracking-tight">
            {phase === 'ready'   && 'DAILY SPIN'}
            {spinning            && 'SPINNING'}
            {phase === 'result'  && prize && `+${prize.xp} XP`}
            {phase === 'error'   && 'FAILED'}
          </h2>
        </div>

        {/* ── READY orb ── */}
        {phase === 'ready' && (
          <div className="flex items-center justify-center mb-10">
            <div className="w-36 h-36 rounded-full border border-[#00c8ea]/20 flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, rgba(0,200,234,0.05) 0%, transparent 70%)' }}>
              <div className="w-20 h-20 rounded-full border border-[#00c8ea]/30"
                style={{ background: 'radial-gradient(circle, rgba(0,200,234,0.08) 0%, transparent 70%)' }} />
            </div>
          </div>
        )}

        {/* ── SPINNING / LANDING ticker ── */}
        {spinning && (
          <div className="flex items-center justify-center mb-10">
            <div
              className="relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-150"
              style={{
                border: `1px solid ${activeColor.primary}50`,
                boxShadow: `0 0 48px ${activeColor.glow}18, inset 0 1px 0 ${activeColor.primary}20`,
                background: `radial-gradient(circle, ${activeColor.glow}10 0%, transparent 70%)`,
              }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  border: `1px solid ${activeColor.primary}70`,
                  background: `radial-gradient(circle, ${activeColor.glow}14 0%, transparent 70%)`,
                }}
              >
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={tickerKey}
                    initial={{ opacity: 0, y: 14, scale: 0.75 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{    opacity: 0, y: -14, scale: 0.75 }}
                    transition={{ duration: 0.07, ease: 'easeOut' }}
                    className="font-orbitron font-black text-3xl select-none"
                    style={{ color: activeColor.primary }}
                  >
                    {tickerXp}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT card ── */}
        {phase === 'result' && prize && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className="mb-8"
          >
            <div
              className="inline-block rounded-2xl p-px mb-5"
              style={{ background: `linear-gradient(135deg, ${rarityColors[prize.rarity].primary}55, ${rarityColors[prize.rarity].glow}35)` }}
            >
              <div className="bg-[#0f0f1a] rounded-2xl px-10 py-8">
                <div
                  className="font-orbitron font-black text-5xl mb-1"
                  style={{ color: rarityColors[prize.rarity].primary }}
                >
                  +{prize.xp}
                </div>
                <div className="text-white/35 text-[10px] uppercase tracking-widest font-orbitron mb-3">XP</div>
                <div className="text-white/60 text-sm">{prize.label}</div>
              </div>
            </div>

            {newTotalXp !== null && (
              <p className="text-white/25 text-xs font-mono mb-1">
                Total XP <span className="text-[#00c8ea]/60">{newTotalXp.toLocaleString()}</span>
              </p>
            )}
            {nextSpinAt && (
              <p className="text-white/20 text-[11px]">Next spin at {formatNextSpin(nextSpinAt)}</p>
            )}
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div className="mb-8">
            <div className="bg-red-500/[0.07] border border-red-500/20 rounded-xl p-5 mb-4">
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
            <button onClick={onClose} className="text-white/30 text-sm hover:text-white/60 transition-colors">
              Close
            </button>
          </div>
        )}

        {/* ── ACTIONS ── */}
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
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => { onComplete(); onClose(); }}
            className="w-full bg-[#00c8ea] text-[#080810] font-orbitron font-bold uppercase tracking-wider py-4 rounded-xl hover:bg-[#00f0ff] active:scale-[0.98] transition-all"
          >
            Claim
          </motion.button>
        )}
      </div>
    </div>
  );
};
