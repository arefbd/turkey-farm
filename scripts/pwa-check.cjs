/* بررسی قابلیت نصب PWA روی بیلد نهایی */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'https://arefbd.github.io/turkey-farm/';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const add = (n, ok, extra = '') => {
  results.push({ n, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${extra ? '  — ' + extra : ''}`);
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const bad = [];
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  page.on('pageerror', (e) => bad.push('PAGEERROR ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await sleep(1500);

  /* manifest link */
  const manifestHref = await page.$eval('link[rel="manifest"]', (l) => l.getAttribute('href')).catch(() => null);
  add('لینک manifest در HTML', !!manifestHref, manifestHref || 'ندارد');

  /* manifest محتوا */
  const manifest = await page.evaluate(async (href) => {
    const res = await fetch(href);
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, json: await res.json() };
  }, manifestHref);
  add('خواندن manifest', manifest.ok, manifest.ok ? '' : 'HTTP ' + manifest.status);

  if (manifest.ok) {
    const m = manifest.json;
    add('نام و نام کوتاه', !!m.name && !!m.short_name, `${m.name} / ${m.short_name}`);
    add('start_url و scope', !!m.start_url && !!m.scope, `${m.start_url} | ${m.scope}`);
    add('display: standalone', m.display === 'standalone', m.display);
    add('زبان و جهت', m.lang === 'fa' && m.dir === 'rtl', `${m.lang}/${m.dir}`);
    const sizes = (m.icons || []).map((i) => i.sizes).join(',');
    add('آیکن ۱۹۲ و ۵۱۲', sizes.includes('192x192') && sizes.includes('512x512'), sizes);
    add('آیکن maskable', (m.icons || []).some((i) => (i.purpose || '').includes('maskable')));

    /* همه آیکن‌ها واقعاً در دسترس‌اند */
    const iconChecks = await page.evaluate(async (icons) => {
      const out = [];
      for (const i of icons) {
        const r = await fetch(i.src);
        out.push({ src: i.src, status: r.status, type: r.headers.get('content-type') });
      }
      return out;
    }, m.icons);
    const allIcons = iconChecks.every((c) => c.status === 200 && (c.type || '').includes('png'));
    add('دریافت فایل آیکن‌ها', allIcons, iconChecks.map((c) => c.src + ':' + c.status).join(' '));
    add('shortcuts', (m.shortcuts || []).length >= 2, (m.shortcuts || []).length + ' میان‌بر');
  }

  /* سرویس‌ورکر */
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      supported: true,
      registered: !!reg,
      scope: reg?.scope || null,
      active: !!reg?.active,
    };
  });
  add('پشتیبانی سرویس‌ورکر', sw.supported);
  add('ثبت سرویس‌ورکر', !!sw.registered, sw.scope || '');
  add('سرویس‌ورکر فعال', !!sw.active);

  /* کش آفلاین */
  const cacheInfo = await page.evaluate(async () => {
    const keys = await caches.keys();
    let entries = 0;
    for (const k of keys) entries += (await (await caches.open(k)).keys()).length;
    return { keys, entries };
  });
  add('ساخت کش', cacheInfo.keys.length > 0, `${cacheInfo.keys.join(',')} — ${cacheInfo.entries} آیتم`);

  /* meta های اپل و theme */
  const meta = await page.evaluate(() => ({
    appleIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
    appleCapable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
    theme: document.querySelector('meta[name="theme-color"]')?.content || '',
  }));
  add('آیکن اپل', meta.appleIcon);
  add('قابلیت اپل (standalone)', meta.appleCapable);
  add('theme-color', meta.theme === '#3A0B72', meta.theme);

  /* بررسی رسمی نصب‌پذیری Chrome */
  const cdp = await page.createCDPSession();
  try {
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    add(
      'installabilityErrors خالی است',
      Array.isArray(installabilityErrors) && installabilityErrors.length === 0,
      JSON.stringify(installabilityErrors || []),
    );
  } catch (e) {
    add('installabilityErrors', false, 'CDP: ' + e.message.slice(0, 60));
  }

  /* صفحه ورود سالم */
  const text = await page.evaluate(() => document.body.innerText);
  add('رندر صفحه ورود', text.includes('ورود مدیر سامانه'));

  await browser.close();

  const failed = results.filter((r) => !r.ok).length;
  console.log('\n==================================');
  console.log(`TOTAL ${results.length} | PASS ${results.length - failed} | FAIL ${failed}`);
  console.log('منابع خطادار: ' + bad.length);
  bad.slice(0, 5).forEach((b) => console.log('  ? ' + b));
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
