'use client';
// PREVIEW ONLY — visual approval before DailyGacha integration
// Route: /dev/gacha-preview

import React, { useState } from 'react';

// ─── Dimensions ───────────────────────────────────────────────────────────────

const CW = 168;
const CH = 235;
const CX = CW / 2;   // 84
const CY = CH / 2;   // 117.5

const GOLD = '#c9a84c';

// ─── Types / data ─────────────────────────────────────────────────────────────

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const PRIZES: Record<Rarity, { xp: number }> = {
  common: { xp: 5 }, uncommon: { xp: 10 }, rare: { xp: 25 },
  epic: { xp: 50 }, legendary: { xp: 100 },
};

interface TierDef {
  rank: string; label: string; color: string; stroke: string;
  bg: string; holo: number; glow: string; aura: string | null;
  borderGrad: string;
  bottomFill: number;   // 0–1, bottom chamber fill level
  topFill: number;      // 0–1, top chamber fill level (pools at neck, grows toward ceiling)
  animDuration: number; // ms for sand cascade reveal
}

const TIERS: Record<Rarity, TierDef> = {
  // E — empty hourglass. Time hasn't started. Silver.
  common: {
    rank: 'E', label: 'E-TIER', bottomFill: 0, topFill: 0, animDuration: 0,
    color: '#8ca0b0', stroke: '#aabccc',
    bg: 'radial-gradient(ellipse at 50% 40%, #354050 0%, #121820 100%)',
    holo: 0.20, glow: 'rgba(140,160,176,0.42)', aura: null,
    borderGrad: `linear-gradient(135deg, #506070 0%, ${GOLD}55 35%, #9ab0c0 50%, ${GOLD}55 65%, #506070 100%)`,
  },
  // D — a few grains in the bottom. Cyan.
  uncommon: {
    rank: 'D', label: 'D-TIER', bottomFill: 0.18, topFill: 0, animDuration: 350,
    color: '#00b8d8', stroke: '#00c8ea',
    bg: 'radial-gradient(ellipse at 50% 40%, #005870 0%, #011820 100%)',
    holo: 0.22, glow: 'rgba(0,184,216,0.52)', aura: 'rgba(0,184,216,0.20)',
    borderGrad: `linear-gradient(135deg, #00b8d8 0%, ${GOLD}55 38%, #00c8ea 55%, #00b8d8 100%)`,
  },
  // C — half full bottom + small pool just above neck in top. Amethyst.
  rare: {
    rank: 'C', label: 'C-TIER', bottomFill: 0.50, topFill: 0.22, animDuration: 500,
    color: '#9b72cf', stroke: '#b899e0',
    bg: 'radial-gradient(ellipse at 50% 40%, #3d1e6e 0%, #120830 100%)',
    holo: 0.28, glow: 'rgba(155,114,207,0.54)', aura: 'rgba(155,114,207,0.26)',
    borderGrad: `linear-gradient(135deg, #7c3aed 0%, ${GOLD}65 35%, #b899e0 55%, #7c3aed 100%)`,
  },
  // B — mostly full + neck flowing + thin top pool. Rose.
  epic: {
    rank: 'B', label: 'B-TIER', bottomFill: 0.80, topFill: 0.08, animDuration: 650,
    color: '#c45680', stroke: '#e07099',
    bg: 'radial-gradient(ellipse at 50% 40%, #6e1838 0%, #280010 100%)',
    holo: 0.36, glow: 'rgba(196,86,128,0.56)', aura: 'rgba(196,86,128,0.30)',
    borderGrad: `linear-gradient(135deg, #be185d 0%, ${GOLD}75 35%, #e07099 55%, #be185d 100%)`,
  },
  // A — both chambers full + overflowing cosmic sand. Warm amber gold.
  // LOCKED: #ffcc33 / #d4a017 / #8b6914 — pirate-treasure gold, no green channel boost.
  legendary: {
    rank: 'A', label: 'A-TIER', bottomFill: 1.0, topFill: 1.0, animDuration: 1000,
    color: '#d4a017', stroke: '#ffcc33',
    bg: 'radial-gradient(ellipse at 50% 40%, #ffcc33 0%, #d4a017 50%, #8b6914 100%)',
    holo: 0, glow: 'rgba(212,160,23,0.75)', aura: 'rgba(212,160,23,0.45)',
    borderGrad: 'linear-gradient(135deg, #ffcc33 0%, #d4a017 30%, #ffcc33 50%, #8b6914 70%, #d4a017 100%)',
  },
};

