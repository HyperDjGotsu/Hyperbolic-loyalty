'use client';

import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'idle' | 'awakened' | 'shuffle' | 'spread' | 'reveal' | 'error' | 'already_spun';
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface SpinPrize { xp: number; label: string; rarity: Rarity; }
interface DailyGachaProps { onComplete: () => void; onClose: () => void; }

// ─── Layout constants ─────────────────────────────────────────────────────────

const CARD_W = 112;
const CARD_H = 157;

const INIT_POS = [
  { x: -5,   y: 6,   rotation: -3.5, zIndex: 1 },
  { x: -5,   y: 6,   rotation: -3.5, zIndex: 2 },
  { x: -2.5, y: 3,   rotation: -2,   zIndex: 3 },
  { x: -2.5, y: 3,   rotation: -2,   zIndex: 4 },
  { x:  0,   y: 0,   rotation:  0,   zIndex: 5 },
  { x:  0,   y: 0,   rotation:  0,   zIndex: 6 },
] as const;

const SPREAD_POS = [
  { x: -120, y: 20,  rotation: -18 },
  { x:    0, y: -15, rotation:   0 },
  { x:  120, y: 20,  rotation:  18 },
] as const;

// ─── Brand accent ─────────────────────────────────────────────────────────────

const GOLD = '#c9a84c';

// ─── Tier visual definitions ──────────────────────────────────────────────────

interface TierDef {
  rank: string; label: string; color: string; stroke: string;
  bg: string; glow: string; aura: string | null; pulse: string;
  borderGrad: string;
  bottomFill: number; topFill: number; animDuration: number;
  hgGlass?: string; hgStrokePx?: number; glowRadius?: number;
}

const TIER: Record<Rarity, TierDef> = {
  common: {
    rank: 'E', label: 'E-TIER', bottomFill: 0, topFill: 0, animDuration: 0,
    color: '#8ca0b0', stroke: '#aabccc',
    bg: 'radial-gradient(ellipse at 50% 40%, #354050 0%, #121820 100%)',
    glow: 'rgba(140,160,176,0.38)', aura: null, pulse: 'rgba(136,153,187,0.08)',
    borderGrad: `linear-gradient(135deg, #506070 0%, ${GOLD}55 35%, #9ab0c0 50%, ${GOLD}55 65%, #506070 100%)`,
  },
  uncommon: {
    rank: 'D', label: 'D-TIER', bottomFill: 0.18, topFill: 0, animDuration: 350,
    color: '#00b8d8', stroke: '#00c8ea',
    bg: 'radial-gradient(ellipse at 50% 40%, #005870 0%, #011820 100%)',
    glow: 'rgba(0,184,216,0.52)', aura: 'rgba(0,184,216,0.20)', pulse: 'rgba(0,184,216,0.10)',
    borderGrad: `linear-gradient(135deg, #00b8d8 0%, ${GOLD}55 38%, #00c8ea 55%, #00b8d8 100%)`,
  },
  rare: {
    rank: 'C', label: 'C-TIER', bottomFill: 0.50, topFill: 0.22, animDuration: 500,
    color: '#9b72cf', stroke: '#b899e0',
    bg: 'radial-gradient(ellipse at 50% 40%, #3d1e6e 0%, #120830 100%)',
    glow: 'rgba(155,114,207,0.54)', aura: 'rgba(155,114,207,0.26)', pulse: 'rgba(155,114,207,0.12)',
    borderGrad: `linear-gradient(135deg, #7c3aed 0%, ${GOLD}65 35%, #b899e0 55%, #7c3aed 100%)`,
  },
  epic: {
    rank: 'B', label: 'B-TIER', bottomFill: 0.80, topFill: 0.08, animDuration: 650,
    color: '#c45680', stroke: '#e07099',
    bg: 'radial-gradient(ellipse at 50% 40%, #6e1838 0%, #280010 100%)',
    glow: 'rgba(196,86,128,0.56)', aura: 'rgba(196,86,128,0.30)', pulse: 'rgba(196,86,128,0.12)',
    borderGrad: `linear-gradient(135deg, #be185d 0%, ${GOLD}75 35%, #e07099 55%, #be185d 100%)`,
  },
  // LOCKED gold: #ffcc33 / #d4a017 / #8b6914 — warm amber, no green channel
  // Glass: #2d1810 deep warm brown — "antique hourglass on treasure" contrast
  legendary: {
    rank: 'A', label: 'A-TIER', bottomFill: 1.0, topFill: 1.0, animDuration: 1000,
    color: '#ffcc33', stroke: '#ffcc33',
    bg: 'radial-gradient(ellipse at 50% 40%, #a07a10 0%, #d4a017 50%, #ffcc33 100%)',
    glow: 'rgba(212,160,23,0.88)', aura: 'rgba(212,160,23,0.55)', pulse: 'rgba(212,160,23,0.16)',
    borderGrad: 'linear-gradient(135deg, #ffcc33 0%, #d4a017 30%, #ffcc33 50%, #8b6914 70%, #d4a017 100%)',
    hgGlass: '#2d1810', hgStrokePx: 2.5, glowRadius: 55,
  },
};

