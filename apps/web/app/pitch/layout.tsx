import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Store pitch material: reachable by link, kept out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PitchLayout({ children }: { children: ReactNode }) {
  return children;
}
