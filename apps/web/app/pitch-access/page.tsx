'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function Form() {
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/pitch-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not unlock. Try again.'); setBusy(false); return; }
      const next = params.get('next') ?? '';
      // Same-site pitch paths only
      window.location.assign(/^\/(pitch|demo)(\/[A-Za-z0-9\-_/]*)?(\?[A-Za-z0-9=&\-_%.]*)?$/.test(next) ? next : '/pitch');
    } catch {
      setError('Could not unlock. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border-token bg-surface p-6">
      <h1 className="font-display text-2xl font-extrabold text-primary">PlayerPass for stores</h1>
      <p className="text-sm text-secondary">This page is private for now. Enter the password you were given.</p>
      <input
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-xl border border-border-token bg-input px-4 py-3 text-primary focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy || password.length === 0} className="w-full rounded-xl bg-accent py-3 font-bold text-accent-fg disabled:opacity-50">
        {busy ? 'Checking…' : 'Continue'}
      </button>
    </form>
  );
}

export default function PitchAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-6">
      <Suspense fallback={null}>
        <Form />
      </Suspense>
    </div>
  );
}
