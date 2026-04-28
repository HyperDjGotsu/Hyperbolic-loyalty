'use client';
// PREVIEW ONLY — visual approval before DailyGacha integration
// Route: /dev/gacha-preview

import React from 'react';

// ─── Dimensions ───────────────────────────────────────────────────────────────

const CW = 168;
const CH = 235;
const CX = CW / 2;   // 84
const CY = CH / 2;   // 117.5

// Brand gold — threads through every tier as accent
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
  borderGrad: string; sandFill: number;
}

const TIERS: Record<Rarity, TierDef> = {
  // E — empty hourglass. Silver. Premium-but-modest.
  common: {
    rank: 'E', label: 'E-TIER', sandFill: 0,
    color: '#8ca0b0', stroke: '#aabccc',
    bg: 'radial-gradient(ellipse at 50% 40%, #354050 0%, #121820 100%)',
    holo: 0.18, glow: 'rgba(140,160,176,0.38)', aura: null,
    borderGrad: `linear-gradient(135deg, #506070 0%, ${GOLD}55 35%, #9ab0c0 50%, ${GOLD}55 65%, #506070 100%)`,
  },
  // D — a few grains at the bottom. Cyan.
  uncommon: {
    rank: 'D', label: 'D-TIER', sandFill: 0.2,
    color: '#00b8d8', stroke: '#00c8ea',
    bg: 'radial-gradient(ellipse at 50% 40%, #005870 0%, #011820 100%)',
    holo: 0.18, glow: 'rgba(0,184,216,0.48)', aura: 'rgba(0,184,216,0.18)',
    borderGrad: `linear-gradient(135deg, #00b8d8 0%, ${GOLD}55 38%, #00c8ea 55%, #00b8d8 100%)`,
  },
  // C — half filled. Amethyst.
  rare: {
    rank: 'C', label: 'C-TIER', sandFill: 0.5,
    color: '#9b72cf', stroke: '#b899e0',
    bg: 'radial-gradient(ellipse at 50% 40%, #3d1e6e 0%, #120830 100%)',
    holo: 0.26, glow: 'rgba(155,114,207,0.52)', aura: 'rgba(155,114,207,0.25)',
    borderGrad: `linear-gradient(135deg, #7c3aed 0%, ${GOLD}65 35%, #b899e0 55%, #7c3aed 100%)`,
  },
  // B — mostly full, sand falling through neck. Rose.
  epic: {
    rank: 'B', label: 'B-TIER', sandFill: 0.8,
    color: '#c45680', stroke: '#e07099',
    bg: 'radial-gradient(ellipse at 50% 40%, #6e1838 0%, #280010 100%)',
    holo: 0.34, glow: 'rgba(196,86,128,0.54)', aura: 'rgba(196,86,128,0.28)',
    borderGrad: `linear-gradient(135deg, #be185d 0%, ${GOLD}75 35%, #e07099 55%, #be185d 100%)`,
  },
  // A — overflowing cosmic sand. Gold.
  legendary: {
    rank: 'A', label: 'A-TIER', sandFill: 1.0,
    color: GOLD, stroke: '#dfc070',
    bg: 'radial-gradient(ellipse at 50% 40%, #7a5010 0%, #2a1400 100%)',
    holo: 0.55, glow: 'rgba(201,168,76,0.62)', aura: 'rgba(201,168,76,0.35)',
    borderGrad: `linear-gradient(135deg, ${GOLD} 0%, #dfc070 30%, ${GOLD} 50%, #ffcc44 70%, ${GOLD} 100%)`,
  },
};

// ─── Hourglass geometry ────────────────────────────────────────────────────────
//
// Parameterized so the same math works for both the small symbol (~40×54px)
// and the large center mark (~54×74px in card SVG space).

interface HGP { cx: number; cy: number; w: number; h: number; nw: number; nh: number; }

// Outline path (closed polygon, classic hourglass silhouette)
function hgOutline({ cx, cy, w, h, nw, nh }: HGP): string {
  const hw = w/2, hh = h/2, hnw = nw/2, hnh = nh/2;
  return `M${cx-hw},${cy-hh} L${cx+hw},${cy-hh} L${cx+hnw},${cy-hnh} ` +
         `L${cx+hnw},${cy+hnh} L${cx+hw},${cy+hh} L${cx-hw},${cy+hh} ` +
         `L${cx-hnw},${cy+hnh} L${cx-hnw},${cy-hnh} Z`;
}

// Sand in bottom chamber at fill 0–1
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

// Sand filling the neck (B and A tiers)
function hgNeckFill({ cx, cy, nw, nh }: HGP): string {
  const hnw = nw/2, hnh = nh/2;
  return `${cx-hnw},${cy-hnh} ${cx+hnw},${cy-hnh} ${cx+hnw},${cy+hnh} ${cx-hnw},${cy+hnh}`;
}

// Sand pooling at the bottom of the top chamber (A tier)
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

