'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

type Provider = { id: 'google' | 'discord'; strategy: 'oauth_google' | 'oauth_discord'; label: string };
const PROVIDERS: Provider[] = [
  { id: 'google', strategy: 'oauth_google', label: 'Google' },
  { id: 'discord', strategy: 'oauth_discord', label: 'Discord' },
];

// "Sign-in methods" on Profile: link Google or Discord to this account for one-tap login. Whichever way a player
// signs in, they land in the same account with the same XP and points.
export default function ConnectedAccounts() {
  const { user, isLoaded } = useUser();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!isLoaded || !user) return null;

  const accountFor = (p: Provider) => user.externalAccounts.find(a => a.provider === p.id || String(a.provider) === p.strategy);
  // Never let someone remove their last way in
  const signInMethods = user.externalAccounts.length + (user.passwordEnabled ? 1 : 0);

  const connect = async (p: Provider) => {
    setBusy(p.id);
    setError('');
    try {
      const res = await user.createExternalAccount({ strategy: p.strategy, redirectUrl: window.location.href });
      const url = res.verification?.externalVerificationRedirectURL;
      if (url) { window.location.href = url.toString(); return; }
      setError(`Could not start the ${p.label} connection. Try again.`);
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || `Could not connect ${p.label}. Try again.`);
    } finally { setBusy(null); }
  };

  const disconnect = async (p: Provider) => {
    const acct = accountFor(p);
    if (!acct) return;
    setBusy(p.id);
    setError('');
    try {
      await acct.destroy();
      await user.reload();
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage || `Could not disconnect ${p.label}. Try again.`);
    } finally { setBusy(null); }
  };

  return (
    <div className="rounded-2xl border border-border-token bg-surface p-4">
      <h3 className="text-sm font-bold text-primary">Sign-in methods</h3>
      <p className="mt-0.5 text-xs text-secondary">Connect Google or Discord to sign in with one tap. It&apos;s the same account either way.</p>
      <ul className="mt-3 space-y-2">
        {PROVIDERS.map(p => {
          const acct = accountFor(p);
          const lastOne = !!acct && signInMethods <= 1;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl bg-elevated px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-primary">{p.label}</div>
                <div className="truncate text-xs text-tertiary">
                  {acct ? (acct.username || acct.emailAddress || 'Connected') : 'Not connected'}
                </div>
              </div>
              {acct ? (
                <button
                  type="button"
                  onClick={() => disconnect(p)}
                  disabled={busy !== null || lastOne}
                  title={lastOne ? 'This is your only way to sign in' : undefined}
                  className="shrink-0 text-xs font-semibold text-secondary hover:text-primary disabled:opacity-40"
                >
                  {busy === p.id ? '…' : lastOne ? 'Only sign-in' : 'Disconnect'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => connect(p)}
                  disabled={busy !== null}
                  className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busy === p.id ? '…' : 'Connect'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
