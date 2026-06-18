// FairTrade Service Worker — verze cache je jediný zdroj pravdy níže (CACHE)
const CACHE = 'fairtrade-v4';
const OFFLINE_PAGE = './index.html';

const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

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
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// === ACTIVATE ===
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

  // Cizí (cross-origin) požadavky NEOBSLUHUJEME — necháme je přímo na prohlížeči.
  // Jinak u nich SW může vrátit Response.error() a rozbít načtení (např. qrcode z unpkg).
  let _sameOrigin = false;
  try { _sameOrigin = new URL(req.url).origin === self.location.origin; } catch (e) {}
  if (!_sameOrigin) return;

  if (req.method !== 'GET' || shouldBypass(req.url)) return;

  // Navigace — Network first, fallback na cached index.html
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
        .catch(async () => {
          const cached = await caches.match(OFFLINE_PAGE);
          return cached || new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>FairTrade</title></head><body style="font-family:sans-serif;text-align:center;padding:3rem"><h2>Jste offline</h2><p>Připojte se k internetu a zkuste to znovu.</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Statické soubory (ikony, manifest) — Cache first, fallback network.
  // Match dle pathname/koncovky, ne substringem v celé URL (zabrání chybnému
  // obsloužení nesouvisejících adres jako /api/manifest nebo ?iconset=...).
  let _path = '';
  try { _path = new URL(req.url).pathname; } catch (e) {}
  if (_path.endsWith('/manifest.json') || /\/icon-\d+\.png$/.test(_path)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // Vše ostatní — Network first, fallback cache nebo chyba
  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(req);
      return cached || Response.error();
    })
  );
});

// === PUSH NOTIFIKACE ===
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
