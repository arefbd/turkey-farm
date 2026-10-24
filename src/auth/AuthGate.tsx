/** احراز هویت Supabase + دروازه ورود به برنامه */
import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { detach, hydrate, resync, useSyncInfo } from '../data/store';
import { Icon } from '../components/Icon';

export async function signOut() {
  detach();
  await supabase.auth.signOut();
}

/* --------------------------------- Splash -------------------------------- */
function Splash({ text }: { text: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg,#F7F4FF,#EFE9FB)',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 46, marginBottom: 10 }}>🦃</div>
        <div style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>مزرعه بوقلمون</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{text}</div>
      </div>
    </div>
  );
}

/* ------------------------------- فرم ورود -------------------------------- */
function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim() || !password) {
      setError('ایمیل و رمز عبور را وارد کنید');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        if (!data.session) {
          setNotice('ثبت‌نام انجام شد. لینک تایید به ایمیل شما ارسال شد؛ پس از تایید وارد شوید.');
          setMode('in');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Invalid login credentials/i.test(msg)) setError('ایمیل یا رمز عبور نادرست است');
      else if (/already registered/i.test(msg)) setError('این ایمیل قبلاً ثبت شده است');
      else if (/Password should be at least/i.test(msg)) setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg,#F7F4FF,#EFE9FB)',
        padding: 20,
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 390, padding: 22 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>🦃</div>
          <h2 style={{ fontSize: 17, margin: '8px 0 2px' }}>مزرعه بوقلمون</h2>
          <div className="hint">برای دسترسی به داده‌های مزرعه وارد شوید</div>
        </div>

        <div className="tabs" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={'tab' + (mode === 'in' ? ' active' : '')}
            onClick={() => {
              setMode('in');
              setError('');
            }}
          >
            ورود
          </button>
          <button
            type="button"
            className={'tab' + (mode === 'up' ? ' active' : '')}
            onClick={() => {
              setMode('up');
              setError('');
            }}
          >
            ثبت‌نام
          </button>
        </div>

        <form onSubmit={submit} className="form-grid">
          <div className="field full">
            <label className="lbl">ایمیل</label>
            <input
              className="input"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field full">
            <label className="lbl">رمز عبور</label>
            <input
              className="input"
              type="password"
              dir="ltr"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="field full">
              <div className="alert-item danger">
                <span className="ai-ic">⚠️</span>
                <div>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          ) : null}

          {notice ? (
            <div className="field full">
              <div className="alert-item ok">
                <span className="ai-ic">✅</span>
                <div>
                  <p>{notice}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="field full">
            <button className="btn primary block" type="submit" disabled={busy}>
              {busy ? 'کمی صبر کنید…' : mode === 'in' ? 'ورود به سامانه' : 'ساخت حساب'}
            </button>
          </div>
        </form>

        <div className="hint" style={{ marginTop: 12, textAlign: 'center' }}>
          داده‌ها روی Supabase ذخیره می‌شوند و فقط برای همین حساب قابل مشاهده‌اند.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ صفحه خطا ------------------------------- */
function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 420, padding: 22, textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>⚠️</div>
        <h3 style={{ fontSize: 15, margin: '10px 0 6px' }}>اتصال به Supabase برقرار نشد</h3>
        <div className="hint" style={{ marginBottom: 14, direction: 'ltr', textAlign: 'left' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn primary" onClick={onRetry}>
            تلاش دوباره
          </button>
          <button className="btn ghost" onClick={() => void signOut()}>
            <Icon name="close" size={15} /> خروج
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- دروازه -------------------------------- */
export function AuthGate({ children }: { children: ReactNode }) {
  const sync = useSyncInfo();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) detach();
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const uid = session?.user?.id;

  useEffect(() => {
    if (uid) void hydrate(uid);
  }, [uid]);

  if (!checked) return <Splash text="در حال اتصال…" />;
  if (!session) return <AuthScreen />;
  if (sync.status === 'loading') return <Splash text="در حال خواندن داده‌ها از Supabase…" />;

  if (sync.status === 'error') {
    return (
      <ErrorScreen
        message={sync.error}
        onRetry={() => {
          setRetrying(true);
          void resync().finally(() => setRetrying(false));
        }}
      />
    );
  }

  if (retrying) return <Splash text="در حال همگام‌سازی مجدد…" />;

  return <>{children}</>;
}
