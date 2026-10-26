/** جزئیات یک گله — ثبت روزانه، واکسیناسیون، هزینه و فروش */
import { useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { LineChart } from '../components/Charts';
import { Empty, Row, SectionHead, Stat } from '../components/ui';
import {
  actions,
  flockById,
  flockStats,
  num,
  partnerName,
  useApp,
} from '../data/store';
import { CAT_MAP } from '../data/categories';
import { format } from '../lib/jalali';
import { money, n, pct, short } from '../lib/format';
import { DailyForm, ExpenseForm, SaleForm, VaccineForm } from '../forms';

type Tab = 'daily' | 'vaccine' | 'expense' | 'sale';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'daily', label: 'ثبت روزانه' },
  { id: 'vaccine', label: 'واکسیناسیون' },
  { id: 'expense', label: 'هزینه‌ها' },
  { id: 'sale', label: 'فروش' },
];

export function FlockDetail({ id }: { id: string }) {
  const s = useApp();
  const ui = useUI();
  const [tab, setTab] = useState<Tab>('daily');

  const f = flockById(s, id);
  const st = f ? flockStats(s, id) : null;

  if (!f || !st) {
    return <Empty title="گله یافت نشد" />;
  }

  const closed = f.status === 'closed';
  const cycleDays = s.settings.cycleDays || 120;
  const prog = Math.min(100, (st.age / cycleDays) * 100);

  const recs = s.daily
    .filter((d) => d.flockId === id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const weights = recs.filter((r) => num(r.avgWeightG) > 0);
  const expenses = s.expenses
    .filter((e) => e.flockId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const sales = s.sales
    .filter((x) => x.flockId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const vacs = s.vaccines
    .filter((v) => v.flockId === id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <a className="btn sm ghost" href="#/flocks">
          <Icon name="chevron" size={15} /> بازگشت به گله‌ها
        </a>
      </div>

      <div className="hero" style={{ paddingBottom: 20 }}>
        <div className="hero-top">
          <div className="hero-user">
            <div>
              <b style={{ fontSize: 15 }}>{f.name}</b>
              <span>
                {f.breed || ''} · {f.hall || ''} · کد {f.code || '—'}
              </span>
            </div>
          </div>
          <span className="hero-chip">{closed ? 'بسته شده' : 'در حال پرورش'}</span>
        </div>
        <div className="hero-body">
          <div className="hero-label">موجودی زنده</div>
          <div className="hero-value">
            {n(st.alive)} <small>قطعه</small>
          </div>
          <div className="hero-sub">
            {n(st.age)} روز از شروع · {format(f.startDate, 'long')}
            {f.endDate ? ' تا ' + format(f.endDate, 'long') : ''}
          </div>
          <div style={{ maxWidth: 320, margin: '14px auto 0' }}>
            <div className="progress-row" style={{ color: '#fff' }}>
              <span>{pct(prog, 0)}</span>
              <div className="bar" style={{ background: 'rgba(255,255,255,.2)' }}>
                <span style={{ width: prog + '%', background: '#fff' }} />
              </div>
              <span>{n(cycleDays)} روز</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats">
        <Stat icon="⚠️" label="تلفات" value={pct(st.mortalityPct, 2)} sub={`${n(st.mortality)} قطعه`} />
        <Stat
          icon="⚖️"
          label="وزن میانگین"
          value={n(st.avgWeightG / 1000, 2)}
          unit="کیلو"
          sub={st.weightDate ? 'توزین ' + format(st.weightDate, 'long') : 'ثبت نشده'}
        />
        <Stat icon="🔄" label="ضریب تبدیل FCR" value={n(st.fcr, 2)} sub={`دان ${n(st.feedKg)} کیلو`} />
        <Stat
          icon="🍗"
          label="فروش رفته"
          value={n(st.sold)}
          unit="قطعه"
          sub={`از ${n(f.startCount)} قطعه اولیه`}
        />
        <Stat
          icon="💰"
          label="هزینه هر کیلو"
          value={short(st.costPerKg)}
          unit="تومان"
          sub={`کل هزینه ${short(st.expenses)}`}
        />
      </div>

      {weights.length > 1 ? (
        <div className="card mt">
          <SectionHead title="روند رشد وزن" sub="گرم" />
          <LineChart
            labels={weights.map((w) => n(w.age))}
            values={weights.map((w) => num(w.avgWeightG))}
            color="#7C3AED"
            height={180}
          />
        </div>
      ) : null}

      <div className="tabs mt">
        {TABS.map((x) => (
          <button
            key={x.id}
            className={'tab' + (tab === x.id ? ' active' : '')}
            onClick={() => setTab(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === 'daily' && (
          <>
            <SectionHead
              title="رکوردهای روزانه"
              sub={`${n(recs.length)} رکورد`}
              action={
                <button
                  className="btn sm primary"
                  onClick={() => ui.open(<DailyForm flockId={id} onClose={ui.close} />)}
                >
                  <Icon name="plus" size={14} /> ثبت
                </button>
              }
            />
            {recs.length ? (
              <div className="rows">
                {recs
                  .slice()
                  .reverse()
                  .slice(0, 60)
                  .map((r) => (
                    <Row
                      key={r.id}
                      icon={n(r.age)}
                      iconBg="#F4EEFF"
                      iconColor="#6D28D9"
                      title={format(r.date, 'long')}
                      sub={
                        `تلفات ${n(r.mortality)} · دان ${n(r.feedKg)} کیلو` +
                        (num(r.avgWeightG) ? ` · وزن ${n(r.avgWeightG)} گرم` : '') +
                        (r.note ? ` · ${r.note}` : '')
                      }
                      amount={n(r.mortality)}
                      amountTone={num(r.mortality) > 4 ? 'neg' : ''}
                      amountSub="تلفات"
                      actions={
                        <>
                          <button
                            className="icon-btn sm"
                            onClick={() =>
                              ui.open(<DailyForm id={r.id} onClose={ui.close} />)
                            }
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          <button
                            className="icon-btn sm"
                            onClick={async () => {
                              const ok = await ui.confirm('این رکورد روزانه حذف شود؟', {
                                danger: true,
                                ok: 'حذف',
                              });
                              if (ok) actions.remove('daily', r.id);
                            }}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </>
                      }
                    />
                  ))}
              </div>
            ) : (
              <Empty title="رکوردی ثبت نشده" text="اولین ثبت روزانه را انجام دهید" />
            )}
          </>
        )}

        {tab === 'vaccine' && (
          <>
            <SectionHead
              title="واکسیناسیون"
              sub={`${n(vacs.length)} نوبت`}
              action={
                <button
                  className="btn sm primary"
                  onClick={() => ui.open(<VaccineForm flockId={id} onClose={ui.close} />)}
                >
                  <Icon name="plus" size={14} /> ثبت
                </button>
              }
            />
            {vacs.length ? (
              <div className="rows">
                {vacs.map((v) => (
                  <Row
                    key={v.id}
                    icon="💉"
                    iconBg="#FDF2F8"
                    title={v.name}
                    sub={`${format(v.date, 'long')} · ${v.method || ''} · ${n(v.count)} قطعه`}
                    amount={short(v.cost)}
                    actions={
                      <button
                        className="icon-btn sm"
                        onClick={async () => {
                          const ok = await ui.confirm('این نوبت واکسیناسیون حذف شود؟', {
                            danger: true,
                            ok: 'حذف',
                          });
                          if (ok) actions.remove('vaccines', v.id);
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <Empty title="واکسنی ثبت نشده" text="نوبت‌های واکسیناسیون را ثبت کنید" />
            )}
          </>
        )}

        {tab === 'expense' && (
          <>
            <SectionHead
              title="هزینه‌های این گله"
              sub={'جمع: ' + money(st.expenses, s.settings.currency)}
              action={
                <button
                  className="btn sm primary"
                  onClick={() =>
                    ui.open(<ExpenseForm preset={{ flockId: id }} onClose={ui.close} />)
                  }
                >
                  <Icon name="plus" size={14} /> ثبت
                </button>
              }
            />
            {expenses.length ? (
              <div className="rows">
                {expenses.map((x) => {
                  const c = CAT_MAP[x.category] || { icon: '📦', label: x.category, color: '#94A3B8' };
                  return (
                    <Row
                      key={x.id}
                      icon={c.icon}
                      iconBg={c.color + '18'}
                      title={x.title}
                      sub={`${c.label} · ${format(x.date, 'long')} · ${partnerName(s, x.paidBy)}`}
                      amount={n(x.amount)}
                      amountTone="neg"
                      actions={
                        <button
                          className="icon-btn sm"
                          onClick={() => ui.open(<ExpenseForm id={x.id} onClose={ui.close} />)}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <Empty title="هزینه‌ای ثبت نشده" />
            )}
          </>
        )}

        {tab === 'sale' && (
          <>
            <SectionHead
              title="فروش این گله"
              sub={'جمع: ' + money(st.revenue, s.settings.currency)}
              action={
                <button
                  className="btn sm primary"
                  onClick={() => ui.open(<SaleForm onClose={ui.close} />)}
                >
                  <Icon name="plus" size={14} /> ثبت
                </button>
              }
            />
            {sales.length ? (
              <div className="rows">
                {sales.map((x) => (
                  <Row
                    key={x.id}
                    icon="🍗"
                    iconBg="#ECFDF5"
                    title={`${x.type} — ${n(x.qtyKg)} کیلو`}
                    sub={`${format(x.date, 'long')} · ${x.buyer || '—'} · کیلویی ${n(x.pricePerKg)}`}
                    amount={n(x.amount)}
                    amountTone="pos"
                    actions={
                      <button
                        className="icon-btn sm"
                        onClick={() => ui.open(<SaleForm id={x.id} onClose={ui.close} />)}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <Empty title="فروشی ثبت نشده" />
            )}
          </>
        )}
      </div>

      <div className="grid grid-2 mt">
        <div className="card">
          <SectionHead title="خلاصه مالی گله" />
          <div className="kv">
            <span>هزینه کل</span>
            <b>{money(st.expenses, s.settings.currency)}</b>
          </div>
          <div className="kv">
            <span>درآمد فروش</span>
            <b>{money(st.revenue, s.settings.currency)}</b>
          </div>
          <div className="kv">
            <span>سود / زیان</span>
            <b style={{ color: st.profit >= 0 ? '#059669' : '#DC2626' }}>
              {money(st.profit, s.settings.currency)}
            </b>
          </div>
          <div className="kv">
            <span>هزینه هر کیلو وزن زنده</span>
            <b>{money(st.costPerKg, s.settings.currency)}</b>
          </div>
        </div>
        <div className="card">
          <SectionHead title="شاخص‌های فنی" />
          <div className="kv">
            <span>تعداد اولیه</span>
            <b>{n(f.startCount)} قطعه</b>
          </div>
          <div className="kv">
            <span>تلفات + حذفی</span>
            <b>{n(st.mortality + st.culled)} قطعه</b>
          </div>
          <div className="kv">
            <span>فروش رفته (از معاملات)</span>
            <b style={{ color: st.sold > 0 ? '#6D28D9' : undefined }}>{n(st.sold)} قطعه</b>
          </div>
          <div className="kv">
            <span>موجودی زنده فعلی</span>
            <b>{n(st.alive)} قطعه</b>
          </div>
          <div className="kv">
            <span>مصرف دان کل</span>
            <b>{n(st.feedKg)} کیلو</b>
          </div>
          <div className="kv">
            <span>دان به ازای هر پرنده</span>
            <b>{n(st.feedPerBird, 1)} کیلو</b>
          </div>
          <div className="kv">
            <span>وزن زنده کل</span>
            <b>{n(st.biomass, 0)} کیلو</b>
          </div>
          <div className="kv">
            <span>ارزش تقریبی تلفات</span>
            <b style={{ color: '#DC2626' }}>
              {money(
                Math.round((st.expenses / Math.max(1, num(f.startCount))) * st.mortality),
                s.settings.currency,
              )}
            </b>
          </div>
        </div>
      </div>
    </>
  );
}
