'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export type Lane = 'player' | 'store';
export const LANE_COOKIE = 'pp_lane';

// A link that remembers which landing-page door was chosen. The cookie holds only "player" or "store",
// no personal data, and the landing page uses it to put that door first on the next visit.
export function LaneLink({ href, lane, className, children }: { href: string; lane: Lane; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        document.cookie = `${LANE_COOKIE}=${lane}; path=/; max-age=31536000; samesite=lax`;
      }}
    >
      {children}
    </Link>
  );
}
