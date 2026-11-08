// Browser side of notifications: asks permission (must run from a tap), subscribes this device and saves it.
// Each Home Screen icon on iPhone counts as its own app with its own permission, so this is safe to call again
// whenever a device is not yet set up.
import { SW_URL } from '@/lib/sw-url';

export type PushSetupResult = { ok: true } | { ok: false; reason: 'unsupported' | 'denied' | 'failed' };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

export async function ensurePushSubscription(): Promise<PushSetupResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  try {
    if (Notification.permission === 'denied') return { ok: false, reason: 'denied' };
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return { ok: false, reason: 'denied' };
    }

    const reg = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as unknown as ArrayBuffer,
      });
    }

    // Always save it: this makes sure the server holds THIS device's address, not an old one
    const res = await fetch('/api/player/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    return res.ok ? { ok: true } : { ok: false, reason: 'failed' };
  } catch (err) {
    console.error('push setup error:', err);
    return { ok: false, reason: 'failed' };
  }
}
