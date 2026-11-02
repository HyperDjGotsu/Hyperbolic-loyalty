import { notFound } from 'next/navigation';
import { requireAnyStaff } from '@/lib/auth-helpers';

// The pricing and economics calculator is internal. Anyone who isn't HQ staff gets the same 404 as a made-up address.
export default async function CalculatorLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireAnyStaff();
  if (!staff) notFound();
  return <>{children}</>;
}
