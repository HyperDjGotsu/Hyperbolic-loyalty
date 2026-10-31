import { notFound } from 'next/navigation';
import { requireNetworkAdmin } from '@/lib/auth-helpers';

// The pricing and economics calculator is internal. Anyone who isn't a network admin gets the same 404 as a made-up address.
export default async function CalculatorLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireNetworkAdmin();
  if (!admin) notFound();
  return <>{children}</>;
}
