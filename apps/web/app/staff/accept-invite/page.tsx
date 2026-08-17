'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// This page handles the no-token case only.
// When a token is present it lives in the URL path: /staff/accept-invite/[token]
// Path-based tokens survive Clerk's session-handshake redirects and
// click-tracking redirect chains that strip query params.

function NoTokenContent() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [hasExistingAccess, setHasExistingAccess] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/hq/auth')
      .then(r => r.json())
      .then(d => setHasExistingAccess(!!d.isStaff))
      .catch(() => {});
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NoTokenContent />
    </Suspense>
  );
}
