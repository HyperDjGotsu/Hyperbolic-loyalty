'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

function clearTokenFromUrl() {
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/staff/accept-invite');
  }
}

type Status = 'idle' | 'loading' | 'success' | 'already_active' | 'error';

function AcceptInviteContent() {
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [hasExistingAccess, setHasExistingAccess] = useState(false);

  // If no token but user is signed in, check if they already have staff access
  useEffect(() => {
    if (!isLoaded || !isSignedIn || token) return;
    fetch('/api/hq/auth')
      .then(r => r.json())
      .then(d => setHasExistingAccess(!!d.isStaff))
      .catch(() => {});
  }, [isLoaded, isSignedIn, token]);

  useEffect(() => {
    if (!isLoaded || !token || !isSignedIn) return;
    if (status !== 'idle') return;

    setStatus('loading');
    clearTokenFromUrl();

    fetch('/api/player/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (res.ok) {
          const roleLabel = data.role === 'store_manager' ? 'Store Manager' : 'Store Staff';
          setMessage(`You are now ${roleLabel}.`);
          setStatus('success');
          return;
        }

        // Already accepted — check if this user has staff access anyway
        if (res.status === 410 && data.error?.includes('already accepted')) {
          fetch('/api/hq/auth')
            .then(r => r.json())
            .then(d => {
              if (d.isStaff) {
                setMessage('Your staff access is already active.');
                setStatus('already_active');
              } else {
                setStatus('error');
                setMessage('This invitation has already been accepted by another account.');
              }
            })
            .catch(() => {
              setStatus('error');
              setMessage(data.error ?? 'Failed to accept invitation');
            });
          return;
        }

        setStatus('error');
        setMessage(data.error ?? 'Failed to accept invitation');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error — please try again.');
      });
  }, [isLoaded, isSignedIn, token, status]);

  // Redirect to HQ after short delay on success
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => router.push('/hq?welcome=staff'), 1500);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  if (!isLoaded) return <LoadingState label="Loading..." />;

  // Missing token
  if (!token) {
    if (!isSignedIn) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
          <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
            <div className="text-4xl mb-4">🔗</div>
            <h1 className="text-2xl font-bold text-white mb-2">Incomplete Invitation Link</h1>
            <p className="text-gray-400 mb-6">
              The invitation token is missing. Open the original invitation link or ask your manager for a new one.
            </p>
            <SignInButton mode="redirect" fallbackRedirectUrl="/hq">
              <button className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      );
    }

    if (hasExistingAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
          <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-purple-800/40">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-white mb-2">Staff Access Active</h1>
            <p className="text-gray-300 mb-6">
              This invitation link is incomplete, but your staff access is already active.
            </p>
            <button
              onClick={() => router.push('/hq')}
              className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors"
            >
              Go to HQ
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-yellow-800/40">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-white mb-2">Incomplete Invitation Link</h1>
          <p className="text-gray-400 mb-6">
            The invitation token is missing. Open the original invitation link or ask your manager for a new one.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
          <div className="text-4xl mb-4">🎮</div>
          <h1 className="text-2xl font-bold text-white mb-2">Staff Invitation</h1>
          <p className="text-gray-400 mb-6">
            Sign in with the email address this invitation was sent to.
          </p>
          <SignInButton
            mode="redirect"
            fallbackRedirectUrl={`/staff/accept-invite?token=${token}`}
          >
            <button className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors">
              Sign In to Accept
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return <LoadingState label="Accepting invitation..." />;
  }

  if (status === 'already_active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-purple-800/40">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Staff Access Active</h1>
          <p className="text-gray-300 mb-6">{message}</p>
          <button
            onClick={() => router.push('/hq')}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors"
          >
            Go to HQ
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-red-800/40">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invitation Error</h1>
          <p className="text-gray-400 mb-6">{message}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // success — show briefly before redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-purple-800/40">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to the Team</h1>
        <p className="text-gray-300 mb-6">{message}</p>
        <p className="text-gray-500 text-sm">Taking you to HQ...</p>
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
