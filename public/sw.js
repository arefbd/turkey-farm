/* سرویس‌ورکر مزرعه بوقلمون — کش دارایی‌های ثابت + پشتیبان آفلاین */
const VERSION = 'v2.0.2';
const CACHE = 'turkey-farm-' + VERSION;
const SCOPE = self.registration.scope;

const PRECACHE = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'manifest.webmanifest',
  SCOPE + 'icon-192.png',
  SCOPE + 'icon-512.png',
  SCOPE + 'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // فقط همان مبدأ؛ Supabase و فونت CDN دست‌نخورده می‌مانند
  if (url.origin !== self.location.origin) return;

  // ناوبری: شبکه اول، در نبود شبکه از کش
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SCOPE + 'index.html', copy));
          return res;
        })
        .catch(() => caches.match(SCOPE + 'index.html').then((hit) => hit || caches.match(SCOPE))),
    );
    return;
  }

  // دارایی‌های هش‌دار Vite تغییرناپذیرند: کش اول
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
