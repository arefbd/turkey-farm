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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('ایمیل و رمز عبور را وارد کنید');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Invalid login credentials/i.test(msg)) setError('ایمیل یا رمز عبور نادرست است');
      else if (/Email not confirmed/i.test(msg))
        setError('ایمیل این حساب تایید نشده است؛ از داشبورد Supabase تایید کنید');
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
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: 22 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>🦃</div>
          <h2 style={{ fontSize: 17, margin: '8px 0 2px' }}>مزرعه بوقلمون</h2>
          <div className="hint">ورود مدیر سامانه</div>
        </div>

        <form onSubmit={submit} className="form-grid">
          <div className="field full">
            <label className="lbl">ایمیل</label>
            <input
              className="input"
              type="email"
              dir="ltr"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="field full">
            <label className="lbl">رمز عبور</label>
            <input
              className="input"
              type="password"
              dir="ltr"
              autoComplete="current-password"
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

          <div className="field full">
            <button className="btn primary block" type="submit" disabled={busy}>
              {busy ? 'کمی صبر کنید…' : 'ورود به سامانه'}
            </button>
          </div>
        </form>

        <div className="hint" style={{ marginTop: 14, textAlign: 'center', lineHeight: 1.9 }}>
          ثبت‌نام عمومی بسته است. حساب مدیر را از
          <br />
          Supabase → Authentication → Users بسازید.
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
