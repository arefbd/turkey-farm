/** داشبورد اصلی */
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Bars, Donut } from '../components/Charts';
import { Avatar, Bar, Empty, Row, SectionHead, Stat } from '../components/ui';
import {
  activeFlocks,
  alerts as getAlerts,
  byCategory,
  flockStats,
  monthlySeries,
  recent,
  settlement,
  totals,
  useApp,
} from '../data/store';
import { format, today } from '../lib/jalali';
import { n, pct, short } from '../lib/format';
import { DailyForm, ExpenseForm, SaleForm, VaccineForm } from '../forms';

export function Dashboard() {
  const s = useApp();
  const ui = useUI();

  const active = activeFlocks(s)[0];
  const fs = active ? flockStats(s, active.id) : null;
  const t = totals(s);
  const series = monthlySeries(s, 6);
  const allCats = byCategory(s);
  const cats = allCats.slice(0, 4).map((c) => ({ ...c }));
  const restCats = allCats.slice(4).reduce((a, c) => a + c.value, 0);
  if (restCats > 0) {
    cats.push({ id: 'rest', label: 'سایر دسته‌ها', value: restCats, color: '#CBD5E1', icon: '📦' });
  }
  const alerts = getAlerts(s).slice(0, 3);
  const recents = recent(s, 5);
  const settle = settlement(s);
  const cycleDays = s.settings.cycleDays || 120;

  const openExpense = () => ui.open(<ExpenseForm onClose={ui.close} />);
  const openSale = () => ui.open(<SaleForm onClose={ui.close} />);
  const openDaily = () => ui.open(<DailyForm onClose={ui.close} />);
  const openVaccine = () => ui.open(<VaccineForm onClose={ui.close} />);

  return (
    <>
      {/* هیرو */}
      <section className="hero">
        <div className="hero-top">
          <div className="hero-user">
            <Avatar name={s.settings.owner || 'م'} color="rgba(255,255,255,.25)" size={40} />
            <div>
              <b>{s.settings.farmName}</b>
              <span>{format(today(), 'full')}</span>
            </div>
          </div>
          <span className="hero-chip">
            <Icon name="egg" size={13} />
            {active ? active.hall || 'سالن' : 'بدون گله فعال'}
          </span>
        </div>
        <div className="hero-body">
          <div className="hero-label">موجودی زنده گله فعال</div>
          <div className="hero-value">
            {n(fs ? fs.alive : 0)} <small>قطعه</small>
          </div>
          <div className="hero-sub">
            {active && fs
              ? `${active.name} · ${n(fs.age)} روزه · وزن میانگین ${n(fs.avgWeightG / 1000, 2)} کیلو`
              : 'برای شروع یک گله جدید ثبت کنید'}
          </div>
        </div>
      </section>

      <div className="hero-actions">
        <button className="hero-act" onClick={openExpense}>
          <span className="ic-wrap">
            <Icon name="wallet" size={19} />
          </span>
          هزینه
        </button>
        <button className="hero-act" onClick={openSale}>
          <span className="ic-wrap">
            <Icon name="tag" size={19} />
          </span>
          فروش
        </button>
        <button className="hero-act" onClick={openDaily}>
          <span className="ic-wrap">
            <Icon name="feed" size={19} />
          </span>
          ثبت روزانه
        </button>
        <button className="hero-act" onClick={openVaccine}>
          <span className="ic-wrap">
            <Icon name="flask" size={19} />
          </span>
          واکسن
        </button>
      </div>

      {/* آمار */}
      <div className="stats">
        <Stat
          icon="💸"
          label="هزینه کل"
          value={short(t.expenses)}
          unit="تومان"
          sub={`${n(t.count)} رکورد هزینه`}
        />
        <Stat
          icon="🍗"
          label="درآمد فروش"
          value={short(t.revenue)}
          unit="تومان"
          sub={`${n(t.salesKg)} کیلو فروش`}
        />
        <Stat
          icon={t.profit >= 0 ? '📈' : '📉'}
          label={t.profit >= 0 ? 'سود ناخالص' : 'زیان'}
          value={short(t.profit)}
          unit="تومان"
          sub={'حاشیه ' + pct(t.margin)}
        />
        <Stat
          icon="⚠️"
          label="تلفات گله فعال"
          value={fs ? pct(fs.mortalityPct, 2) : '—'}
          sub={fs && active ? `${n(fs.mortality)} قطعه از ${n(active.startCount)}` : ''}
        />
      </div>

      {/* نمودارها */}
      <div className="grid grid-side mt">
        <div className="card">
          <SectionHead
            title="روند هزینه و درآمد"
            sub="۶ ماه اخیر"
            action={
              <a className="sec-link" href="#/reports">
                گزارش کامل <Icon name="chevronLeft" size={13} />
              </a>
            }
          />
          <Bars
            labels={series.map((x) => x.label)}
            series={[
              { values: series.map((x) => x.income), color: '#6D28D9' },
              { values: series.map((x) => x.expense), color: '#C4B5FD' },
            ]}
            height={210}
          />
          <div className="chart-legend">
            <span>
              <i style={{ background: '#6D28D9' }} />
              درآمد
            </span>
            <span>
              <i style={{ background: '#C4B5FD' }} />
              هزینه
            </span>
          </div>
        </div>

        <div className="card">
          <SectionHead title="ترکیب هزینه‌ها" sub="بر اساس دسته" />
          <div className="donut-wrap">
            <Donut
              items={cats.map((c) => ({ label: c.label, value: c.value, color: c.color }))}
              size={150}
              centerLabel="کل هزینه"
              centerValue={short(t.expenses)}
            />
            <div className="donut-legend">
              {cats.map((c) => (
                <div className="dl" key={c.id}>
                  <i style={{ background: c.color }} />
                  <span>{c.label}</span>
                  <b>{pct(t.expenses ? (c.value / t.expenses) * 100 : 0, 0)}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* هشدارها و شرکا */}
      <div className="grid grid-side mt">
        <div className="card">
          <SectionHead
            title="هشدارها و یادآورها"
            action={
              <a className="sec-link" href="#/tasks">
                همه کارها
              </a>
            }
          />
          {alerts.map((a, i) => (
            <div className={'alert-item ' + a.level} key={i}>
              <span className="ai-ic">{a.icon}</span>
              <div>
                <h5>{a.title}</h5>
                <p>{a.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <SectionHead title="سهم شرکا" sub={`${n(s.partners.length)} شریک`} />
          {settle.rows.map((r) => (
            <div key={r.id} style={{ marginBottom: 11 }}>
              <div className="progress-row">
                <span style={{ width: 74, fontWeight: 700 }}>{r.name.split(' ')[0]}</span>
                <Bar value={r.share} color={r.color} />
                <b style={{ width: 38, textAlign: 'end' }}>{n(r.share)}٪</b>
              </div>
              <div className="hint" style={{ marginTop: 3 }}>
                مانده:{' '}
                <b style={{ color: r.balance >= 0 ? '#059669' : '#DC2626' }}>
                  {short(r.balance)}
                </b>{' '}
                تومان
                {r.balance >= 0 ? ' طلب' : ' بدهی'}
              </div>
            </div>
          ))}
          <a className="btn sm block" href="#/partners" style={{ marginTop: 4 }}>
            مدیریت و تسویه حساب
          </a>
        </div>
      </div>

      {/* گله فعال */}
      {active && fs ? (
        <div className="card mt">
          <SectionHead
            title="وضعیت گله فعال"
            sub={active.breed || ''}
            action={
              <a className="sec-link" href={`#/flock/${active.id}`}>
                جزئیات گله <Icon name="chevronLeft" size={13} />
              </a>
            }
          />
          <div className="progress-row" style={{ marginBottom: 6 }}>
            <span>
              {n(fs.age)} / {n(cycleDays)} روز
            </span>
            <Bar value={Math.min(100, (fs.age / cycleDays) * 100)} />
            <b>{pct(Math.min(100, (fs.age / cycleDays) * 100), 0)}</b>
          </div>
          <div className="grid grid-4" style={{ gap: 10, marginTop: 12 }}>
            <div className="kv" style={{ display: 'block' }}>
              <span>وزن زنده کل</span>
              <br />
              <b>{n(fs.biomass, 0)} کیلو</b>
            </div>
            <div className="kv" style={{ display: 'block' }}>
              <span>ضریب تبدیل (FCR)</span>
              <br />
              <b>{n(fs.fcr, 2)}</b>
            </div>
            <div className="kv" style={{ display: 'block' }}>
              <span>دان مصرفی</span>
              <br />
              <b>{n(fs.feedKg)} کیلو</b>
            </div>
            <div className="kv" style={{ display: 'block' }}>
              <span>هزینه هر کیلو</span>
              <br />
              <b>{short(fs.costPerKg)}</b>
            </div>
          </div>
        </div>
      ) : null}

      {/* تراکنش‌های اخیر */}
      <div className="card mt">
        <SectionHead
          title="آخرین تراکنش‌ها"
          action={
            <a className="sec-link" href="#/expenses">
              همه هزینه‌ها
            </a>
          }
        />
        <div className="rows">
          {recents.length ? (
            recents.map((r, i) => (
              <Row
                key={i}
                icon={r.icon}
                iconBg={r.amount > 0 ? '#ECFDF5' : '#FEF2F2'}
                title={r.title}
                sub={`${r.sub} · ${format(r.date, 'long')}`}
                amount={`${r.amount > 0 ? '+' : '−'}${n(Math.abs(r.amount))}`}
                amountTone={r.amount > 0 ? 'pos' : 'neg'}
              />
            ))
          ) : (
            <Empty title="تراکنشی ثبت نشده" text="اولین هزینه یا فروش را ثبت کنید" />
          )}
        </div>
      </div>
    </>
  );
}
