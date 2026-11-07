import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'PlayerPass', robots: { index: false, follow: false } };

export default function PitchAccessLayout({ children }: { children: ReactNode }) {
  return children;
}
