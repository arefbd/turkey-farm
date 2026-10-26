/** شرکا، آورده‌ها، تسویه حساب و معاملات دلالی */
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Avatar, Bar, Empty, PageHead, Row, SectionHead, Stat } from '../components/ui';
import {
  actions,
  num,
  partnerById,
  settlement,
  suggestTransfers,
  totalShare,
  useApp,
} from '../data/store';
import { format } from '../lib/jalali';
import { money, n, short } from '../lib/format';
import { ContributionForm, DealForm, PartnerForm } from '../forms';

const dealProfit = (d: { sellPrice: number; buyPrice: number; qty: number; commission: number }) =>
  (num(d.sellPrice) - num(d.buyPrice)) * num(d.qty) + num(d.commission);

export function Partners() {
  const s = useApp();
  const ui = useUI();

  const settle = settlement(s);
  const shareTotal = totalShare(s);
  const totalCapital = settle.rows.reduce((a, r) => a + r.capital, 0);
  const deals = s.deals.slice().sort((a, b) => b.date.localeCompare(a.date));
  const totalDealProfit = deals.reduce((a, d) => a + dealProfit(d), 0);
  const transfers = suggestTransfers(settle.rows, settle.surplus);

  return (
    <>
      <PageHead
        title="شرکا و تسویه حساب"
        sub="مدیریت سهام، آورده‌ها و تقسیم هزینه‌ها بین شرکا"
        actions={
          <>
            <button className="btn" onClick={() => ui.open(<ContributionForm onClose={ui.close} />)}>
              <Icon name="money" size={16} /> ثبت آورده
            </button>
            <button className="btn primary" onClick={() => ui.open(<PartnerForm onClose={ui.close} />)}>
              <Icon name="users" size={16} /> شریک جدید
            </button>
          </>
        }
      />

      {Math.abs(shareTotal - 100) > 0.5 ? (
        <div className="card" style={{ background: '#FFFBEB', borderColor: '#FDE68A', boxShadow: 'none' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="alert" size={18} />
            <div>
              <b style={{ fontSize: 12.5 }}>جمع سهم شرکا {n(shareTotal, 1)}٪ است</b>
              <div className="hint">برای تقسیم دقیق هزینه‌ها، مجموع درصدها باید ۱۰۰ باشد.</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="stats">
        <Stat icon="👥" label="تعداد شرکا" value={n(s.partners.length)} sub={`جمع سهام ${n(shareTotal, 0)}٪`} />
        <Stat icon="💰" label="سرمایه آورده‌شده" value={short(totalCapital)} unit="تومان" />
        <Stat icon="💸" label="هزینه‌های تقسیم‌شده" value={short(settle.totalExp)} unit="تومان" />
        <Stat
          icon="🤝"
          label="سود معاملات دلالی"
          value={short(totalDealProfit)}
          unit="تومان"
          sub={`${n(deals.length)} معامله`}
        />
      </div>

      <div className="grid grid-2 mt">
        {s.partners.map((p) => {
          const row = settle.rows.find((r) => r.id === p.id) || {
            balance: 0,
            capital: 0,
            paidDirect: 0,
            shareExp: 0,
          };
          const pos = row.balance >= 0;
          const pDeals = deals.filter((d) => d.partnerId === p.id);
          return (
            <div className="card partner-card" key={p.id}>
              <div className="partner-head">
                <Avatar name={p.name} color={p.color} size={44} />
                <div>
                  <b>{p.name}</b>
                  <span>
                    {p.role || 'شریک'}
                    {p.phone ? ' · ' + p.phone : ''}
                  </span>
                </div>
                <span className="share-pill">{n(p.share)}٪</span>
              </div>

              <div className="progress-row">
                <Bar value={p.share} color={p.color} />
              </div>

              <div className="grid grid-2" style={{ gap: 8 }}>
                <div>
                  <div className="hint">آورده نقدی</div>
                  <b style={{ fontSize: 13 }}>{short(row.capital)}</b>
                </div>
                <div>
                  <div className="hint">پرداخت مستقیم</div>
                  <b style={{ fontSize: 13 }}>{short(row.paidDirect)}</b>
                </div>
                <div>
                  <div className="hint">سهم از هزینه</div>
                  <b style={{ fontSize: 13 }}>{short(row.shareExp)}</b>
                </div>
                <div>
                  <div className="hint">معاملات دلالی</div>
                  <b style={{ fontSize: 13 }}>{n(pDeals.length)} مورد</b>
                </div>
              </div>

              <div
                className="card"
                style={{
                  boxShadow: 'none',
                  background: pos ? '#F1FCF6' : '#FEF4F4',
                  border: '1px solid ' + (pos ? '#D1FAE5' : '#FEE2E2'),
                  padding: '11px 13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>مانده حساب</span>
                  <b style={{ fontSize: 14, color: pos ? '#059669' : '#DC2626' }}>
                    {short(Math.abs(row.balance))} تومان {pos ? 'طلب' : 'بدهی'}
                  </b>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn sm"
                  onClick={() => ui.open(<ContributionForm partnerId={p.id} onClose={ui.close} />)}
                >
                  آورده
                </button>
                <button
                  className="btn sm"
                  onClick={() => ui.open(<PartnerForm id={p.id} onClose={ui.close} />)}
                >
                  ویرایش
                </button>
                <button
                  className="btn sm ghost"
                  onClick={async () => {
                    const ok = await ui.confirm(
                      'این شریک حذف شود؟ سابقه هزینه‌های او حفظ می‌شود.',
                      { danger: true, ok: 'حذف' },
                    );
                    if (ok) actions.remove('partners', p.id);
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt">
        <SectionHead title="جدول تسویه حساب" sub="بر اساس هزینه‌های پرداخت‌شده و سهم هر شریک" />
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>شریک</th>
                <th>سهم</th>
                <th>آورده</th>
                <th>پرداخت مستقیم</th>
                <th>سهم از هزینه‌ها</th>
                <th>سهم از معاملات</th>
                <th>مانده</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {settle.rows.map((r) => {
                const pos = r.balance >= 0;
                return (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td>{n(r.share)}٪</td>
                    <td className="num-cell">{n(r.capital)}</td>
                    <td className="num-cell">{n(r.paidDirect)}</td>
                    <td className="num-cell">{n(r.shareExp)}</td>
                    <td
                      className="num-cell"
                      style={{ color: r.shareTx >= 0 ? '#059669' : '#DC2626' }}
                      title={`خرید: ${n(r.shareBuy)} — فروش: ${n(r.shareSell)}`}
                    >
                      {n(r.shareTx)}
                    </td>
                    <td className="num-cell" style={{ color: pos ? '#059669' : '#DC2626' }}>
                      <b>{n(r.balance)}</b>
                    </td>
                    <td>
                      <span className={'badge ' + (pos ? 'green' : 'red')}>
                        {pos ? 'طلبکار' : 'بدهکار'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#FBF9FF' }}>
                <td>
                  <b>جمع</b>
                </td>
                <td>{n(shareTotal)}٪</td>
                <td className="num-cell">{n(totalCapital)}</td>
                <td className="num-cell">—</td>
                <td className="num-cell">{n(settle.totalExp)}</td>
                <td
                  className="num-cell"
                  style={{ color: settle.txNet >= 0 ? '#059669' : '#DC2626' }}
                >
                  {n(settle.txNet)}
                </td>
                <td
                  className="num-cell"
                  style={{ color: settle.surplus >= 0 ? '#059669' : '#DC2626' }}
                >
                  {n(settle.surplus)}
                </td>
                <td>
                  <span className="badge gray">موجودی صندوق</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="hint" style={{ marginTop: 8, lineHeight: 1.9 }}>
          مانده هر شریک = آورده + پرداخت مستقیم − سهم از هزینه‌ها + سهم از معاملات
          <br />
          «سهم از معاملات» = سهم او از فروش منهای سهم او از بهای خرید (بر اساس درصد ثبت‌شده در هر
          معامله). عدد مثبت یعنی طلبکار و منفی یعنی بدهکار.
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="سهم شرکا از معاملات" sub="بر اساس درصد تعیین‌شده در هر معامله" />
        {s.transactions.length ? (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>شریک</th>
                    <th>سهم از خرید</th>
                    <th>سهم از فروش</th>
                    <th>خالص (فروش − خرید)</th>
                  </tr>
                </thead>
                <tbody>
                  {s.partners.map((p) => {
                    let buy = 0;
                    let sell = 0;
                    s.transactions.forEach((t) => {
                      const sh = (t.shares || []).find((x) => x.partnerId === p.id);
                      if (!sh) return;
                      if (t.type === 'purchase') buy += num(sh.amount);
                      else if (t.type === 'purchase_return') buy -= num(sh.amount);
                      else if (t.type === 'sale') sell += num(sh.amount);
                      else if (t.type === 'sale_return') sell -= num(sh.amount);
                    });
                    const net = sell - buy;
                    return (
                      <tr key={p.id}>
                        <td>
                          <b>{p.name}</b>
                        </td>
                        <td className="num-cell">{n(buy)}</td>
                        <td className="num-cell">{n(sell)}</td>
                        <td className="num-cell" style={{ color: net >= 0 ? '#059669' : '#DC2626' }}>
                          {n(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              مبالغ بر اساس سهم درصدی ثبت‌شده در هر معامله محاسبه شده است.
            </div>
          </>
        ) : (
          <div className="hint" style={{ padding: '8px 2px' }}>
            هنوز معامله‌ای ثبت نشده است. پس از ثبت معامله، سهم هر شریک اینجا نمایش داده می‌شود.
          </div>
        )}
      </div>

      <div className="card mt">
        <SectionHead title="تطبیق نقدی" sub="بر اساس اسناد دریافت و پرداخت" />
        <div className="grid grid-3" style={{ gap: 10 }}>
          <div className="kv" style={{ display: 'block' }}>
            <span>جمع دریافت‌ها</span>
            <br />
            <b style={{ color: '#059669' }}>{short(settle.cashIn)}</b>
          </div>
          <div className="kv" style={{ display: 'block' }}>
            <span>جمع پرداخت‌ها</span>
            <br />
            <b style={{ color: '#DC2626' }}>{short(settle.cashOut)}</b>
          </div>
          <div className="kv" style={{ display: 'block' }}>
            <span>موجودی نقدی صندوق</span>
            <br />
            <b style={{ color: settle.cashBalance >= 0 ? '#059669' : '#DC2626' }}>
              {short(settle.cashBalance)}
            </b>
          </div>
        </div>
        <div className="hint" style={{ marginTop: 8, lineHeight: 1.9 }}>
          جمع مانده شرکا ({short(settle.surplus)}) با موجودی نقدی ({short(settle.cashBalance)})
          برابر نیست و نباید باشد: تفاوت آن، ارزش موجودی انبار و مطالبات/بدهی‌های نسیه است.
          پرداخت‌هایی که شریک از جیب خود انجام داده و دریافت‌هایی که خودش به دست گرفته، در مانده
          حسابش لحاظ شده است.
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="پیشنهاد تسویه نهایی" sub="برای برابر شدن مانده حساب شرکا" />
        {transfers.length ? (
          transfers.map((t, i) => (
            <div className="alert-item" style={{ background: '#F7F4FF' }} key={i}>
              <span className="ai-ic">💸</span>
              <div>
                <h5>
                  {t.from} باید به {t.to} بپردازد
                </h5>
                <p>
                  مبلغ <b>{money(t.amount, s.settings.currency)}</b> پرداخت شود.
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="alert-item ok">
            <span className="ai-ic">✅</span>
            <div>
              <h5>حساب‌ها متوازن است</h5>
              <p>هیچ پرداختی بین شرکا لازم نیست.</p>
            </div>
          </div>
        )}
        <div className="hint" style={{ marginTop: 8 }}>
          موجودی نقدی صندوق ({money(settle.surplus, s.settings.currency)}) پیش از این تسویه، به نسبت
          سهم بین شرکا لحاظ شده است.
        </div>
        <button className="btn sm block mt-sm no-print" onClick={() => window.print()}>
          <Icon name="print" size={15} /> چاپ صورت‌حساب شرکا
        </button>
      </div>

      <div className="card mt">
        <SectionHead
          title="سابقه آورده‌ها و برداشت‌ها"
          sub={`${n(s.contributions.length)} رکورد`}
          action={
            <button className="btn sm" onClick={() => ui.open(<ContributionForm onClose={ui.close} />)}>
              <Icon name="plus" size={14} /> ثبت
            </button>
          }
        />
        {s.contributions.length ? (
          <div className="rows">
            {s.contributions
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((c) => {
                const p = partnerById(s, c.partnerId) || { name: '—', color: '#999' };
                return (
                  <Row
                    key={c.id}
                    icon={<Avatar name={p.name} color={p.color} size={30} />}
                    iconBg={p.color + '1A'}
                    title={p.name}
                    sub={`${format(c.date, 'long')}${c.note ? ' · ' + c.note : ''}`}
                    amount={`${c.amount >= 0 ? '+' : '−'}${n(Math.abs(c.amount))}`}
                    amountTone={c.amount >= 0 ? 'pos' : 'neg'}
                    actions={
                      <button
                        className="icon-btn sm"
                        onClick={async () => {
                          const ok = await ui.confirm('این رکورد آورده حذف شود؟', {
                            danger: true,
                            ok: 'حذف',
                          });
                          if (ok) actions.remove('contributions', c.id);
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    }
                  />
                );
              })}
          </div>
        ) : (
          <Empty title="آورده‌ای ثبت نشده" />
        )}
      </div>

      <div className="card mt">
        <SectionHead
          title="معاملات جداگانه و دلالی"
          sub="هر معامله به نام شریک انجام‌دهنده ثبت می‌شود"
          action={
            <button className="btn sm primary" onClick={() => ui.open(<DealForm onClose={ui.close} />)}>
              <Icon name="plus" size={14} /> معامله جدید
            </button>
          }
        />
        {deals.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>دلال</th>
                  <th>کالا</th>
                  <th>مقدار</th>
                  <th>خرید</th>
                  <th>فروش</th>
                  <th>کمیسیون</th>
                  <th>سود</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => {
                  const p = partnerById(s, d.partnerId) || { name: '—' };
                  const prof = dealProfit(d);
                  return (
                    <tr key={d.id}>
                      <td>{format(d.date, 'short')}</td>
                      <td>
                        <b>{p.name}</b>
                      </td>
                      <td>{d.item || '—'}</td>
                      <td className="num-cell">
                        {n(d.qty)} {d.unit || ''}
                      </td>
                      <td className="num-cell">{n(d.buyPrice)}</td>
                      <td className="num-cell">{n(d.sellPrice)}</td>
                      <td className="num-cell">{n(d.commission)}</td>
                      <td className="num-cell" style={{ color: prof >= 0 ? '#059669' : '#DC2626' }}>
                        {n(prof)}
                      </td>
                      <td>
                        <button
                          className="icon-btn sm"
                          onClick={async () => {
                            const ok = await ui.confirm('این معامله حذف شود؟', {
                              danger: true,
                              ok: 'حذف',
                            });
                            if (ok) actions.remove('deals', d.id);
                          }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="معامله‌ای ثبت نشده" text="معاملات دلالی هر شریک را جداگانه ثبت کنید" />
        )}
      </div>
    </>
  );
}
