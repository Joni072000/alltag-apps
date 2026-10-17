// Service Worker – empfängt Mitteilungen, auch wenn die App geschlossen ist
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Gym', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'gym',
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ziel = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const zielOrdner = ziel.split('#')[0].replace(/[^/]*$/, '');
    // 1. Ein Fenster der passenden App ist schon offen (z. B. Kalender)
    for (const f of fenster) {
      if (f.url.startsWith(zielOrdner)) {
        if (ziel.includes('#') && f.url !== ziel && 'navigate' in f) await f.navigate(ziel);
        return f.focus();
      }
    }
    // 2. Sonst die App neu öffnen
    return self.clients.openWindow(ziel);
  })());
});
