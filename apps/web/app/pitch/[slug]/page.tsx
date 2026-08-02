import { notFound } from 'next/navigation';
import { getConfig } from '../configs';
import PitchContent from '../PitchContent';

export default function PitchSlugPage({ params }: { params: { slug: string } }) {
  const cfg = getConfig(params.slug);
  if (!cfg) notFound();
  return <PitchContent cfg={cfg} />;
}

export function generateStaticParams() {
  return [{ slug: 'ggc' }];
}
