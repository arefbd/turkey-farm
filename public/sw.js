/* سرویس‌ورکر مزرعه بوقلمون — نسخه v3.0.0 - پایدار و ضد آلودگی فایل PDF */
const VERSION = 'v3.0.0';
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
        // پاکسازی کامل تمامی کش‌های قبلی بدون استثنا
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim())
      .then(() => {
        // بازنشانی خودکار تب‌ها یا پنجره‌هایی که ممکن است در نمایش اشتباه PDF گیر کرده باشند
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          for (const client of clients) {
            if (client.url && (client.url.includes('.pdf') || client.url.includes('manual'))) {
              client.navigate(SCOPE);
            }
          }
        });
      }),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // فقط درخواست‌های هم‌مبدأ
  if (url.origin !== self.location.origin) return;

  // جلوگیری قاطع از ذخیره یا ناوبری فایل‌های PDF در کش اصلی برنامه
  if (url.pathname.endsWith('.pdf')) {
    if (url.pathname.includes('manual.pdf')) {
      // هدایت درخواست فایل قدیمی به صفحه اصلی سامانه
      event.respondWith(Response.redirect(SCOPE, 302));
      return;
    }
    // سایر درخواست‌های PDF (مانند راهنمای درون پوشه docs) به صورت عادی بدون دخالت کش تحویل شوند
    return;
  }

  // ناوبری اصلی صفحه: تلاش برای دریافت از شبکه، در صورت قطعی یا آفلاین بودن بازگشت به کش معتبر HTML
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // فقط در صورتی که پاسخ 200 و نوع محتوا حتما HTML باشد در کش ذخیره شود
          const contentType = (res && res.headers && res.headers.get('content-type')) || '';
          if (res && res.status === 200 && contentType.includes('text/html')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SCOPE + 'index.html', copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          const hit = (await cache.match(SCOPE + 'index.html')) || (await cache.match(SCOPE));
          if (hit) {
            const hitType = (hit.headers && hit.headers.get('content-type')) || '';
            // اطمینان قطعی از اینکه فایل کش شده فایل پی‌دی‌اف نباشد
            if (hitType.includes('text/html')) {
              return hit;
            }
            // کش نامعتبر و فاسد شده را سریعاً حذف کن
            await cache.delete(SCOPE + 'index.html');
            await cache.delete(SCOPE);
          }
          // در بدترین حالت، پاسخ HTML ایمن بازگردانده شود تا هرگز پی‌دی‌اف دیده نشود
          return new Response(
            '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta http-equiv="refresh" content="2;url=' + SCOPE + '"><title>مزرعه بوقلمون</title><style>body{font-family:sans-serif;text-align:center;padding:50px 20px;background:#FAF5FF;color:#3A0B72;}button{padding:12px 24px;border-radius:12px;background:#6D28D9;color:#fff;border:none;font-size:16px;cursor:pointer;margin-top:20px;}</style></head><body><h2>در حال بارگذاری مجدد سامانه مزرعه بوقلمون...</h2><p>لطفاً چند لحظه شکیبا باشید...</p><button onclick="window.location.replace(\'' + SCOPE + '\')">بارگذاری مجدد صفحه</button></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        }),
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