// Params for the small rarity indicator symbol (in its own 40×54 SVG)
const SYM: HGP = { cx: 20, cy: 27, w: 36, h: 50, nw: 6, nh: 8 };

// Params for the large center mark (in the full 168×235 card SVG)
const MARK: HGP = { cx: CX, cy: CY, w: 54, h: 74, nw: 10, nh: 10 };

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes borderHue {
    0%, 100% { filter: hue-rotate(0deg);  }
    50%       { filter: hue-rotate(28deg); }
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
    0%, 100% { transform: translateY(0px);  opacity: 0.75; }
    50%       { transform: translateY(-9px); opacity: 0;    }
  }
`;

// ─── Hourglass rarity symbol ──────────────────────────────────────────────────
//
// Small SVG (40×54) placed at the top of each prize card.
// The sand fill tells the E → A story.

function HourglassSymbol({ uid, fill, color }: { uid: string; fill: number; color: string }) {
  const filtId = `sf-${uid}`;
  const gradId = `sg-${uid}`;

  const outline  = hgOutline(SYM);
  const sandBot  = hgSandBottom(SYM, fill);
  const neck     = fill >= 0.8 ? hgNeckFill(SYM) : null;
  const sandTop  = fill >= 1.0 ? hgSandTop(SYM, 0.28) : null;

  // Overflow particles — A tier only, restrained count
  const overflow = fill >= 1.0 ? [
    { x: 10, y: 1, r: 1.4, delay: '0s'    },
    { x: 30, y: 2, r: 1.1, delay: '0.7s'  },
    { x: 5,  y: 7, r: 0.9, delay: '1.3s'  },
    { x: 35, y: 6, r: 1.2, delay: '0.35s' },
  ] : [];

  return (
    <svg width="40" height="54" viewBox="0 0 40 54" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={filtId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5"/>
        </filter>
        <radialGradient id={gradId} cx="45%" cy="25%" r="75%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="white"  stopOpacity="0.55"/>
          <stop offset="100%" stopColor={color}  stopOpacity="1"/>
        </radialGradient>
      </defs>

      {/* Soft glow bloom behind outline */}
      <path d={outline} fill="none" stroke={color} strokeWidth="7"
        opacity="0.14" filter={`url(#${filtId})`}/>

      {/* Outline */}
      <path d={outline} fill="none" stroke={color} strokeWidth="1.5" opacity="0.82"/>

      {/* Sand — glow pass */}
      {sandBot && (
        <polygon points={sandBot} fill={color} opacity="0.18" filter={`url(#${filtId})`}/>
      )}
      {/* Sand — solid fill */}
      {sandBot && (
        <polygon points={sandBot} fill={`url(#${gradId})`} opacity="0.88"/>
      )}

      {/* Neck sand */}
      {neck && <polygon points={neck} fill={color} opacity="0.90"/>}

      {/* Top chamber pooling (A tier) */}
      {sandTop && <polygon points={sandTop} fill={color} opacity="0.72"/>}

      {/* Overflow particles (A tier) */}
      {overflow.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={color} opacity="0.85"
          style={{ animation: `sandFloat 2.2s ${d.delay} ease-in-out infinite` }}/>
      ))}
    </svg>
  );
}

// ─── Card background SVG (hexagon frame + hourglass center mark) ──────────────
//
// Replaces GeometrySVG. Vesica Piscis is gone.
// Two diagonal corner pips (top-left + bottom-right only).

function CardMarkSVG({ uid, sandColor, sandFill = 0.4 }: {
  uid: string; sandColor: string; sandFill?: number;
}) {
  const filtId  = `cmf-${uid}`;
  const sandGId = `csg-${uid}`;
  const gemId   = `cgm-${uid}`;

  const outline = hgOutline(MARK);
  const sandBot = hgSandBottom(MARK, sandFill);
  const neck    = sandFill >= 0.8 ? hgNeckFill(MARK) : null;
  const sandTop = sandFill >= 1.0 ? hgSandTop(MARK, 0.28) : null;

  // Diagonal pip pair (top-left + bottom-right)
  const pips: [number, number][] = [[14, 18], [154, 217]];

  return (
    <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <filter id={filtId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7"/>
        </filter>
        <radialGradient id={sandGId} cx="45%" cy="25%" r="75%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="white"     stopOpacity="0.35"/>
          <stop offset="100%" stopColor={sandColor} stopOpacity="1"/>
        </radialGradient>
        <radialGradient id={gemId} cx="35%" cy="28%" r="70%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#e8f4ff"/>
          <stop offset="60%"  stopColor={sandColor}/>
          <stop offset="100%" stopColor={sandColor} stopOpacity="0.5"/>
        </radialGradient>
      </defs>

      {/* Hexagon — structural frame, recedes into background */}
      <polygon
        points="144,117.5 114,169.5 54,169.5 24,117.5 54,65.5 114,65.5"
        fill="none" stroke={sandColor} strokeWidth="1" opacity="0.30"/>

      {/* Hourglass — glow bloom (behind outline) */}
      <path d={outline} fill="none" stroke={sandColor} strokeWidth="12"
        opacity="0.07" filter={`url(#${filtId})`}/>

      {/* Hourglass — outline */}
      <path d={outline} fill="none" stroke={sandColor} strokeWidth="1.4" opacity="0.60"/>

      {/* Sand — glow pass */}
      {sandBot && (
        <polygon points={sandBot} fill={sandColor} opacity="0.07" filter={`url(#${filtId})`}/>
      )}
      {/* Sand — fill */}
      {sandBot && (
        <polygon points={sandBot} fill={`url(#${sandGId})`} opacity="0.38"/>
      )}

      {/* Neck sand */}
      {neck && <polygon points={neck} fill={sandColor} opacity="0.42"/>}

      {/* Top chamber sand */}
      {sandTop && <polygon points={sandTop} fill={sandColor} opacity="0.32"/>}

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

// ─── Holographic foil ─────────────────────────────────────────────────────────

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

// ─── Grain texture ────────────────────────────────────────────────────────────

function GrainOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 8,
      opacity: 0.035, pointerEvents: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '200px 200px',
    }}/>
  );
}