// ─── Hourglass geometry ────────────────────────────────────────────────────────
//
// Same parametric math for the small rarity symbol and the large card mark.

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

// Top chamber sand: pools at neck bottom (neckTopY) and grows upward toward ceiling.
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

// Small symbol (40×54 SVG)
const SYM: HGP = { cx: 20, cy: 27, w: 36, h: 50, nw: 6, nh: 8 };
// Large card center mark (in 168×235 card SVG)
const MARK: HGP = { cx: CX, cy: CY, w: 54, h: 74, nw: 10, nh: 10 };

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes borderHue {
    0%, 100% { filter: hue-rotate(0deg); }
    50%       { filter: hue-rotate(6deg); }
  }
  @keyframes gemPulse {
    0%, 100% { opacity: 0.50; }
    50%       { opacity: 0.95; }
  }
  @keyframes holoSpin {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(360deg); }
  }
  @keyframes legendaryWave {
    0%   { background-position: 0%   0%;   }
    100% { background-position: 100% 100%; }
  }
  @keyframes auraBreathe {
    0%, 100% { opacity: 0.50; transform: translate(-50%,-50%) scale(1.00); }
    50%       { opacity: 0.90; transform: translate(-50%,-50%) scale(1.12); }
  }
  @keyframes sandFloat {
    0%, 100% { transform: translateY(0px);  opacity: 0.85; }
    50%       { transform: translateY(-9px); opacity: 0;    }
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
  @keyframes overflowBurst {
    0%   { transform: translateY(0px);  opacity: 0.90; }
    100% { transform: translateY(-14px); opacity: 0;   }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
`;

// ─── Hourglass rarity symbol ──────────────────────────────────────────────────
//
// 40×54 SVG. The fill story tells E → A at a glance.
// When animated=true, sand cascades in on mount (for the demo section).

function HourglassSymbol({ uid, bottomFill, topFill, color, animated = false, animDuration = 400 }: {
  uid: string; bottomFill: number; topFill: number; color: string;
  animated?: boolean; animDuration?: number;
}) {
  const filtId = `sf-${uid}`;
  const gradId = `sg-${uid}`;

  const outline = hgOutline(SYM);
  const sandBot = hgSandBottom(SYM, bottomFill);
  const neck    = bottomFill >= 0.8 ? hgNeckFill(SYM) : null;
  const sandTop = topFill > 0 ? hgSandTop(SYM, topFill) : null;

  const overflow = bottomFill >= 1.0 ? [
    { x: 10, y: 1, r: 1.5, delay: '0s'    },
    { x: 30, y: 2, r: 1.2, delay: '0.65s' },
    { x: 5,  y: 7, r: 1.0, delay: '1.25s' },
    { x: 35, y: 6, r: 1.3, delay: '0.30s' },
  ] : [];

  // Sand animation: scaleY from bottom of bounding box
  const sandAnim = (dur: number, delay = 0): React.CSSProperties => ({
    transformBox: 'fill-box',
    transformOrigin: 'center bottom',
    transform: 'scaleY(0)',
    animation: `sandReveal ${dur}ms ease-out ${delay}ms forwards`,
  });

  // Top sand animation: same but with delay and opacity transition
  const topAnim = (dur: number, delay: number): React.CSSProperties => ({
    transformBox: 'fill-box',
    transformOrigin: 'center bottom',
    transform: 'scaleY(0)',
    opacity: 0,
    animation: `topSandAppear ${Math.round(dur * 0.55)}ms ease-out ${delay}ms forwards`,
  });

  const isE = bottomFill === 0;

  return (
    <svg width="40" height="54" viewBox="0 0 40 54" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={filtId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5"/>
        </filter>
        <radialGradient id={gradId} cx="45%" cy="25%" r="75%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="white"  stopOpacity="0.60"/>
          <stop offset="100%" stopColor={color}  stopOpacity="1"/>
        </radialGradient>
      </defs>

      {/* Glow bloom behind outline */}
      <path d={outline} fill="none" stroke={color} strokeWidth="7"
        opacity="0.18" filter={`url(#${filtId})`}
        style={animated && isE ? { animation: 'ePulse 1.8s ease-in-out infinite' } : undefined}
      />

      {/* Outline — 2.5px weight */}
      <path d={outline} fill="none" stroke={color} strokeWidth="2.5" opacity="0.88"
        style={animated && isE ? { animation: 'ePulse 1.8s ease-in-out infinite' } : undefined}
      />

      {/* Bottom sand — glow pass */}
      {sandBot && (
        <polygon points={sandBot} fill={color} opacity="0.28" filter={`url(#${filtId})`}
          style={animated ? sandAnim(animDuration) as React.CSSProperties : undefined}
        />
      )}
      {/* Bottom sand — solid fill */}
      {sandBot && (
        <polygon points={sandBot} fill={`url(#${gradId})`} opacity="1"
          style={animated ? sandAnim(animDuration) as React.CSSProperties : undefined}
        />
      )}

      {/* Neck fill */}
      {neck && (
        <polygon points={neck} fill={color} opacity="1"
          style={animated ? {
            animation: `neckPulse 1.1s ease-in-out infinite`,
          } as React.CSSProperties : undefined}
        />
      )}

      {/* Top chamber sand */}
      {sandTop && (
        <polygon points={sandTop} fill={color} opacity="0.88"
          style={animated
            ? topAnim(animDuration, Math.round(animDuration * 0.65)) as React.CSSProperties
            : undefined}
        />
      )}

      {/* Overflow particles — A tier */}
      {overflow.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={color}
          style={{
            animation: animated
              ? `overflowBurst 1.1s ${d.delay} ease-out infinite`
              : `sandFloat 2.2s ${d.delay} ease-in-out infinite`,
            opacity: 0.9,
          }}
        />
      ))}
    </svg>
  );
}

