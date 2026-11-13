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
