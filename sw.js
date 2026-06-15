// FairTrade Service Worker v1.1
const CACHE = 'fairtrade-v2';
const OFFLINE_PAGE = './index.html';

// Soubory ke cachování při instalaci
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Domény, které NIKDY necachujeme (API, autentizace)
const BYPASS_DOMAINS = [
  'supabase.co',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'images.unsplash.com',
  'api.qrserver.com'
];

function shouldBypass(url) {
  try {
    const host = new URL(url).hostname;
    return BYPASS_DOMAINS.some(d => host.includes(d));
  } catch { return false; }
}

// === INSTALL ===
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE.filter(Boolean)))
      .then(() => self.skipWaiting())
  );
});

// === ACTIVATE — smaž staré cache ===
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// === FETCH ===
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignoruj ne-GET requesty a API volání
  if (req.method !== 'GET' || shouldBypass(req.url)) return;

  // Navigace (otevření stránky) — Network first, fallback na cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(OFFLINE_PAGE, clone));
          }
          return res;
        })
        .catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // Statické soubory (ikony, manifest) — Cache first
  if (req.url.includes('icon') || req.url.includes('manifest')) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // Vše ostatní — Network first
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

// === PUSH NOTIFIKACE (připraveno pro budoucí použití) ===
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'FairTrade', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: data.url || './' },
      vibrate: [200, 100, 200],
      silent: false,
      renotify: true,
      tag: 'fairtrade-push'
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});
