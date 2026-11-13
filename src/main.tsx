import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UIProvider } from './components/Modal';
import { AuthGate } from './auth/AuthGate';
import './styles/style.css';

const root = document.getElementById('root');
if (!root) throw new Error('عنصر root یافت نشد');

createRoot(root).render(
  <StrictMode>
    <UIProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </UIProvider>
  </StrictMode>,
);

/* پاکسازی خودکار کش‌های قدیمی در هر بار راه‌اندازی نسخه جدید */
if (typeof window !== 'undefined') {
  const CURRENT_VER = 'v2.0.3';
  const savedVer = localStorage.getItem('tf_app_version');
  if (savedVer !== CURRENT_VER) {
    localStorage.setItem('tf_app_version', CURRENT_VER);
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (!key.includes(CURRENT_VER)) {
            caches.delete(key);
          }
        });
      });
    }
  }
}

/* ثبت و به‌روزرسانی خودکار سرویس‌ورکر PWA */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js')
      .then((reg) => {
        // بررسی فعال نسخه جدید
        reg.update().catch(() => undefined);
      })
      .catch((e) => console.warn('ثبت سرویس‌ورکر ناموفق', e));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
