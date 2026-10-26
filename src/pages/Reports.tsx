/** گزارش‌ها و تحلیل مالی */
import { useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Bars } from '../components/Charts';
import { Bar, Chips, Empty, PageHead, SectionHead, Stat } from '../components/ui';
import {
  activeFlocks,
  byCategory,
  cashSeries,
  filterExpenses,
  flockStats,
  monthlySeries,
  receivables,
  settlement,
  totals,
  useApp,
} from '../data/store';
import { format, pad, parse, today } from '../lib/jalali';
import { download, n, pct, short, toCsv } from '../lib/format';
import type { ExpenseFilter } from '../data/types';

type Period = 'all' | 'month' | '3m' | 'year';

export function Reports() {
  const s = useApp();
  const ui = useUI();
  const [period, setPeriod] = useState<Period>('all');

  const filter: ExpenseFilter = (() => {
    const t = parse(today());
    if (!t) return {};
    if (period === 'month') return { from: `${pad(t.jy)}/${pad(t.jm)}/01` };
    if (period === '3m') {
      let m = t.jm - 3;
      let y = t.jy;
      while (m <= 0) {
        m += 12;
        y--;
      }
      return { from: `${pad(y)}/${pad(m)}/01` };
    }
    if (period === 'year') return { from: `${pad(t.jy)}/01/01` };
    return {};
  })();

  const t = totals(s, filter);
  const cats = byCategory(s, filter);
  const series = monthlySeries(s, 6);
  const cash = cashSeries(s, 6);
  const rec = receivables(s);
  const settle = settlement(s, filter);
  const active = activeFlocks(s)[0];
  const fs = active ? flockStats(s, active.id) : null;

  const periodLabel = { all: 'کل دوره', month: 'ماه جاری', '3m': '۳ ماه اخیر', year: 'سال جاری' }[
    period
  ];

  const exportReport = () => {
    const rows: Array<Array<string | number>> = [];
    rows.push(['گزارش مالی مزرعه', s.settings.farmName]);
    rows.push(['تاریخ گزارش', today()]);
    rows.push([]);
    rows.push(['درآمد کل', t.revenue]);
    rows.push(['هزینه کل', t.expenses]);
    rows.push(['سود / زیان', t.profit]);
    rows.push(['حاشیه سود (٪)', t.margin.toFixed(2)]);
    rows.push([]);
    rows.push(['دسته هزینه', 'مبلغ', 'درصد']);
    cats.forEach((c) => {
      rows.push([c.label, Math.round(c.value), (t.expenses ? (c.value / t.expenses) * 100 : 0).toFixed(1)]);
    });
    rows.push([]);
    rows.push(['شریک', 'سهم٪', 'آورده', 'سهم از هزینه', 'مانده']);
    settle.rows.forEach((r) => {
      rows.push([r.name, r.share, Math.round(r.capital), Math.round(r.shareExp), Math.round(r.balance)]);
    });
    download(`report-${today().replace(/\//g, '-')}.csv`, toCsv(rows));
    ui.toast('گزارش دانلود شد');
  };

  return (
    <>
      <PageHead
        title="گزارش‌ها و تحلیل مالی"
        sub="تصویر کامل عملکرد مالی و فنی مزرعه"
        actions={
          <>
            <button className="btn" onClick={exportReport}>
              <Icon name="download" size={16} /> خروجی گزارش
            </button>
            <button className="btn primary" onClick={() => window.print()}>
              <Icon name="print" size={16} /> چاپ / PDF
            </button>
          </>
        }
      />

      <Chips
        items={[
          { value: 'all', label: 'کل دوره' },
          { value: 'month', label: 'ماه جاری' },
          { value: '3m', label: '۳ ماه اخیر' },
          { value: 'year', label: 'سال جاری' },
        ]}
        active={period}
        onPick={(v) => setPeriod(v as Period)}
      />

      <div className="card mt">
        <SectionHead title="صورت سود و زیان" sub={periodLabel} />
        <div className="grid grid-3" style={{ gap: 10 }}>
          <div className="stat" style={{ boxShadow: 'none', background: '#F1FCF6', borderColor: '#D1FAE5' }}>
            <div className="stat-label">درآمد فروش</div>
            <div className="stat-value" style={{ color: '#059669' }}>
              {short(t.revenue)}
            </div>
            <div className="stat-sub">
              {n(t.salesKg)} کیلو در {n(t.salesCount)} فاکتور
            </div>
          </div>
          <div className="stat" style={{ boxShadow: 'none', background: '#FEF4F4', borderColor: '#FEE2E2' }}>
            <div className="stat-label">بهای خرید کالا</div>
            <div className="stat-value" style={{ color: '#DC2626' }}>
              {short(t.purchase)}
            </div>
            <div className="stat-sub">هزینه عملیاتی {short(t.expenses)}</div>
          </div>
          <div className="stat" style={{ boxShadow: 'none', background: '#F7F4FF', borderColor: '#E4D6FF' }}>
            <div className="stat-label">{t.profit >= 0 ? 'سود' : 'زیان'} ناخالص</div>
            <div className="stat-value" style={{ color: t.profit >= 0 ? '#6D28D9' : '#DC2626' }}>
              {short(t.profit)}
            </div>
            <div className="stat-sub">حاشیه سود {pct(t.margin)}</div>
          </div>
        </div>
        <div
          className="mt"
          style={{
            display: 'flex',
            gap: 6,
            height: 10,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#F0ECFA',
          }}
        >
          <span
            style={{
              width:
                (t.revenue + t.expenses + t.purchase
                  ? (t.revenue / (t.revenue + t.expenses + t.purchase)) * 100
                  : 0) + '%',
              background: '#10B981',
            }}
          />
          <span style={{ flex: 1, background: '#EF4444' }} />
        </div>
        <div className="chart-legend">
          <span>
            <i style={{ background: '#10B981' }} />
            درآمد
          </span>
          <span>
            <i style={{ background: '#EF4444' }} />
            خرید + هزینه
          </span>
        </div>
      </div>

      {fs && active ? (
        <div className="stats">
          <Stat
            icon="⚖️"
            label="هزینه هر کیلو وزن زنده"
            value={short(fs.costPerKg)}
            unit="تومان"
            sub={'گله ' + active.name}
          />
          <Stat icon="🔄" label="ضریب تبدیل (FCR)" value={n(fs.fcr, 2)} sub="دان / افزایش وزن" />
          <Stat icon="⚠️" label="درصد تلفات" value={pct(fs.mortalityPct, 2)} sub={`${n(fs.mortality)} قطعه`} />
          <Stat icon="🌾" label="دان به ازای هر پرنده" value={n(fs.feedPerBird, 1)} unit="کیلو" />
        </div>
      ) : null}

      <div className="grid grid-side mt">
        <div className="card">
          <SectionHead title="جریان نقدی" sub="۶ ماه اخیر — بر اساس اسناد دریافت/پرداخت" />
          <Bars
            labels={cash.map((c) => c.label)}
            series={[
              { values: cash.map((c) => c.income), color: '#10B981' },
              { values: cash.map((c) => c.expense), color: '#F87171' },
            ]}
            height={200}
          />
          <div className="chart-legend">
            <span>
              <i style={{ background: '#10B981' }} />
              دریافت
            </span>
            <span>
              <i style={{ background: '#F87171' }} />
              پرداخت
            </span>
          </div>
        </div>

        <div className="card">
          <SectionHead title="مطالبات و بدهی‌ها" sub="بر اساس فاکتورهای باز" />
          <div className="kv">
            <span>طلب از مشتریان</span>
            <b style={{ color: '#059669' }}>{short(rec.receivable)}</b>
          </div>
          <div className="kv">
            <span>بدهی به تامین‌کنندگان</span>
            <b style={{ color: '#DC2626' }}>{short(rec.payable)}</b>
          </div>
          <div className="kv">
            <span>خالص (طلب − بدهی)</span>
            <b style={{ color: rec.net >= 0 ? '#059669' : '#DC2626' }}>{short(rec.net)}</b>
          </div>
          <div className="kv">
            <span>سررسیدگذشته</span>
            <b style={{ color: rec.overdue > 0 ? '#DC2626' : '#059669' }}>{short(rec.overdue)}</b>
          </div>
          <div className="kv">
            <span>نرخ وصول</span>
            <b>{pct(rec.billed ? (rec.collected / rec.billed) * 100 : 0, 0)}</b>
          </div>
          {rec.unlinkedPayments > 0 ? (
            <div className="hint" style={{ marginTop: 6 }}>
              {n(rec.unlinkedPayments)} سند دریافت/پرداخت به فاکتوری وصل نشده است و در این جدول
              لحاظ نشده.
            </div>
          ) : null}
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="ریز فاکتورهای باز" sub={`${n(rec.items.filter((i) => i.remaining > 0).length)} فاکتور با مانده`} />
        {rec.items.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>سند</th>
                  <th>طرف حساب</th>
                  <th>نوع</th>
                  <th>مبلغ</th>
                  <th>تسویه‌شده</th>
                  <th>مانده</th>
                  <th>سررسید</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {rec.items.slice(0, 20).map((i) => (
                  <tr key={i.txId}>
                    <td className="num-cell">{i.code}</td>
                    <td>
                      <b>{i.personName}</b>
                    </td>
                    <td>{i.type === 'sale' ? 'فروش' : 'خرید'}</td>
                    <td className="num-cell">{n(i.total)}</td>
                    <td className="num-cell">{n(i.paid)}</td>
                    <td className="num-cell">
                      <b style={{ color: i.remaining > 0 ? '#DC2626' : '#059669' }}>
                        {n(i.remaining)}
                      </b>
                    </td>
                    <td>{i.dueDate ? format(i.dueDate, 'short') : '—'}</td>
                    <td>
                      {i.remaining === 0 ? (
                        <span className="badge green">تسویه شد</span>
                      ) : i.overdueDays > 0 ? (
                        <span className="badge red">{n(i.overdueDays)} روز گذشته</span>
                      ) : (
                        <span className="badge gray">باز</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="فاکتوری ثبت نشده" text="با ثبت معامله خرید یا فروش، این جدول پر می‌شود" />
        )}
      </div>

      <div className="card mt">
        <SectionHead title="مقایسه ماهانه" sub="۶ ماه اخیر" />
        <Bars
          labels={series.map((x) => x.label)}
          series={[
            { values: series.map((x) => x.income), color: '#6D28D9' },
            { values: series.map((x) => x.expense), color: '#DDD6FE' },
          ]}
          height={220}
        />
        <div className="chart-legend">
          <span>
            <i style={{ background: '#6D28D9' }} />
            درآمد
          </span>
          <span>
            <i style={{ background: '#DDD6FE' }} />
            هزینه
          </span>
        </div>
        <div className="tbl-wrap mt">
          <table className="tbl">
            <thead>
              <tr>
                <th>ماه</th>
                <th>درآمد</th>
                <th>هزینه</th>
                <th>سود / زیان</th>
              </tr>
            </thead>
            <tbody>
              {series.map((x) => {
                const p = x.income - x.expense;
                return (
                  <tr key={x.key}>
                    <td>
                      <b>{x.label}</b>
                    </td>
                    <td className="num-cell">{n(x.income)}</td>
                    <td className="num-cell">{n(x.expense)}</td>
                    <td className="num-cell" style={{ color: p >= 0 ? '#059669' : '#DC2626' }}>
                      {n(p)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="تفکیک هزینه بر اساس دسته" sub={`${n(cats.length)} دسته`} />
        {cats.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>دسته</th>
                  <th>تعداد</th>
                  <th>مبلغ (تومان)</th>
                  <th>سهم</th>
                  <th style={{ width: 120 }}>نمودار</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => {
                  const cnt = filterExpenses(s, { ...filter, cat: c.id }).length;
                  const p = t.expenses ? (c.value / t.expenses) * 100 : 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        <b>
                          {c.icon} {c.label}
                        </b>
                      </td>
                      <td>{n(cnt)}</td>
                      <td className="num-cell">{n(c.value)}</td>
                      <td>{pct(p)}</td>
                      <td>
                        <Bar value={p} color={c.color} />
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#FBF9FF' }}>
                  <td>
                    <b>جمع</b>
                  </td>
                  <td>{n(t.count)}</td>
                  <td className="num-cell">{n(t.expenses)}</td>
                  <td>۱۰۰٪</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="داده‌ای نیست" />
        )}
      </div>

      <div className="card mt">
        <SectionHead title="تقسیم سود و زیان بین شرکا" sub="بر اساس درصد سهم" />
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>شریک</th>
                <th>سهم</th>
                <th>سهم از هزینه</th>
                <th>سهم از درآمد</th>
                <th>سود / زیان سهم</th>
                <th>مانده حساب</th>
              </tr>
            </thead>
            <tbody>
              {settle.rows.map((r) => {
                const shareProfit = (t.profit * r.share) / 100;
                const shareRev = (t.revenue * r.share) / 100;
                return (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td>{n(r.share)}٪</td>
                    <td className="num-cell">{n(r.shareExp)}</td>
                    <td className="num-cell">{n(shareRev)}</td>
                    <td
                      className="num-cell"
                      style={{ color: shareProfit >= 0 ? '#059669' : '#DC2626' }}
                    >
                      <b>{n(shareProfit)}</b>
                    </td>
                    <td className="num-cell" style={{ color: r.balance >= 0 ? '#059669' : '#DC2626' }}>
                      {n(r.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          سود به نسبت درصد سهام بین شرکا تقسیم می‌شود. مانده حساب بر اساس آورده و پرداخت‌های واقعی هر
          شریک محاسبه شده است.
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="مقایسه عملکرد گله‌ها" />
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>گله</th>
                <th>سن</th>
                <th>موجودی</th>
                <th>تلفات</th>
                <th>FCR</th>
                <th>هزینه</th>
                <th>درآمد</th>
                <th>سود</th>
              </tr>
            </thead>
            <tbody>
              {s.flocks.map((f) => {
                const st = flockStats(s, f.id);
                if (!st) return null;
                return (
                  <tr key={f.id}>
                    <td>
                      <b>{f.name}</b>
                    </td>
                    <td>{n(st.age)} روز</td>
                    <td className="num-cell">{n(st.alive)}</td>
                    <td>{pct(st.mortalityPct, 2)}</td>
                    <td className="num-cell">{n(st.fcr, 2)}</td>
                    <td className="num-cell">{short(st.expenses)}</td>
                    <td className="num-cell">{short(st.revenue)}</td>
                    <td className="num-cell" style={{ color: st.profit >= 0 ? '#059669' : '#DC2626' }}>
                      {short(st.profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
