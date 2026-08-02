'use client';

import { useState, useEffect } from 'react';

export default function PushNotificationPrompt() {
  const [status, setStatus] = useState<'idle' | 'prompt' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') setStatus('subscribed');
    else if (perm === 'denied') setStatus('denied');
    else setStatus('prompt');
  }, []);

  const subscribe = async () => {
    setStatus('subscribing');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as unknown as ArrayBuffer,
      });

      await fetch('/api/player/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      setStatus('subscribed');
    } catch (err: any) {
      console.error('push subscribe error:', err);
      if (Notification.permission === 'denied') setStatus('denied');
      else setStatus('prompt');
    }
  };

  if (status === 'idle' || status === 'subscribed' || status === 'unsupported' || status === 'denied') {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-6 md:w-80">
      <div className="bg-surface border border-border-token rounded-2xl p-4 shadow-2xl flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">🔔</div>
        <div className="flex-1 min-w-0">
          <p className="text-primary font-semibold text-sm">Stay in the loop</p>
          <p className="text-secondary text-xs mt-0.5 leading-snug">
            Get notified when events start, XP is awarded, and leaderboards change.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={subscribe}
              disabled={status === 'subscribing'}
              className="flex-1 py-2 px-3 bg-accent text-accent-fg text-xs font-bold rounded-xl disabled:opacity-60 transition-opacity hover:opacity-90"
            >
              {status === 'subscribing' ? 'Enabling…' : 'Enable'}
            </button>
            <button
              type="button"
              onClick={() => setStatus('subscribed')}
              className="py-2 px-3 text-tertiary text-xs rounded-xl hover:text-secondary transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}
