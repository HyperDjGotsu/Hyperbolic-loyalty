import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Store demo: reachable by link, kept out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: ReactNode }) {
  return children;
}