// ─── Corner pip diamonds — used on all cards ──────────────────────────────────
//
// Two diagonal diamond pips (top-left + bottom-right).
// This is the only shared background element on prize cards.

function CornerPips({ uid, color }: { uid: string; color: string }) {
  const gemId = `cgm-${uid}`;
  const pips: [number, number][] = [[14, 18], [154, 217]];
  return (
    <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}
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
          points={`${px},${py-6} ${px+6},${py} ${px},${py+6} ${px-6},${py}`}
          fill={`url(#${gemId})`}
          style={{
            animation: `gemPulse ${3.0 + i * 0.9}s ease-in-out ${i * 0.7}s infinite`,
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      ))}
    </svg>
  );
}

// ─── Card back SVG — hourglass center mark + corner pips ─────────────────────
//
// The large center hourglass mark is CARD BACK ONLY.
// Prize cards use CornerPips only — clean gradient background.

function CardMarkSVG({ uid, sandColor, bottomFill = 0.4, topFill = 0 }: {
  uid: string; sandColor: string; bottomFill?: number; topFill?: number;
}) {
  const filtId  = `cmf-${uid}`;
  const sandGId = `csg-${uid}`;
  const gemId   = `cgm-${uid}`;

  const outline = hgOutline(MARK);
  const sandBot = hgSandBottom(MARK, bottomFill);
  const neck    = bottomFill >= 0.8 ? hgNeckFill(MARK) : null;
  const sandTop = topFill > 0 ? hgSandTop(MARK, topFill) : null;

  const pips: [number, number][] = [[14, 18], [154, 217]];

  return (
    <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <filter id={filtId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7"/>
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

      {/* Hourglass glow bloom */}
      <path d={outline} fill="none" stroke={sandColor} strokeWidth="14"
        opacity="0.09" filter={`url(#${filtId})`}/>

      {/* Hourglass outline — 2.5px */}
      <path d={outline} fill="none" stroke={sandColor} strokeWidth="2.5" opacity="0.65"/>

      {/* Bottom sand — glow pass */}
      {sandBot && (
        <polygon points={sandBot} fill={sandColor} opacity="0.12" filter={`url(#${filtId})`}/>
      )}
      {/* Bottom sand — solid fill */}
      {sandBot && (
        <polygon points={sandBot} fill={`url(#${sandGId})`} opacity="0.80"/>
      )}

      {/* Neck sand */}
      {neck && <polygon points={neck} fill={sandColor} opacity="0.85"/>}

      {/* Top chamber sand */}
      {sandTop && <polygon points={sandTop} fill={sandColor} opacity="0.60"/>}

      {/* Diagonal pip pair */}
      {pips.map(([px, py], i) => (
        <polygon key={i}
          points={`${px},${py-6} ${px+6},${py} ${px},${py+6} ${px-6},${py}`}
          fill={`url(#${gemId})`}
          style={{
            animation: `gemPulse ${3.0 + i * 0.9}s ease-in-out ${i * 0.7}s infinite`,
            filter: `drop-shadow(0 0 4px ${sandColor})`,
          }}
        />
      ))}
    </svg>
  );
}

// ─── Holographic foil overlay ──────────────────────────────────────────────────

function HoloOverlay({ opacity, speed = 9, legendary = false }: {
  opacity: number; speed?: number; legendary?: boolean;
}) {
  if (legendary) {
    return (
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 8,
        background: 'linear-gradient(135deg, rgba(0,200,234,1) 0%, rgba(200,80,192,1) 25%, rgba(201,168,76,1) 50%, rgba(255,80,120,1) 75%, rgba(0,200,234,1) 100%)',
        backgroundSize: '200% 200%',
        opacity, pointerEvents: 'none', mixBlendMode: 'screen',
        animation: `legendaryWave ${speed}s linear infinite`,
        willChange: 'background-position',
      } as React.CSSProperties}/>
    );
  }
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 8,
      background: 'conic-gradient(from 0deg at 50% 50%, rgba(0,180,216,1), rgba(157,78,221,1), rgba(201,168,76,1), rgba(255,80,120,1), rgba(0,180,216,1))',
      opacity, pointerEvents: 'none', mixBlendMode: 'screen',
      animation: `holoSpin ${speed}s linear infinite`,
      willChange: 'transform',
    } as React.CSSProperties}/>
  );
}