// ─── Hourglass geometry ────────────────────────────────────────────────────────

interface HGP { cx: number; cy: number; w: number; h: number; nw: number; nh: number; }

function hgOutline({ cx, cy, w, h, nw, nh }: HGP): string {
  const hw = w/2, hh = h/2, hnw = nw/2, hnh = nh/2;
  return `M${cx-hw},${cy-hh} L${cx+hw},${cy-hh} L${cx+hnw},${cy-hnh} ` +
         `L${cx+hnw},${cy+hnh} L${cx+hw},${cy+hh} L${cx-hw},${cy+hh} ` +
         `L${cx-hnw},${cy+hnh} L${cx-hnw},${cy-hnh} Z`;
}

function hgSandBottom({ cx, cy, w, h, nw, nh }: HGP, fill: number): string | null {
  if (fill <= 0) return null;
  const hw = w/2, hh = h/2, hnw = nw/2, hnh = nh/2;
  const botY = cy + hh, neckBotY = cy + hnh, chamberH = hh - hnh;
  const sandTopY = botY - chamberH * fill;
  const t = (sandTopY - neckBotY) / chamberH;
  const sandLx = (cx - hnw) + ((cx - hw) - (cx - hnw)) * t;
  const sandRx = (cx + hnw) + ((cx + hw) - (cx + hnw)) * t;
  return `${sandLx},${sandTopY} ${sandRx},${sandTopY} ${cx+hw},${botY} ${cx-hw},${botY}`;
}

function hgNeckFill({ cx, cy, nw, nh }: HGP): string {
  const hnw = nw/2, hnh = nh/2;
  return `${cx-hnw},${cy-hnh} ${cx+hnw},${cy-hnh} ${cx+hnw},${cy+hnh} ${cx-hnw},${cy+hnh}`;
}

function hgSandTop({ cx, cy, w, h, nw, nh }: HGP, topFill: number): string | null {
  if (topFill <= 0) return null;
  const hw = w/2, hh = h/2, hnw = nw/2, hnh = nh/2;
  const topY = cy - hh, neckTopY = cy - hnh, chamberH = hh - hnh;
  const sandTopY = neckTopY - chamberH * topFill;
  const t = (sandTopY - topY) / chamberH;
  const sandLx = (cx - hw) + ((cx - hnw) - (cx - hw)) * t;
  const sandRx = (cx + hw) + ((cx + hnw) - (cx + hw)) * t;
  return `${sandLx},${sandTopY} ${sandRx},${sandTopY} ${cx+hnw},${neckTopY} ${cx-hnw},${neckTopY}`;
}

// Small symbol (27×37 viewBox) — scaled from preview's 40×54 at 0.667×
const SYM: HGP = { cx: 13, cy: 18, w: 24, h: 34, nw: 4, nh: 5 };
// Center mark on card back — centered in CARD_W × CARD_H space
const MARK: HGP = { cx: CARD_W / 2, cy: CARD_H / 2, w: 36, h: 50, nw: 7, nh: 7 };

// ─── Hourglass rarity symbol ──────────────────────────────────────────────────

