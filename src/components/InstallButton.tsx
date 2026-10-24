/** دکمه نصب PWA — پرامپت بومی، و در غیر آن راهنمای نصب هر دستگاه */
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Modal, useUI } from './Modal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

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

function InstallHelp({ onClose }: { onClose: () => void }) {
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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      try {
        await deferred.userChoice;
      } catch {
        /* کاربر بست */
      }
      setDeferred(null);
      return;
    }
    ui.open(<InstallHelp onClose={ui.close} />);
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
