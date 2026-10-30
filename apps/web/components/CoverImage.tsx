'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gameArtCandidates } from '@/lib/games';


// Tries each image in order and reports `failed` once all of them are exhausted.
// An <img> that 404s before React hydrates never fires onError, which leaves a broken-image icon,
// so the already-finished load is also checked whenever the current candidate changes.
function useImageFallback(urls: string[]) {
  const ref = useRef<HTMLImageElement>(null);
  const key = urls.join('|');
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [key]);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setIdx(i => i + 1);
  }, [idx, key]);
  return { ref, url: urls[idx], failed: idx >= urls.length, onError: () => setIdx(i => i + 1) };
}

// Picture-led card top. Shows the game's cover art; until the art exists (or if it fails to
// load) it falls back to a gradient in the game's color so cards never look empty.
export function CoverImage({
  gameId,
  storeId,
  color = '#3b82f6',
  src,
  className = '',
  children,
}: {
  gameId?: string | null;
  storeId?: string | null;
  color?: string;
  src?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const { ref, url, failed, onError } = useImageFallback([...(src ? [src] : []), ...gameArtCandidates(gameId, storeId)]);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 35%, #000))` }}
    >
      {!failed && (
        <img
          key={url}
          src={url}
          ref={ref}
          alt=""
          loading="lazy"
          onError={onError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      {children}
    </div>
  );
}

// Full-bleed art behind a hero card. Put `isolate` on the parent; this sits at -z-10 under its content.
// Dark scrim keeps white text readable on any image; gradient shows until the art exists.
export function HeroBackdrop({ gameId, storeId, src, color }: { gameId?: string | null; storeId?: string | null; src?: string | null; color?: string }) {
  const { ref, url, failed, onError } = useImageFallback([...(src ? [src] : []), ...gameArtCandidates(gameId, storeId)]);
  const base = color || 'var(--accent)';
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10"
      style={{ backgroundImage: `linear-gradient(135deg, ${base}, color-mix(in srgb, ${base} 30%, #0b1220))` }}
    >
      {!failed && (
        <img
          key={url}
          src={url}
          ref={ref}
          alt=""
          onError={onError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />
    </div>
  );
}

// First real favorite game (the system 'overall' entry doesn't count).
export function pickBackdropGame(favorites: string[] | undefined | null): string | undefined {
  return (favorites || []).find(id => id && id !== 'overall');
}