function HourglassSymbol({ uid, bottomFill, topFill, color, animated = false, animDuration = 400, glassColor, strokePx = 2 }: {
  uid: string; bottomFill: number; topFill: number; color: string;
  animated?: boolean; animDuration?: number; glassColor?: string; strokePx?: number;
}) {
  const gc = glassColor ?? color;
  const filtId = `sf-${uid}`;
  const gradId = `sg-${uid}`;
  const outline = hgOutline(SYM);
  const sandBot = hgSandBottom(SYM, bottomFill);
  const neck    = bottomFill >= 0.8 ? hgNeckFill(SYM) : null;
  const sandTop = topFill > 0 ? hgSandTop(SYM, topFill) : null;
  const isE     = bottomFill === 0;

  const overflow = bottomFill >= 1.0 ? [
    { x: 7,  y: 1, r: 1.0, delay: '0s'    },
    { x: 20, y: 2, r: 0.8, delay: '0.65s' },
    { x: 4,  y: 5, r: 0.7, delay: '1.25s' },
    { x: 23, y: 4, r: 0.9, delay: '0.30s' },
  ] : [];

  const sandAnim = (dur: number): React.CSSProperties => ({
    transformBox: 'fill-box', transformOrigin: 'center bottom',
    transform: 'scaleY(0)',
    animation: `sandReveal ${dur}ms ease-out forwards`,
  });
  const topAnim = (dur: number, delay: number): React.CSSProperties => ({
    transformBox: 'fill-box', transformOrigin: 'center bottom',
    transform: 'scaleY(0)', opacity: 0,
    animation: `topSandAppear ${Math.round(dur * 0.55)}ms ease-out ${delay}ms forwards`,
  });

  return (
    <svg width="27" height="37" viewBox="0 0 27 37" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={filtId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5"/>
        </filter>
        <radialGradient id={gradId} cx="45%" cy="25%" r="75%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="white" stopOpacity="0.60"/>
          <stop offset="100%" stopColor={color} stopOpacity="1"/>
        </radialGradient>
      </defs>

      <path d={outline} fill="none" stroke={gc} strokeWidth={strokePx * 2.5} opacity="0.18"
        filter={`url(#${filtId})`}
        style={animated && isE ? { animation: 'ePulse 1.8s ease-in-out infinite' } : undefined}/>
      <path d={outline} fill="none" stroke={gc} strokeWidth={strokePx} opacity="0.88"
        style={animated && isE ? { animation: 'ePulse 1.8s ease-in-out infinite' } : undefined}/>

      {sandBot && <polygon points={sandBot} fill={color} opacity="0.28" filter={`url(#${filtId})`}
        style={animated ? sandAnim(animDuration) : undefined}/>}
      {sandBot && <polygon points={sandBot} fill={`url(#${gradId})`} opacity="1"
        style={animated ? sandAnim(animDuration) : undefined}/>}

      {neck && <polygon points={neck} fill={color} opacity="1"
        style={animated ? { animation: 'neckPulse 1.1s ease-in-out infinite' } as React.CSSProperties : undefined}/>}

      {sandTop && <polygon points={sandTop} fill={color} opacity="0.88"
        style={animated ? topAnim(animDuration, Math.round(animDuration * 0.65)) : undefined}/>}

      {overflow.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={color} opacity="0.9"
          style={{ animation: animated
            ? `overflowBurst 1.1s ${d.delay} ease-out infinite`
            : `sandFloat 2.2s ${d.delay} ease-in-out infinite` }}/>
      ))}
    </svg>
  );
}

// ─── Corner pip diamonds ──────────────────────────────────────────────────────

function CornerPips({ uid, color }: { uid: string; color: string }) {
  const gemId = `cgm-${uid}`;
  const pips: [number, number][] = [[9, 12], [103, 145]];
  return (
    <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <radialGradient id={gemId} cx="35%" cy="28%" r="70%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#e8f4ff"/>
          <stop offset="60%"  stopColor={color}/>
          <stop offset="100%" stopColor={color} stopOpacity="0.5"/>
        </radialGradient>
      </defs>
      {pips.map(([px, py], i) => (
        <polygon key={i}
          points={`${px},${py-4} ${px+4},${py} ${px},${py+4} ${px-4},${py}`}
          fill={`url(#${gemId})`}
          style={{
            animation: `gemPulse ${3.0 + i * 0.9}s ease-in-out ${i * 0.7}s infinite`,
            filter: `drop-shadow(0 0 3px ${color})`,
          }}/>
      ))}
    </svg>
  );
}

// ─── Card back SVG mark ───────────────────────────────────────────────────────

function CardMarkSVG({ uid, sandColor, bottomFill = 0.4, topFill = 0 }: {
  uid: string; sandColor: string; bottomFill?: number; topFill?: number;
}) {
  const filtId  = `cmf-${uid}`;
  const sandGId = `csg-${uid}`;
  const gemId   = `cgm-back-${uid}`;
  const outline = hgOutline(MARK);
  const sandBot = hgSandBottom(MARK, bottomFill);
  const neck    = bottomFill >= 0.8 ? hgNeckFill(MARK) : null;
  const sandTop = topFill > 0 ? hgSandTop(MARK, topFill) : null;
  const pips: [number, number][] = [[9, 12], [103, 145]];

  return (
    <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <filter id={filtId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
        </filter>
        <radialGradient id={sandGId} cx="45%" cy="25%" r="75%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="white"     stopOpacity="0.50"/>
          <stop offset="100%" stopColor={sandColor} stopOpacity="1"/>
        </radialGradient>
        <radialGradient id={gemId} cx="35%" cy="28%" r="70%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#e8f4ff"/>
          <stop offset="60%"  stopColor={sandColor}/>
          <stop offset="100%" stopColor={sandColor} stopOpacity="0.5"/>
        </radialGradient>
      </defs>

      <path d={outline} fill="none" stroke={sandColor} strokeWidth="10"
        opacity="0.09" filter={`url(#${filtId})`}/>
      <path d={outline} fill="none" stroke={sandColor} strokeWidth="2" opacity="0.65"/>

      {sandBot && <polygon points={sandBot} fill={sandColor} opacity="0.12" filter={`url(#${filtId})`}/>}
      {sandBot && <polygon points={sandBot} fill={`url(#${sandGId})`} opacity="0.80"/>}
      {neck    && <polygon points={neck}    fill={sandColor} opacity="0.85"/>}
      {sandTop && <polygon points={sandTop} fill={sandColor} opacity="0.60"/>}

      {pips.map(([px, py], i) => (
        <polygon key={i}
          points={`${px},${py-4} ${px+4},${py} ${px},${py+4} ${px-4},${py}`}
          fill={`url(#${gemId})`}
          style={{
            animation: `gemPulse ${3.0 + i * 0.9}s ease-in-out ${i * 0.7}s infinite`,
            filter: `drop-shadow(0 0 3px ${sandColor})`,
          }}/>
      ))}
    </svg>
  );
}

// ─── Film grain ───────────────────────────────────────────────────────────────

function GrainOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 9,
      opacity: 0.038, pointerEvents: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '200px 200px',
    }}/>
  );
}