// ─── Film grain ───────────────────────────────────────────────────────────────

function GrainOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 8,
      opacity: 0.038, pointerEvents: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '200px 200px',
    }}/>
  );
}

// ─── Three-layer border system ─────────────────────────────────────────────────
//
// white catchlight → animated gradient border → inset inner frame
// A-tier gets a triple-layer glow aura.

function CardBorder({ children, aura, borderGrad, legendary = false }: {
  children: React.ReactNode; aura?: string | null; borderGrad: string; legendary?: boolean;
}) {
  let boxShadow: string;
  if (legendary && aura) {
    boxShadow = [
      `0 0 28px 9px ${aura}`,
      `0 0 65px 24px ${aura}80`,
      `0 0 120px 55px ${aura}38`,
    ].join(', ');
  } else if (aura) {
    boxShadow = `0 0 50px 14px ${aura}, 0 0 90px 36px ${aura}50`;
  } else {
    boxShadow = '0 0 16px 5px rgba(0,160,200,0.16)';
  }

  return (
    <div style={{
      display: 'inline-block', padding: 1, borderRadius: 15,
      background: 'rgba(255,255,255,0.22)',
      boxShadow,
    }}>
      <div style={{
        padding: 1, borderRadius: 14, background: borderGrad,
        animation: 'borderHue 15s ease-in-out infinite',
        willChange: 'filter',
      }}>
        <div style={{
          padding: 6, borderRadius: 13,
          background: 'linear-gradient(145deg, rgba(0,70,110,0.96) 0%, rgba(45,0,80,0.96) 50%, rgba(0,70,110,0.96) 100%)',
          boxShadow: 'inset 0 2px 14px rgba(0,0,0,0.92), inset 0 -1px 5px rgba(0,0,0,0.60)',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Card Back ────────────────────────────────────────────────────────────────

function CardBack({ uid }: { uid: string }) {
  return (
    <CardBorder
      borderGrad={`linear-gradient(135deg, #00b4d8 0%, #9d4edd 38%, ${GOLD} 50%, #9d4edd 62%, #00b4d8 100%)`}
      aura={null}
    >
      <div style={{
        width: CW, height: CH,
        background: 'radial-gradient(ellipse at 50% 40%, #1e1040 0%, #070810 100%)',
        borderRadius: 8, position: 'relative', overflow: 'hidden', userSelect: 'none',
      }}>
        <CardMarkSVG uid={uid} sandColor="#2060a8" bottomFill={0.40} topFill={0}/>
        <GrainOverlay/>
      </div>
    </CardBorder>
  );
}

// ─── Prize Card ───────────────────────────────────────────────────────────────

function PrizeCard({ rarity, uid }: { rarity: Rarity; uid: string }) {
  const t = TIERS[rarity];
  const p = PRIZES[rarity];
  const isLeg = rarity === 'legendary';

  // Scale XP font so "+100" stays inside the card width
  const xpFontSize = p.xp < 10 ? 72 : p.xp < 100 ? 62 : 52;

  return (
    <CardBorder borderGrad={t.borderGrad} aura={t.aura} legendary={isLeg}>
      <div style={{
        width: CW, height: CH, background: t.bg,
        borderRadius: 8, position: 'relative', overflow: 'hidden', userSelect: 'none',
      }}>
        <CornerPips uid={uid} color={t.stroke}/>
        <GrainOverlay/>

        {/* Card content — above background SVG */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 0, paddingTop: 4,
        }}>

          {/* Rarity symbol */}
          <HourglassSymbol
            uid={`sym-${uid}`}
            bottomFill={t.bottomFill}
            topFill={t.topFill}
            color={t.color}
          />

          {/* Tier label — solid white, readable */}
          <div style={{
            fontSize: 11, letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.90)',
            textShadow: '0 1px 4px rgba(0,0,0,0.85)',
            fontFamily: 'var(--font-orbitron, monospace)',
            fontWeight: 600, marginTop: 7,
          }}>
            {t.label}
          </div>

          {/* Gold divider */}
          <div style={{
            width: 38, height: 1, margin: '12px 0',
            background: `linear-gradient(90deg, transparent, ${GOLD}95, transparent)`,
          }}/>

          {/* XP — the hero. Single unit, one color, one size. */}
          <div style={{
            lineHeight: 1,
            fontFamily: 'var(--font-orbitron, monospace)',
            fontWeight: 900,
            fontSize: xpFontSize,
            color: 'white',
            textShadow: `0 0 32px ${t.glow}, 0 4px 22px rgba(0,0,0,0.88)`,
          }}>
            +{p.xp}
          </div>

          {/* XP unit label */}
          <div style={{
            fontSize: 13, letterSpacing: '0.30em',
            color: 'rgba(255,255,255,0.58)',
            fontFamily: 'var(--font-orbitron, monospace)',
            marginTop: 5,
          }}>XP</div>

        </div>
      </div>
    </CardBorder>
  );
}

// ─── Fill Animation Demo ───────────────────────────────────────────────────────
//
// Shows each tier's hourglass cascade on mount. Remounting via key forces replay.

function AnimatedHourglassDemo() {
  const [animKey, setAnimKey] = useState(0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 36, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 28 }}>
        {RARITIES.map(r => {
          const t = TIERS[r];
          return (
            <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <HourglassSymbol
                key={`${r}-${animKey}`}
                uid={`anim-${r}-${animKey}`}
                bottomFill={t.bottomFill}
                topFill={t.topFill}
                color={t.color}
                animated
                animDuration={t.animDuration || 320}
              />
              <div style={{ fontSize: 9, color: t.color, letterSpacing: '0.18em', fontFamily: 'monospace' }}>
                {t.rank}
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', letterSpacing: '0.08em', textAlign: 'center' }}>
                {t.animDuration > 0 ? `${t.animDuration}ms` : 'pulse only'}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setAnimKey(k => k + 1)}
        style={{
          fontSize: 10, letterSpacing: '0.18em', fontFamily: 'monospace',
          color: GOLD, background: 'none', border: `1px solid ${GOLD}55`,
          padding: '6px 18px', borderRadius: 4, cursor: 'pointer', opacity: 0.75,
          transition: 'opacity 120ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
      >
        REPLAY ↺
      </button>

      {/* Timing reference */}
      <div style={{ marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {RARITIES.map(r => {
          const t = TIERS[r];
          const dur = t.animDuration;
          return (
            <div key={r} style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.22)', lineHeight: 1.7 }}>
              <span style={{ color: t.color }}>{t.rank}</span>{' '}
              {dur > 0 ? (
                <>
                  sand ↑ {dur}ms{t.topFill > 0 ? ` · top +${Math.round(dur * 0.65)}ms delay` : ''}{t.bottomFill >= 0.8 ? ' · neck pulse' : ''}
                </>
              ) : 'outline pulse'}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Backdrop atmosphere preview ──────────────────────────────────────────────

function BackdropPreview() {
  return (
    <div style={{
      width: '100%', height: 440, position: 'relative',
      overflow: 'hidden', borderRadius: 16,
      background: 'radial-gradient(ellipse at 50% 55%, #160a38 0%, #04040e 100%)',
    }}>
      {/* Breathing aura */}
      <div style={{
        position: 'absolute', width: 300, height: 300,
        left: '50%', top: '50%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,170,210,0.20) 0%, transparent 70%)',
        animation: 'auraBreathe 3.5s ease-in-out infinite',
        filter: 'blur(30px)', pointerEvents: 'none',
        willChange: 'transform, opacity',
      } as React.CSSProperties}/>

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(2,2,10,0.82) 100%)',
      }}/>

      {/* Card centered */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)', zIndex: 1,
      }}>
        <CardBack uid="backdrop-main"/>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GachaPreviewPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: 'white', padding: '40px 32px' }}>
      <style>{KEYFRAMES}</style>

      <div style={{ fontSize: 10, color: GOLD, letterSpacing: '0.22em', fontFamily: 'monospace', marginBottom: 6 }}>
        PREVIEW — BRAND REVISION 4
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em', fontFamily: 'var(--font-orbitron, monospace)' }}>
        Hyperbolic Daily Spin
      </h1>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 52, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
        Time dilates when you&rsquo;re having fun.
      </p>

      {/* Section 1 — Rarity symbol progression */}
      <section style={{ marginBottom: 60 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 28, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Rarity Symbol Progression — E → A
        </div>
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {RARITIES.map(r => {
            const t = TIERS[r];
            return (
              <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <HourglassSymbol uid={`prog-${r}`} bottomFill={t.bottomFill} topFill={t.topFill} color={t.color}/>
                <div style={{ fontSize: 9, color: t.color, letterSpacing: '0.18em', fontFamily: 'monospace' }}>
                  {t.rank}
                </div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', fontFamily: 'monospace' }}>
                  {t.label}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2 — Fill animation demo */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Fill Animation Demo — Sand Cascade on Reveal
        </div>
        <AnimatedHourglassDemo/>
      </section>

      {/* Section 3 — Card back */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Card Back — Idle
        </div>
        <CardBack uid="preview-back"/>
      </section>

      {/* Section 4 — All five prize tiers */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Prize Tiers — All Five
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {RARITIES.map(r => (
            <div key={r}>
              <PrizeCard rarity={r} uid={`prize-${r}`}/>
              <div style={{ fontSize: 9, color: '#3a3a4a', textAlign: 'center', marginTop: 10, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
                {TIERS[r].label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 — Backdrop atmosphere */}
      <section>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Backdrop Atmosphere
        </div>
        <BackdropPreview/>
      </section>
    </div>
  );
}
