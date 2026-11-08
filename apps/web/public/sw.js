// PlayerPass — Service Worker
// Handles background push notifications

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

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
