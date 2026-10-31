'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export type Lane = 'player' | 'store';
export const LANE_COOKIE = 'pp_lane';

// Landing-page door links. Only the player door is remembered (a cookie holding just "player", no personal data):
// returning signed-out players go straight to sign-in. Store visitors are never remembered, they see the doors again next time.
export function LaneLink({ href, lane, className, children }: { href: string; lane: Lane; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (lane === 'player') document.cookie = `${LANE_COOKIE}=player; path=/; max-age=31536000; samesite=lax`;
      }}
    >
      {children}
    </Link>
  );
}

export function clearLane() {
  document.cookie = `${LANE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

// Quiet footer link on sign-in for a remembered player who actually wanted the store side. Forgets the choice and goes to the pitch.
export function StoreSideLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link href="/pitch" className={className} onClick={clearLane}>
      {children}
    </Link>
  );
}
