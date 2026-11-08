// PlayerPass — Service Worker
// Handles background push notifications

const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'none';

// Answers "which version are you?" so the Profile page can show it
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'pp-version' && event.source) {
    event.source.postMessage({ type: 'pp-version', v: SW_VERSION });
  }
});

// Take over as soon as a new version is installed, so changes to this file apply without a full app restart
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'PlayerPass', body: event.data.text() };
  }

  const { title, body, icon, badge, url, tag, count } = payload;

  // Number on the home-screen icon, where the phone supports it
  if (typeof count === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(count).catch(() => {});
  }

  event.waitUntil(
    self.registration.showNotification(title || 'PlayerPass', {
      body: body || '',
      icon: icon || '/icons/icon-192.png',
      badge: badge || '/icons/icon-192.png',
      tag: tag || 'pp-default',
      data: { url: url || '/dashboard' },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (self.navigator && 'clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil((async () => {
    // iPhone ignores the link when a tap launches a Home Screen app and just opens its start page. So first leave a
    // note of where to go; the page reads it as soon as it opens (or comes back to the front) and goes there.
    try {
      const cache = await caches.open('pp-nav');
      await cache.put('/pp-pending-nav', new Response(JSON.stringify({ url, at: Date.now() })));
    } catch (e) { /* storage unavailable: the message / openWindow below still try */ }

    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    try {
      const cache = await caches.open('pp-nav');
      await cache.put('/pp-last-tap', new Response(JSON.stringify({ url, at: Date.now(), windows: clientList.length, v: SW_VERSION })));
    } catch (e) { /* diagnostics only */ }
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        client.postMessage({ type: 'pp-navigate', url });
        try { client.navigate(url); } catch (e) { /* the message above covers it */ }
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
