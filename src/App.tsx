/** پوسته برنامه: سایدبار، تاپ‌بار، ناوبری پایین و مسیریابی hash */
import { useEffect, useSyncExternalStore } from 'react';
import { Icon, type IconName } from './components/Icon';
import { Modal, useUI } from './components/Modal';
import { InstallButton } from './components/InstallButton';
import { alerts as getAlerts, totals, useApp, useSyncInfo } from './data/store';
import { signOut } from './auth/AuthGate';
import { format, today } from './lib/jalali';
import { short } from './lib/format';
import { Dashboard } from './pages/Dashboard';
import { Flocks } from './pages/Flocks';
import { FlockDetail } from './pages/FlockDetail';
import { Expenses } from './pages/Expenses';
import { Sales } from './pages/Sales';
import { Transactions } from './pages/Transactions';
import { Payments } from './pages/Payments';
import { Persons } from './pages/Persons';
import { Partners } from './pages/Partners';
import { Feed } from './pages/Feed';
import { Inventory } from './pages/Inventory';
import { Tasks } from './pages/Tasks';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import {
  DailyForm,
  ExpenseForm,
  PartnerForm,
  SaleForm,
  TaskForm,
  VaccineForm,
} from './forms';

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  group: string;
}

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: 'home', group: 'اصلی' },
  { id: 'flocks', label: 'گله‌ها و ثبت روزانه', icon: 'egg', group: 'اصلی' },
  { id: 'transactions', label: 'معاملات (خرید و فروش)', icon: 'receipt', group: 'مالی' },
  { id: 'expenses', label: 'هزینه‌ها', icon: 'wallet', group: 'مالی' },
  { id: 'payments', label: 'دریافت‌ها و پرداخت‌ها', icon: 'exchange', group: 'مالی' },
  { id: 'persons', label: 'اشخاص (مشتری/تامین‌کننده)', icon: 'users', group: 'مالی' },
  { id: 'partners', label: 'شرکا و تسویه', icon: 'scale', group: 'مالی' },
  { id: 'feed', label: 'خوراک و فرمول', icon: 'feed', group: 'عملیات' },
  { id: 'inventory', label: 'انبار', icon: 'box', group: 'عملیات' },
  { id: 'tasks', label: 'کارها و یادآور', icon: 'check', group: 'عملیات' },
  { id: 'reports', label: 'گزارش‌ها', icon: 'chart', group: 'تحلیل' },
  { id: 'settings', label: 'تنظیمات', icon: 'gear', group: 'تحلیل' },
];

const TITLES: Record<string, string> = Object.fromEntries(NAV.map((x) => [x.id, x.label]));
TITLES.flock = 'جزئیات گله';

/* ------------------------------- مسیریابی ------------------------------- */
const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

function useRoute() {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => '',
  );
  const clean = hash.replace(/^#\/?/, '') || 'dashboard';
  const parts = clean.split('/');
  return { name: parts[0] || 'dashboard', param: parts.slice(1).join('/') };
}

