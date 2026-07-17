'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

// Strip the token from the browser address bar after use
function clearTokenFromUrl() {
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/staff/accept-invite');
  }
}

type Status = 'idle' | 'loading' | 'success' | 'error';

function AcceptInviteContent() {
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (!isLoaded || !token) return;
    if (!isSignedIn) return;
    if (status !== 'idle') return;

    setStatus('loading');
    // Strip token from URL immediately before the network request
    clearTokenFromUrl();

    fetch('/api/player/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus('error');
          setMessage(data.error ?? 'Failed to accept invitation');
        } else {
          setStatus('success');
          setRole(data.role ?? '');
          const roleLabel = data.role === 'store_manager' ? 'Store Manager' : 'Store Staff';
          if (data.code === 'ALREADY_ASSIGNED') {
            setMessage(`You already have the ${roleLabel} role at this store.`);
          } else if (data.code === 'UPGRADED') {
            setMessage(`Your role has been upgraded to ${roleLabel}.`);
          } else {
            setMessage(`You are now ${roleLabel}.`);
          }
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error — please try again.');
      });
  }, [isLoaded, isSignedIn, token, status]);

  if (!isLoaded) {
    return <LoadingState label="Loading..." />;
  }

  if (!token) {
    return <ErrorState message="Invalid invitation link — no token found." />;
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

  if (status === 'error') {
    return <ErrorState message={message} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-purple-800/40">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to the Team</h1>
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

function ErrorState({ message }: { message: string }) {
  const router = useRouter();
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