// ─── Border system: white edge → gradient border → inner frame ────────────────

function CardBorder({ children, aura, borderGrad }: {
  children: React.ReactNode; aura?: string | null; borderGrad: string;
}) {
  return (
    <div style={{
      display: 'inline-block', padding: 1, borderRadius: 15,
      background: 'rgba(255,255,255,0.22)',
      boxShadow: aura
        ? `0 0 50px 14px ${aura}, 0 0 90px 36px ${aura}50`
        : '0 0 16px 5px rgba(0,160,200,0.16)',
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
        <HoloOverlay opacity={0.15} speed={10}/>
        {/* Card back: neutral cosmic blue sand, ~40% fill */}
        <CardMarkSVG uid={uid} sandColor="#2060a8" sandFill={0.4}/>
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

  return (
    <CardBorder borderGrad={t.borderGrad} aura={t.aura}>
      <div style={{
        width: CW, height: CH, background: t.bg,
        borderRadius: 8, position: 'relative', overflow: 'hidden', userSelect: 'none',
      }}>
        <HoloOverlay opacity={t.holo} speed={isLeg ? 1.8 : 7} legendary={isLeg}/>
        <CardMarkSVG uid={uid} sandColor={t.stroke} sandFill={t.sandFill}/>
        <GrainOverlay/>

        {/* Content — centered column, zIndex above background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 0, paddingTop: 4,
        }}>

          {/* Rarity symbol — indicator, not hero */}
          <HourglassSymbol uid={`sym-${uid}`} fill={t.sandFill} color={t.color}/>

          {/* Tier label */}
          <div style={{
            fontSize: 11, letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.72)',
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

          {/* XP — the hero */}
          <div style={{ lineHeight: 1, fontFamily: 'var(--font-orbitron, monospace)', fontWeight: 900 }}>
            <span style={{
              fontSize: 24, color: t.color,
              textShadow: `0 0 14px ${t.glow}`,
              verticalAlign: 'middle',
            }}>+</span>
            <span style={{
              fontSize: 72, color: 'white',
              textShadow: `0 0 32px ${t.glow}, 0 4px 22px rgba(0,0,0,0.88)`,
              verticalAlign: 'middle',
            }}>{p.xp}</span>
          </div>

          {/* XP unit */}
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

// ─── Backdrop ─────────────────────────────────────────────────────────────────

function BackdropPreview() {
  return (
    <div style={{
      width: '100%', height: 440, position: 'relative',
      overflow: 'hidden', borderRadius: 16,
      background: 'radial-gradient(ellipse at 50% 55%, #160a38 0%, #04040e 100%)',
    }}>
      {/* Breathing cyan aura — single layer, restrained */}
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

      {/* Card */}
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
        PREVIEW — BRAND REVISION 3
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em', fontFamily: 'var(--font-orbitron, monospace)' }}>
        Hyperbolic Daily Spin
      </h1>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginBottom: 52, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
        Time dilates when you&rsquo;re having fun.
      </p>

      {/* Hourglass progression — show the story first */}
      <section style={{ marginBottom: 60 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 28, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Rarity Symbol Progression — E → A
        </div>
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end' }}>
          {RARITIES.map(r => {
            const t = TIERS[r];
            return (
              <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <HourglassSymbol uid={`prog-${r}`} fill={t.sandFill} color={t.color}/>
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

      {/* Card back */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Card Back — Idle
        </div>
        <CardBack uid="preview-back"/>
      </section>

      {/* Prize tiers */}
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

      {/* Backdrop */}
      <section>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Backdrop Atmosphere
        </div>
        <BackdropPreview/>
      </section>
    </div>
  );
}
