import type { Metadata } from 'next';
import { getPublicEventBasics, formatEventWhen } from '@/lib/public-event';
import { getGame } from '@/lib/games';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const ev = await getPublicEventBasics(params.id).catch(() => null);
  if (!ev) return { title: 'Event | Player Pass' };
  const game = ev.gameId ? getGame(ev.gameId)?.name : null;
  const description = [formatEventWhen(ev.scheduledAt), ev.storeName, game, ev.isFree ? 'Free' : null].filter(Boolean).join(' · ');
  return {
    title: `${ev.name} | Player Pass`,
    description,
    openGraph: { title: ev.name, description, type: 'website', siteName: 'Player Pass' },
    twitter: { card: 'summary_large_image', title: ev.name, description },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
