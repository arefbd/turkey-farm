/* تولید آیکن‌های PNG برای PWA از روی SVG با Chrome headless */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, '..', 'public');

const jobs = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, 'icon.html').replace(/\\/g, '/'), {
    waitUntil: 'load',
  });

  for (const job of jobs) {
    await page.setViewport({ width: job.size, height: job.size, deviceScaleFactor: 1 });
    await page.evaluate(
      ({ size, maskable }) => {
        const svg = document.getElementById('icon');
        const bg = document.getElementById('bg');
        const emoji = document.getElementById('emoji');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', '0 0 512 512');
        if (maskable) {
          // تمام‌صفحه و بدون گوشه گرد؛ محتوا داخل ناحیه امن ۸۰٪
          bg.setAttribute('rx', '0');
          emoji.setAttribute('font-size', '210');
          emoji.setAttribute('y', '325');
        }
      },
      { size: job.size, maskable: job.maskable },
    );
    await new Promise((r) => setTimeout(r, 250));
    await page.screenshot({
      path: path.join(OUT, job.file),
      omitBackground: true,
      clip: { x: 0, y: 0, width: job.size, height: job.size },
    });
    console.log('wrote', job.file, job.size + 'px');
  }

  await browser.close();
})();
