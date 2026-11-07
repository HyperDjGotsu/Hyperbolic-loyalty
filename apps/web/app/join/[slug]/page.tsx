'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { normalizeJoinCodeClient } from '@/lib/join-code-client';

// Landing page for the QR code at a store: /join/<store slug>?c=<join code>
// Signed in: joins the store right away. Signed out: remembers the store and code, then sends the player to sign up.
interface StoreInfo { id: string; name: string; city: string | null; slug: string }

function JoinInner() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const code = normalizeJoinCodeClient(search.get('c'));
  const [store, setStore] = useState<StoreInfo | null | undefined>(undefined);
  const [status, setStatus] = useState<'idle' | 'joining' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stores')
      .then(r => r.json())
      .then(d => setStore((d.stores ?? []).find((s: StoreInfo) => s.slug === slug) ?? null))
      .catch(() => setStore(null));
  }, [slug]);

  async function join() {
    setStatus('joining');
    setError('');
    try {
      const res = await fetch('/api/player/join-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        try { localStorage.removeItem('pp_join'); } catch {}
        router.replace('/dashboard');
        return;
      }
      if (data.code === 'no_player') {
        // Signed in but has not finished onboarding yet
        try { localStorage.setItem('pp_join', JSON.stringify({ slug, code })); } catch {}
        router.replace('/onboarding');
        return;
      }
      setError(data.error || 'That code did not work. Check it with the store.');
      setStatus('error');
    } catch {
      setError('Connection error. Please try again.');
      setStatus('error');
    }
  }

  function signUp() {
    try { localStorage.setItem('pp_join', JSON.stringify({ slug, code })); } catch {}
    router.push('/sign-up');
  }

  function signIn() {
    try { localStorage.setItem('pp_join', JSON.stringify({ slug, code })); } catch {}
    router.push(`/sign-in?redirect_url=${encodeURIComponent(`/join/${slug}?c=${code ?? ''}`)}`);
  }

  if (store === undefined || !isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-base text-secondary text-sm">Loading…</div>;
  }

  if (!store || !code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-primary text-xl font-bold mb-2">This link did not work</h1>
          <p className="text-secondary text-sm mb-6">Ask the store for their join QR code, or open PlayerPass and enter the code by hand.</p>
          <button onClick={() => router.push('/')} className="bg-accent text-accent-fg font-bold px-6 py-3 rounded-xl">Open PlayerPass</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-secondary text-sm mb-2">You are joining</p>
        <h1 className="text-primary text-2xl font-bold mb-1">{store.name}</h1>
        {store.city && <p className="text-secondary text-sm mb-8">{store.city}, CA</p>}

        {isSignedIn ? (
          <button onClick={join} disabled={status === 'joining'}
            className="w-full bg-accent text-accent-fg font-bold py-4 rounded-xl disabled:opacity-50">
            {status === 'joining' ? 'Joining…' : `Join ${store.name}`}
          </button>
        ) : (
          <div className="space-y-3">
            <button onClick={signUp} className="w-full bg-accent text-accent-fg font-bold py-4 rounded-xl">Create account and join</button>
            <button onClick={signIn} className="w-full border border-border-strong text-primary font-semibold py-4 rounded-xl">I already have an account</button>
          </div>
        )}
        {error && <p className="text-danger text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <JoinInner />
    </Suspense>
  );
}
