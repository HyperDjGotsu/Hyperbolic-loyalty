import { notFound } from 'next/navigation';

// Throwaway design exploration. Mock data only, never served on production.
export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <>{children}</>;
}
