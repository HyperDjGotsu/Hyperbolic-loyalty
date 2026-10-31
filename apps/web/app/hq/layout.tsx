import { notFound } from 'next/navigation';
import { getStaffContext } from '@/lib/auth-helpers';

// Staff HQ only exists for people with a staff role. Everyone else, signed in or not, gets the same 404 a made-up
// address would, and none of the HQ screen's code is sent to them.
export default async function HQLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffContext();
  if (!staff) notFound();
  return <>{children}</>;
}
