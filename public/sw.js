/* سرویس‌ورکر مزرعه بوقلمون — کش دارایی‌های ثابت + پشتیبان آفلاین */
const VERSION = 'v1';
const CACHE = 'turkey-farm-' + VERSION;
const SCOPE = self.registration.scope;

const PRECACHE = [SCOPE, SCOPE + 'index.html', SCOPE + 'manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('turkey-farm-') && k !== CACHE).map((k) => caches.delete(k))),
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