// ─── Card Back ────────────────────────────────────────────────────────────────

function CardBack() {
  const borderGrad = `linear-gradient(135deg, #00b4d8 0%, #9d4edd 38%, ${GOLD} 50%, #9d4edd 62%, #00b4d8 100%)`;
  return (
    <div style={{
      width: CARD_W, height: CARD_H, boxSizing: 'border-box',
      backgroundImage: `radial-gradient(ellipse at 50% 40%, #1e1040 0%, #070810 100%), ${borderGrad}`,
      backgroundOrigin: 'padding-box, border-box',
      backgroundClip: 'padding-box, border-box',
      border: '1.5px solid transparent',
      borderRadius: 10,
      position: 'relative', overflow: 'hidden', userSelect: 'none',
    }}>
      <CardMarkSVG uid="back" sandColor="#2060a8" bottomFill={0.40} topFill={0}/>
      <GrainOverlay/>
    </div>
  );
}

// ─── Prize Card Face ──────────────────────────────────────────────────────────

function CardFace({ prize, animated, animKey }: {
  prize: SpinPrize; animated: boolean; animKey: number;
}) {
  const t   = TIER[prize.rarity];
  const uid = `face-${prize.rarity}-${animKey}`;
  const xpFontSize = prize.xp < 10 ? 46 : prize.xp < 100 ? 38 : 32;
  const glowR = t.glowRadius ?? 22;
  const glowSpread = Math.round(glowR / 3);

  return (
    <div style={{
      width: CARD_W, height: CARD_H, boxSizing: 'border-box',
      backgroundImage: `${t.bg}, ${t.borderGrad}`,
      backgroundOrigin: 'padding-box, border-box',
      backgroundClip: 'padding-box, border-box',
      border: '1.5px solid transparent',
      borderRadius: 10,
      boxShadow: t.aura
        ? `0 0 0 0.5px rgba(255,255,255,0.14), 0 0 ${glowR}px ${glowSpread}px ${t.aura}`
        : '0 0 0 0.5px rgba(255,255,255,0.10)',
      position: 'relative', overflow: 'hidden', userSelect: 'none',
    }}>
      <CornerPips uid={uid} color={t.stroke}/>
      <GrainOverlay/>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 0, paddingTop: 3,
      }}>
        <HourglassSymbol
          key={`hg-${animKey}`}
          uid={`sym-${uid}`}
          bottomFill={t.bottomFill}
          topFill={t.topFill}
          color={t.color}
          animated={animated}
          animDuration={t.animDuration || 320}
          glassColor={t.hgGlass}
          strokePx={t.hgStrokePx}
        />
        <div style={{
          fontSize: 8, letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.90)',
          textShadow: '0 1px 3px rgba(0,0,0,0.85)',
          fontFamily: 'var(--font-orbitron, monospace)',
          fontWeight: 600, marginTop: 5,
        }}>
          {t.label}
        </div>
        <div style={{
          width: 22, height: 1, margin: '7px 0',
          background: `linear-gradient(90deg, transparent, ${GOLD}95, transparent)`,
        }}/>
        <div style={{
          lineHeight: 1,
          fontFamily: 'var(--font-orbitron, monospace)',
          fontWeight: 900, fontSize: xpFontSize,
          color: 'white',
          textShadow: `0 0 18px ${t.glow}, 0 3px 12px rgba(0,0,0,0.88)`,
        }}>
          +{prize.xp}
        </div>
        <div style={{
          fontSize: 8, letterSpacing: '0.30em',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'var(--font-orbitron, monospace)',
          marginTop: 3,
        }}>XP</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const DailyGacha = ({ onComplete, onClose }: DailyGachaProps) => {
  const [phase,       _setPhase]    = useState<Phase>('loading');
  const [prize,       setPrize]     = useState<SpinPrize | null>(null);
  const [nextSpinAt,  setNextSpinAt]  = useState<string | null>(null);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [countdown,   setCountdown]   = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [isDevUser,   setIsDevUser]   = useState(false);
  const [fillAnimKey, setFillAnimKey] = useState(0);

  const phaseRef = useRef<Phase>('loading');
  const prizeRef = useRef<SpinPrize | null>(null);
  const busyRef  = useRef(false);
  const forceTierRef = useRef<Rarity | null>(null);

  function setPhase(p: Phase) { phaseRef.current = p; _setPhase(p); }

  const shuffleRefs = useRef<(HTMLDivElement | null)[]>(Array(6).fill(null));
  const spreadRefs  = useRef<(HTMLDivElement | null)[]>(Array(3).fill(null));
  const innerRefs   = useRef<(HTMLDivElement | null)[]>(Array(3).fill(null));

  const gestureRef = useRef({ active: false, startX: 0, dx: 0 });
  const qX   = useRef<((v: number) => void) | null>(null);
  const qRot = useRef<((v: number) => void) | null>(null);
  const floatRef = useRef<gsap.core.Tween | null>(null);

  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const tutorialSeen = useRef(
    typeof window !== 'undefined' && localStorage.getItem('hgx_gacha_tutorial_seen') === '1'
  );

  // ── Initial positions ──────────────────────────────────────────────────────

  useLayoutEffect(() => {
    INIT_POS.forEach((pos, i) => { const el = shuffleRefs.current[i]; if (el) gsap.set(el, pos); });
    spreadRefs.current.forEach(el => { if (el) gsap.set(el, { x: 0, y: 0, rotation: 0, opacity: 0, scale: 0.88 }); });
    innerRefs.current.forEach(el => { if (el) gsap.set(el, { rotateY: 0 }); });
  }, []);

  // ── GET on mount (supports ?force=rarity for testing) ─────────────────────

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('force') as Rarity | null;
    const validRarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (param && validRarities.includes(param)) {
      forceTierRef.current = param;
      setPhase('idle');
      return;
    }
    fetch('/api/xp/daily-spin')
      .then(r => r.json())
      .then(d => {
        if (d.canSpin) setPhase('idle');
        else { setNextSpinAt(d.nextSpinAt); setPhase('already_spun'); }
      })
      .catch(() => { setErrorMsg('Could not connect. Please try again.'); setPhase('error'); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch('/api/dev/reset-spin')
      .then(r => r.json())
      .then(d => { if (d.isWhitelisted) setIsDevUser(true); })
      .catch(() => {});
  }, []);

  // ── Countdown timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'already_spun' || !nextSpinAt) return;
    const tick = () => {
      const ms = Math.max(0, new Date(nextSpinAt).getTime() - Date.now());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, nextSpinAt]);

  // ── Float animation when awakened ─────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'awakened') return;
    const topCard = shuffleRefs.current[5];
    if (!topCard) return;
    qX.current   = gsap.quickTo(topCard, 'x',        { duration: 0.08, ease: 'none' });
    qRot.current = gsap.quickTo(topCard, 'rotation', { duration: 0.08, ease: 'none' });
    floatRef.current = gsap.to(shuffleRefs.current.slice(0, 5), {
      y: '-=3', duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.06,
    });
    return () => { floatRef.current?.kill(); };
  }, [phase]);

  // ── POST ───────────────────────────────────────────────────────────────────

  async function firePost(): Promise<boolean> {
    // Force-tier mode: return mock prize without hitting the API
    if (forceTierRef.current) {
      const FORCE_XP: Record<Rarity, number> = { common: 5, uncommon: 10, rare: 25, epic: 50, legendary: 100 };
      const rarity = forceTierRef.current;
      const p: SpinPrize = { xp: FORCE_XP[rarity], label: TIER[rarity].label, rarity };
      prizeRef.current = p;
      setPrize(p);
      setNextSpinAt(new Date(Date.now() + 86400000).toISOString());
      return true;
    }
    try {
      const res  = await fetch('/api/xp/daily-spin', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (data.alreadySpun) { setNextSpinAt(data.nextSpinAt); setPhase('already_spun'); return false; }
        throw new Error(data.error || 'Spin failed');
      }
      const p: SpinPrize = { xp: data.prize.xp, label: data.prize.label, rarity: data.prize.rarity };
      prizeRef.current = p;
      setPrize(p);
      setNextSpinAt(data.nextSpinAt);
      return true;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please retry.');
      setPhase('error');
      return false;
    }
  }

  // ── Animation helpers ─────────────────────────────────────────────────────

  async function runShuffle() {
    if (reducedMotion) return;
    const cards      = shuffleRefs.current.filter(Boolean) as HTMLDivElement[];
    const topHalf    = [3,4,5].map(i => shuffleRefs.current[i]).filter(Boolean) as HTMLDivElement[];
    const bottomHalf = [0,1,2].map(i => shuffleRefs.current[i]).filter(Boolean) as HTMLDivElement[];

    await gsap.to(cards, { x: 0, y: 0, rotation: 0, duration: 0.20, ease: 'power2.out', stagger: 0.022 });
    await Promise.all([
      gsap.to(topHalf,    { x: -24, y: -5, rotation: -3, duration: 0.13, ease: 'power2.out' }),
      gsap.to(bottomHalf, { x:  24, y:  5, rotation:  3, duration: 0.13, ease: 'power2.out' }),
    ]);
    await new Promise(r => setTimeout(r, 55));

    const tl = gsap.timeline();
    [5, 2, 4, 1, 3, 0].forEach((ci, i) => {
      const el = shuffleRefs.current[ci];
      if (!el) return;
      tl.set(el, { zIndex: 6 - i },                                               i * 0.07)
        .to(el,  { x: 0, y: 0, rotation: 0, duration: 0.09, ease: 'power3.in' }, i * 0.07);
    });
    await tl;

    await gsap.to(cards, { y: '+=2', scale: 1.02, duration: 0.04, ease: 'power2.in' });
    await gsap.to(cards, { y:    0,  scale: 1.00, duration: 0.04, ease: 'power2.out' });
    await new Promise(r => setTimeout(r, 110));
  }

  async function runSpread() {
    if (reducedMotion) {
      SPREAD_POS.forEach((pos, i) => { const el = spreadRefs.current[i]; if (el) gsap.set(el, { ...pos, opacity: 1, scale: 1 }); });
      gsap.set(shuffleRefs.current, { opacity: 0.2, scale: 0.9 });
      return;
    }
    gsap.to(shuffleRefs.current, { opacity: 0.22, scale: 0.88, duration: 0.28, ease: 'power2.out', stagger: 0.018 });
    const tl = gsap.timeline();
    SPREAD_POS.forEach((pos, i) => {
      tl.to(spreadRefs.current[i], { ...pos, opacity: 1, scale: 1, duration: 0.46, ease: 'back.out(1.8)' }, i * 0.09);
    });
    await tl;
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  async function handleTap() {
    if (phaseRef.current !== 'idle' || busyRef.current) return;
    busyRef.current = true;
    if (!reducedMotion) {
      gsap.to(shuffleRefs.current.slice(3), { scale: 1.03, duration: 0.11, yoyo: true, repeat: 1, ease: 'power2.out' });
      await gsap.to(shuffleRefs.current[5], { y: -8, duration: 0.26, ease: 'back.out(2.5)' });
    }
    setPhase('awakened');
    localStorage.setItem('hgx_gacha_tutorial_seen', '1');
    tutorialSeen.current = true;
    busyRef.current = false;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (phaseRef.current !== 'awakened') return;
    gestureRef.current = { active: true, startX: e.clientX, dx: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!gestureRef.current.active || phaseRef.current !== 'awakened') return;
    const dx = e.clientX - gestureRef.current.startX;
    gestureRef.current.dx = dx;
    qX.current?.(Math.max(-18, Math.min(18, dx)));
    qRot.current?.(Math.max(-4, Math.min(4, dx * (4 / 18))));
    const topCard = shuffleRefs.current[5];
    if (topCard) gsap.set(topCard, { y: -8 - Math.min(1, Math.abs(dx) / 80) * 4 });
  }

  function handlePointerUp() {
    if (!gestureRef.current.active) return;
    gestureRef.current.active = false;
    const { dx } = gestureRef.current;
    if (Math.abs(dx) >= 80) commitSwipe(dx); else snapBack();
  }

  function snapBack() {
    gsap.to(shuffleRefs.current[5], { x: 0, rotation: 0, y: -8, duration: 0.44, ease: 'back.out(2)' });
  }

  async function commitSwipe(dx: number) {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase('shuffle');
    floatRef.current?.kill();
    gsap.killTweensOf(shuffleRefs.current);

    if (!reducedMotion) {
      await gsap.to(shuffleRefs.current[5], {
        x: dx > 0 ? 24 : -24, rotation: dx > 0 ? 4 : -4, y: -12,
        duration: 0.10, ease: 'power2.out',
      });
    }

    const postPromise = firePost();
    await runShuffle();
    const ok = await postPromise;
    if (!ok) { busyRef.current = false; return; }

    await new Promise(r => requestAnimationFrame(r));
    await runSpread();
    setPhase('spread');
    busyRef.current = false;
  }

  async function handlePick(index: number) {
    if (phaseRef.current !== 'spread' || !prizeRef.current || busyRef.current) return;
    busyRef.current = true;
    setPickedIndex(index);
    setPhase('reveal');
    const p = prizeRef.current;

    if (!reducedMotion) {
      spreadRefs.current.forEach((el, i) => {
        if (i !== index && el) gsap.to(el, { opacity: 0, scale: 0.84, duration: 0.25, ease: 'power2.in' });
      });
      await gsap.to(spreadRefs.current[index], { x: 0, y: -22, rotation: 0, duration: 0.36, ease: 'back.out(1.5)' });
      if (p.rarity === 'legendary') await new Promise(r => setTimeout(r, 650));
      gsap.to(spreadRefs.current[index], { rotation: 3, duration: 0.14, ease: 'power2.out' });
      await gsap.to(innerRefs.current[index], { rotateY: 180, duration: 0.34, ease: 'power2.inOut' });
      gsap.to(spreadRefs.current[index], { rotation: 0, duration: 0.16, ease: 'power2.out' });
    } else {
      const el = innerRefs.current[index];
      if (el) gsap.set(el, { rotateY: 180 });
    }

    // Flip complete — trigger hourglass fill cascade
    setFillAnimKey(k => k + 1);
    busyRef.current = false;
  }

  async function handleSkip() {
    if (phaseRef.current !== 'idle' || busyRef.current) return;
    busyRef.current = true;
    setPhase('shuffle');

    const ok = await firePost();
    if (!ok) { busyRef.current = false; return; }

    // Kill all in-flight animations before manipulating DOM state
    gsap.killTweensOf([
      ...shuffleRefs.current,
      ...spreadRefs.current,
      ...innerRefs.current,
    ].filter(Boolean));

    await new Promise(r => requestAnimationFrame(r));

    // Hide deck cards
    shuffleRefs.current.forEach(el => { if (el) gsap.set(el, { opacity: 0 }); });

    // Hide unchosen spread cards
    [0, 2].forEach(i => {
      const el = spreadRefs.current[i];
      if (el) gsap.set(el, { opacity: 0, scale: 0.84 });
    });

    // Reveal card at final position, face up, starts transparent for crossfade
    const el = spreadRefs.current[1];
    const inner = innerRefs.current[1];
    if (el) gsap.set(el, { x: 0, y: -22, rotation: 0, opacity: 0, scale: 1 });
    if (inner) gsap.set(inner, { rotateY: 180 });

    setPickedIndex(1);
    // No fillAnimKey increment → animated=false → hourglass renders static final fill
    setPhase('reveal');

    // 150ms crossfade in
    if (el) gsap.to(el, { opacity: 1, duration: 0.15, ease: 'power2.out' });

    busyRef.current = false;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const t = prize ? TIER[prize.rarity] : null;
  const showRitual = ['idle','awakened','shuffle','spread','reveal'].includes(phase);

  return (
    <div className="fixed inset-0 bg-[#080810] flex flex-col items-center justify-center z-50 select-none">

      {phase === 'reveal' && t && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 45%, ${t.pulse} 0%, transparent 62%)` }}/>
      )}

      <button onClick={onClose}
        className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors p-2 leading-none"
        style={{ fontSize: 22 }} aria-label="Close">
        ×
      </button>

      {/* Loading */}
      {phase === 'loading' && (
        <div className="text-white/20 text-xs font-mono animate-pulse tracking-widest">LOADING</div>
      )}

      {/* Already spun */}
      {phase === 'already_spun' && (
        <div className="text-center">
          <p className="font-orbitron text-[10px] tracking-[0.3em] uppercase text-white/25 mb-3">Next spin in</p>
          <p className="font-orbitron font-black text-4xl text-[#00c8ea] tabular-nums tracking-tight">{countdown}</p>
          <button onClick={onClose}
            className="mt-10 text-white/20 text-sm hover:text-white/45 transition-colors">
            Close
          </button>
        </div>
      )}

      {/* Ritual */}
      {showRitual && (
        <div className="relative w-full max-w-xs mx-4 flex flex-col items-center">

          <div className="mb-6 h-8 flex items-center justify-center">
            <p className="font-orbitron uppercase transition-all duration-300"
              style={{
                fontSize:      phase === 'reveal' ? 18 : 10,
                fontWeight:    phase === 'reveal' ? 900 : 400,
                color:         phase === 'reveal' && t ? t.color : 'rgba(255,255,255,0.28)',
                letterSpacing: phase === 'reveal' ? '0.05em' : '0.25em',
              }}>
              {phase === 'idle'     && 'Tap the deck'}
              {phase === 'awakened' && 'Swipe to shuffle'}
              {phase === 'shuffle'  && '· · ·'}
              {phase === 'spread'   && 'Choose a card'}
              {phase === 'reveal'   && prize && `+${prize.xp} XP`}
            </p>
          </div>

          {phase === 'awakened' && (
            <div className="absolute font-orbitron text-[10px] tracking-[0.2em] text-[#00c8ea]/55"
              style={{ top: 28, animation: 'swipeArrow 1.4s ease-in-out infinite' }}>
              ← swipe →
            </div>
          )}

          <div style={{ position: 'relative', width: 380, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Deck — tap + swipe target */}
            <div
              onPointerDown={e => {
                if (phaseRef.current === 'idle') handleTap();
                else if (phaseRef.current === 'awakened') handlePointerDown(e);
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              role="button"
              tabIndex={phase === 'idle' || phase === 'awakened' ? 0 : -1}
              aria-label={phase === 'idle' ? 'Tap to begin daily spin' : 'Swipe to shuffle the deck'}
              onKeyDown={e => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                if (phase === 'idle') handleTap();
                else if (phase === 'awakened') commitSwipe(80);
              }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: CARD_W, height: CARD_H,
                marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2,
                touchAction: 'none',
                cursor: phase === 'idle' ? 'pointer' : phase === 'awakened' ? 'grab' : 'default',
                zIndex: phase === 'idle' || phase === 'awakened' ? 20 : 2,
              }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} ref={el => { shuffleRefs.current[i] = el; }}
                  style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
                  <CardBack/>
                </div>
              ))}
            </div>

            {/* 3 spread cards */}
            {[0, 1, 2].map(i => (
              <div
                key={`s${i}`}
                ref={el => { spreadRefs.current[i] = el; }}
                onClick={() => { if (phase === 'spread') handlePick(i); }}
                role={phase === 'spread' ? 'button' : undefined}
                tabIndex={phase === 'spread' ? 0 : -1}
                aria-label={phase === 'spread' ? `Choose card ${i + 1}` : undefined}
                onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && phase === 'spread') handlePick(i); }}
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2,
                  cursor: phase === 'spread' ? 'pointer' : 'default',
                  willChange: 'transform, opacity',
                  zIndex: 10,
                  perspective: 900,
                }}
              >
                <div ref={el => { innerRefs.current[i] = el; }}
                  style={{ width: CARD_W, height: CARD_H, transformStyle: 'preserve-3d', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                    <CardBack/>
                  </div>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    {prize && (
                      <CardFace
                        prize={prize}
                        animated={fillAnimKey > 0 && pickedIndex === i}
                        animKey={fillAnimKey}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reveal — claim */}
          {phase === 'reveal' && prize && t && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-4 w-full space-y-3"
            >
              <button
                onClick={() => { onComplete(); onClose(); }}
                className="w-full font-orbitron font-bold uppercase tracking-wider py-4 rounded-xl active:scale-[0.98] transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: t.color,
                  border: `1px solid ${t.stroke}60`,
                }}
              >
                Claim +{prize.xp} XP
              </button>
              {nextSpinAt && (
                <p className="text-center text-white/20 text-[11px]">
                  Next spin at {new Date(nextSpinAt).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit',
                    timeZone: 'America/Los_Angeles', timeZoneName: 'short',
                  })}
                </p>
              )}
            </motion.div>
          )}

          {/* Skip */}
          {phase === 'idle' && tutorialSeen.current && (
            <button onClick={handleSkip}
              className="mt-5 text-white/20 text-[11px] hover:text-white/40 transition-colors">
              Skip animation
            </button>
          )}

          {/* Shuffle hint */}
          {phase === 'shuffle' && (
            <p className="mt-5 text-white/15 text-[11px] font-mono animate-pulse">Drawing fate…</p>
          )}
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="text-center max-w-xs mx-4">
          <div className="bg-red-500/[0.07] border border-red-500/20 rounded-xl p-5 mb-4">
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
          <button onClick={() => { setErrorMsg(''); setPhase('idle'); }}
            className="text-white/30 text-sm hover:text-white/60 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Dev reset */}
      {isDevUser && (
        <button
          onClick={() => {
            fetch('/api/dev/reset-spin', { method: 'POST' })
              .then(() => window.location.reload())
              .catch(() => window.location.reload());
          }}
          className="absolute bottom-3 right-3 opacity-30 hover:opacity-70 transition-opacity"
          style={{ fontSize: 10, fontFamily: 'monospace', color: '#00c8ea', letterSpacing: '0.05em' }}
        >
          reset spin [dev]
        </button>
      )}

      <style>{`
        @keyframes swipeArrow {
          0%,100% { opacity: 0.3; transform: translateX(-8px); }
          50%      { opacity: 0.85; transform: translateX(8px); }
        }
        @keyframes gemPulse {
          0%, 100% { opacity: 0.50; }
          50%       { opacity: 0.95; }
        }
        @keyframes borderHue {
          0%, 100% { filter: hue-rotate(0deg); }
          50%       { filter: hue-rotate(6deg); }
        }
        @keyframes sandReveal {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes topSandAppear {
          from { transform: scaleY(0); opacity: 0;    }
          to   { transform: scaleY(1); opacity: 0.88; }
        }
        @keyframes neckPulse {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 1.00; }
        }
        @keyframes ePulse {
          0%, 100% { opacity: 0.32; }
          50%       { opacity: 0.78; }
        }
        @keyframes sandFloat {
          0%, 100% { transform: translateY(0px);  opacity: 0.85; }
          50%       { transform: translateY(-6px); opacity: 0;    }
        }
        @keyframes overflowBurst {
          0%   { transform: translateY(0px);   opacity: 0.90; }
          100% { transform: translateY(-10px); opacity: 0;    }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>
  );
};
