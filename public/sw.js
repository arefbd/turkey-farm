/* سرویس‌ورکر مزرعه بوقلمون — نسخه v2.0.4 - پایدار و ضد خطا */
const VERSION = 'v2.0.4';
const CACHE = 'turkey-farm-' + VERSION;
const SCOPE = self.registration.scope;

const PRECACHE = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined),
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
  // فقط درخواست‌های هم‌مبدأ
  if (url.origin !== self.location.origin) return;

  // ناوبری اصلی صفحه: اول تلاش برای دریافت از شبکه، در صورت قطعی یا خطا بازگشت به کش
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SCOPE + 'index.html', copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(SCOPE + 'index.html').then((hit) => hit || caches.match(SCOPE))),
    );
    return;
  }

  // فایل‌های استاتیک و دارایی‌ها: اول کش، اگر نبود شبکه
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    }).catch(() => fetch(req)),
  );
});
