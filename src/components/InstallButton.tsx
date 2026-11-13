/** دکمه نصب PWA — پرامپت بومی، و در غیر آن راهنمای نصب هر دستگاه */
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Modal, useUI } from './Modal';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(p: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn(null));
  });
}

export async function triggerInstallPrompt(onFallback?: () => void): Promise<boolean> {
  if (globalDeferredPrompt) {
    try {
      await globalDeferredPrompt.prompt();
      await globalDeferredPrompt.userChoice;
    } catch {
      /* کاربر رد کرد یا خطا */
    }
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn(null));
    return true;
  }
  if (onFallback) onFallback();
  return false;
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true);

const GUIDE: Array<{ icon: string; title: string; steps: string }> = [
  {
    icon: '🤖',
    title: 'اندروید (Chrome)',
    steps: 'منوی سه‌نقطه ⋮ ← «Install app» یا «افزودن به صفحه اصلی»',
  },
  {
    icon: '🍎',
    title: 'آیفون / آیپد (Safari)',
    steps: 'دکمه اشتراک‌گذاری ← «Add to Home Screen»',
  },
  {
    icon: '💻',
    title: 'ویندوز / مک (Chrome یا Edge)',
    steps: 'آیکن نصب در نوار آدرس، یا منوی ⋮ ← «Install turkey-farm»',
  },
];

export function InstallHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="نصب روی دستگاه"
      onClose={onClose}
      footer={
        <button className="btn primary" type="button" onClick={onClose}>
          متوجه شدم
        </button>
      }
    >
      <p className="hint" style={{ marginBottom: 12, lineHeight: 1.9 }}>
        این سامانه مثل یک اپلیکیشن واقعی روی گوشی و کامپیوتر نصب می‌شود: آیکن مستقل، تمام‌صفحه و بدون
        نوار آدرس. داده‌ها همان‌جا در Supabase می‌مانند.
      </p>
      {GUIDE.map((g) => (
        <div
          key={g.title}
          style={{
            display: 'flex',
            gap: 10,
            padding: '10px 12px',
            background: '#FAF8FE',
            borderRadius: 14,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>{g.icon}</span>
          <div>
            <b style={{ fontSize: 12.5 }}>{g.title}</b>
            <div className="hint" style={{ marginTop: 2 }}>
              {g.steps}
            </div>
          </div>
        </div>
      ))}
    </Modal>
  );
}

export function InstallButton() {
  const ui = useUI();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) setInstalled(true);
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    await triggerInstallPrompt(() => ui.open(<InstallHelp onClose={ui.close} />));
  };

  return (
    <button
      className="icon-btn no-print"
      type="button"
      title="نصب برنامه روی دستگاه"
      onClick={handleClick}
    >
      <Icon name="download" size={18} />
    </button>
  );
}
