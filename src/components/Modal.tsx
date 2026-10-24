/** لایه‌های شناور: مودال، شیت پایین، توست و تاییدیه — با Context */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';

/* --------------------------------- مودال --------------------------------- */
export function Modal({
  title,
  children,
  footer,
  size,
  onClose,
}: {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: string;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className={'modal-backdrop' + (open ? ' open' : '')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={'modal ' + (size || '')} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="بستن" type="button">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------- توست‌ها -------------------------------- */
interface ToastItem {
  id: number;
  msg: string;
  type: 'ok' | 'error';
  in: boolean;
}

/* ------------------------------- کانتکست UI ------------------------------- */
export interface SheetItem {
  act: string;
  label: string;
  icon?: ReactNode;
  color?: string;
}

interface ConfirmOpts {
  title?: string;
  ok?: string;
  danger?: boolean;
}

interface UIContextValue {
  open: (node: ReactNode) => void;
  close: () => void;
  toast: (msg: string, type?: 'ok' | 'error') => void;
  confirm: (msg: ReactNode, opts?: ConfirmOpts) => Promise<boolean>;
  sheet: (opts: { title: string; items: SheetItem[]; onPick: (act: string) => void }) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI باید داخل UIProvider استفاده شود');
  return ctx;
}

interface ConfirmState {
  msg: ReactNode;
  opts: ConfirmOpts;
  resolve: (v: boolean) => void;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ReactNode | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const toastId = useRef(0);

  const close = useCallback(() => setModal(null), []);
  const open = useCallback((node: ReactNode) => setModal(node), []);

  const toast = useCallback((msg: string, type: 'ok' | 'error' = 'ok') => {
    const id = ++toastId.current;
    setToasts((list) => [...list, { id, msg, type, in: false }]);
    requestAnimationFrame(() => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, in: true } : t)));
    });
    setTimeout(() => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, in: false } : t)));
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 260);
    }, 2600);
  }, []);

  const confirm = useCallback(
    (msg: ReactNode, opts: ConfirmOpts = {}) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ msg, opts, resolve });
      }),
    [],
  );

  const sheet = useCallback(
    (opts: { title: string; items: SheetItem[]; onPick: (act: string) => void }) => {
      setModal(
        <Modal title={opts.title} size="sheet-modal" onClose={() => setModal(null)}>
          <div className="sheet-list">
            {opts.items.map((it) => (
              <button
                key={it.act}
                type="button"
                className="sheet-item"
                onClick={() => {
                  setModal(null);
                  opts.onPick(it.act);
                }}
              >
                <span className="sheet-ic" style={{ background: it.color || '#EEE7FB' }}>
                  {it.icon}
                </span>
                <span>{it.label}</span>
              </button>
            ))}
          </div>
        </Modal>,
      );
    },
    [],
  );

  const value = useMemo(
    () => ({ open, close, toast, confirm, sheet }),
    [open, close, toast, confirm, sheet],
  );

  const resolveConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <UIContext.Provider value={value}>
      {children}

      {modal}

      {confirmState ? (
        <Modal
          title={confirmState.opts.title || 'تایید عملیات'}
          onClose={() => resolveConfirm(false)}
          footer={
            <>
              <button className="btn ghost" type="button" onClick={() => resolveConfirm(false)}>
                انصراف
              </button>
              <button
                className={'btn ' + (confirmState.opts.danger ? 'danger' : 'primary')}
                type="button"
                onClick={() => resolveConfirm(true)}
              >
                {confirmState.opts.ok || 'تایید'}
              </button>
            </>
          }
        >
          <p className="confirm-text">{confirmState.msg}</p>
        </Modal>
      ) : null}

      <div className="toast-root">
        {toasts.map((t) => (
          <div key={t.id} className={'toast ' + t.type + (t.in ? ' in' : '')}>
            <span className="toast-dot" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </UIContext.Provider>
  );
}
