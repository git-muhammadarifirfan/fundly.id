/* ============================================
   Fundly.id - Service Worker (dibuat otomatis saat build, lihat vite.config.ts)
   - Aplikasi tetap bisa dibuka tanpa internet (app shell + semua halaman di-cache)
   - Data keuangan TIDAK di-cache di sini: data offline ditangani aplikasi
     (cache perangkat + antrian transaksi yang dikirim saat online)
   ============================================ */

const VERSION = '__VERSION__';
const PRECACHE_PREFIX = 'fundly-precache-';
const PRECACHE = PRECACHE_PREFIX + VERSION;
const RUNTIME = 'fundly-runtime';
const PRECACHE_URLS = __PRECACHE_URLS__;
const NAV_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Simpan 2 versi terakhir agar tab lama yang masih terbuka tetap bisa memuat halamannya
      const keys = (await caches.keys()).filter((k) => k.startsWith(PRECACHE_PREFIX)).sort();
      const stale = keys.filter((k) => k !== PRECACHE).slice(0, -1);
      await Promise.all(stale.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith('/assets/') || /\.(png|svg|ico|webp|jpg|jpeg|webmanifest|woff2?)$/i.test(url.pathname);

async function cachedShell() {
  const current = await caches.open(PRECACHE);
  return (await current.match('/index.html')) || (await caches.match('/index.html')) || (await caches.match('/'));
}

async function networkFirstNavigation(request) {
  // Sudah pasti offline: jangan menunggu jaringan sama sekali
  if (self.navigator && self.navigator.onLine === false) {
    const shell = await cachedShell();
    if (shell) return shell;
  }
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT_MS)),
    ]);
    return response;
  } catch {
    return (await cachedShell()) || Response.error();
  }
}

async function cacheFirst(request, url) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && isStaticAsset(url)) {
    const copy = response.clone();
    caches.open(RUNTIME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Supabase, Google Fonts, dll: biarkan browser menangani langsung
  if (url.origin !== self.location.origin) return;
  // API (mis. harga emas) selalu dari jaringan
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (isStaticAsset(url)) event.respondWith(cacheFirst(request, url));
});

// Ketuk notifikasi → buka / fokuskan aplikasi di halaman terkait
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