function Page({ name, param }: { name: string; param: string }) {
  switch (name) {
    case 'flocks':
      return <Flocks />;
    case 'flock':
      return <FlockDetail id={param} />;
    case 'expenses':
      return <Expenses />;
    case 'sales':
      return <Sales />;
    case 'transactions':
      return <Transactions />;
    case 'payments':
      return <Payments />;
    case 'persons':
      return <Persons />;
    case 'partners':
      return <Partners />;
    case 'feed':
      return <Feed />;
    case 'inventory':
      return <Inventory />;
    case 'tasks':
      return <Tasks />;
    case 'reports':
      return <Reports />;
    case 'settings':
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

/* -------------------------------- برنامه -------------------------------- */
export function App() {
  const s = useApp();
  const sync = useSyncInfo();
  const ui = useUI();
  const route = useRoute();
  const activeNav = route.name === 'flock' ? 'flocks' : route.name;
  const t = totals(s);

  useEffect(() => {
    document.title = `${TITLES[route.name] || 'مزرعه بوقلمون'} | ${s.settings.farmName}`;
  }, [route.name, s.settings.farmName]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.name, route.param]);

  const groups: Array<{ name: string; items: NavItem[] }> = [];
  NAV.forEach((item) => {
    let g = groups.find((x) => x.name === item.group);
    if (!g) {
      g = { name: item.group, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  });

  const quickAdd = () =>
    ui.sheet({
      title: 'ثبت جدید',
      items: [
        { act: 'expense', label: 'ثبت هزینه', icon: '💸' },
        { act: 'sale', label: 'ثبت فروش', icon: '🍗' },
        { act: 'daily', label: 'ثبت روزانه گله', icon: '📝' },
        { act: 'vaccine', label: 'واکسیناسیون', icon: '💉' },
        { act: 'task', label: 'کار / یادآور', icon: '🔔' },
        { act: 'partner', label: 'شریک جدید', icon: '👥' },
      ],
      onPick: (act) => {
        if (act === 'expense') ui.open(<ExpenseForm onClose={ui.close} />);
        if (act === 'sale') ui.open(<SaleForm onClose={ui.close} />);
        if (act === 'daily') ui.open(<DailyForm onClose={ui.close} />);
        if (act === 'vaccine') ui.open(<VaccineForm onClose={ui.close} />);
        if (act === 'task') ui.open(<TaskForm onClose={ui.close} />);
        if (act === 'partner') ui.open(<PartnerForm onClose={ui.close} />);
      },
    });

  const showAlerts = () => {
    const list = getAlerts(s);
    ui.open(
      <Modal
        title="هشدارها و یادآورها"
        onClose={ui.close}
        footer={
          <>
            <button className="btn ghost" onClick={ui.close}>
              بستن
            </button>
            <button
              className="btn primary"
              onClick={() => {
                ui.close();
                window.location.hash = '#/tasks';
              }}
            >
              مشاهده کارها
            </button>
          </>
        }
      >
        {list.map((a, i) => (
          <div className={'alert-item ' + a.level} key={i}>
            <span className="ai-ic">{a.icon}</span>
            <div>
              <h5>{a.title}</h5>
              <p>{a.text}</p>
            </div>
          </div>
        ))}
      </Modal>,
    );
  };

  return (
    <>
      <div id="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">🦃</div>
            <div>
              <div className="brand-name">{s.settings.farmName}</div>
              <div className="brand-sub">سامانه مدیریت مزرعه بوقلمون</div>
            </div>
          </div>

          <nav className="nav">
            {groups.map((g) => (
              <div key={g.name}>
                <div className="nav-label">{g.name}</div>
                {g.items.map((item) => (
                  <a
                    key={item.id}
                    className={'nav-item' + (activeNav === item.id ? ' active' : '')}
                    href={`#/${item.id}`}
                  >
                    <Icon name={item.icon} size={19} />
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            ))}
          </nav>

          <div className="side-foot">
            <h5>خلاصه مالی مزرعه</h5>
            <p>
              هزینه: {short(t.expenses)} — درآمد: {short(t.revenue)}
            </p>
            <button className="btn" onClick={() => (window.location.hash = '#/reports')}>
              مشاهده گزارش کامل
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-title">
              <b>{s.settings.farmName}</b>
              <span>{format(today(), 'full')}</span>
            </div>
            <div className="topbar-actions">
              <InstallButton />
              <button className="icon-btn" onClick={showAlerts} title="هشدارها">
                <Icon name="bell" size={19} />
              </button>
              <button
                className="icon-btn no-print"
                onClick={() => window.print()}
                title="چاپ"
              >
                <Icon name="print" size={19} />
              </button>
              <button className="btn primary sm no-print" onClick={quickAdd}>
                <Icon name="plus" size={16} />
                <span className="q-label"> ثبت جدید</span>
              </button>
              <span
                className={'badge no-print ' + (sync.pending > 0 ? 'gray' : 'green')}
                title="وضعیت ذخیره‌سازی در Supabase"
              >
                {sync.pending > 0 ? 'در حال ذخیره…' : 'همگام'}
              </span>
              <button
                className="icon-btn no-print"
                title="خروج از حساب"
                onClick={async () => {
                  const ok = await ui.confirm('از حساب خارج می‌شوید؟', { ok: 'خروج' });
                  if (ok) void signOut();
                }}
              >
                <Icon name="close" size={18} />
              </button>
              <span
                className="avatar"
                style={{
                  background: 'linear-gradient(140deg,#5B12A8,#8B5CF6)',
                  width: 36,
                  height: 36,
                  fontSize: 15,
                }}
              >
                {(s.settings.owner || 'م').charAt(0)}
              </span>
            </div>
          </header>

          <main className="view" key={route.name + '/' + route.param}>
            <Page name={route.name} param={route.param} />
          </main>
        </div>

        <nav className="bottomnav">
          <a
            className={'bn-item' + (activeNav === 'dashboard' ? ' active' : '')}
            href="#/dashboard"
          >
            <Icon name="home" size={21} />
            <span>خانه</span>
          </a>
          <a className={'bn-item' + (activeNav === 'flocks' ? ' active' : '')} href="#/flocks">
            <Icon name="egg" size={21} />
            <span>گله‌ها</span>
          </a>
          <div className="bn-gap" />
          <a className={'bn-item' + (activeNav === 'expenses' ? ' active' : '')} href="#/expenses">
            <Icon name="wallet" size={21} />
            <span>هزینه</span>
          </a>
          <button
            className="bn-item"
            onClick={() =>
              ui.sheet({
                title: 'همه بخش‌ها',
                items: NAV.filter(
                  (x) => ['dashboard', 'flocks', 'expenses'].indexOf(x.id) === -1,
                ).map((x) => ({ act: x.id, label: x.label, icon: <Icon name={x.icon} size={18} /> })),
                onPick: (id) => (window.location.hash = `#/${id}`),
              })
            }
          >
            <Icon name="dots" size={21} />
            <span>بیشتر</span>
          </button>
          <button className="bn-fab" onClick={quickAdd} aria-label="افزودن">
            <Icon name="plus" size={24} />
          </button>
        </nav>
      </div>
    </>
  );
}
