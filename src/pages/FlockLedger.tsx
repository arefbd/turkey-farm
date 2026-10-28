/** حساب دوره — همه‌چیز تفکیک‌شده برای یک گله/دوره، بدون تداخل با دوره‌های دیگر */
import { Empty, SectionHead, Stat } from '../components/ui';
import {
  flockById,
  flockSharePercents,
  num,
  openItems,
  personLabel,
  sumTransactions,
  useApp,
} from '../data/store';
import { PAY_MODE_LABEL, TX_TYPE_LABEL } from '../data/categories';
import { format, today } from '../lib/jalali';
import { n, short } from '../lib/format';

export function FlockLedger({ flockId }: { flockId: string }) {
  const s = useApp();
  const f = flockById(s, flockId);
  if (!f) return <Empty title="گله یافت نشد" />;

  const end = f.endDate || today();

  /* --- معاملات و هزینه‌های همین دوره --- */
  const txs = s.transactions
    .filter((t) => t.flockId === flockId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const exps = s.expenses
    .filter((e) => e.flockId === flockId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const sums = sumTransactions(txs);
  const expTotal = exps.reduce((a, e) => a + num(e.amount), 0);
  const profit = sums.revenue - sums.purchase - expTotal;

  /* --- طرف حساب‌های همین دوره --- */
  const paidByTx: Record<string, number> = {};
  s.payments.forEach((p) => {
    if (p.transactionId) paidByTx[p.transactionId] = (paidByTx[p.transactionId] || 0) + num(p.amount);
  });
  const openForFlock = openItems(s).filter((i) => txs.some((t) => t.id === i.txId));

  const byPerson = new Map<
    string,
    { name: string; buy: number; sell: number; paid: number; remaining: number }
  >();
  txs.forEach((t) => {
    const key = t.personId || t.personName || '—';
    const row =
      byPerson.get(key) ||
      {
        name: t.personName || personLabel(null),
        buy: 0,
        sell: 0,
        paid: 0,
        remaining: 0,
      };
    if (t.type === 'purchase') row.buy += num(t.total);
    if (t.type === 'purchase_return') row.buy -= num(t.total);
    if (t.type === 'sale') row.sell += num(t.total);
    if (t.type === 'sale_return') row.sell -= num(t.total);
    row.paid += paidByTx[t.id] || 0;
    byPerson.set(key, row);
  });
  openForFlock.forEach((i) => {
    const key = i.personId || i.personName || '—';
    const row = byPerson.get(key);
    if (row) row.remaining += i.remaining;
  });

  /* --- شرکای همین دوره --- */
  const percents = flockSharePercents(s, flockId);
  const partnerRows = s.partners.map((p) => {
    let buy = 0;
    let sell = 0;
    txs.forEach((t) => {
      const sh = (t.shares || []).find((x) => x.partnerId === p.id);
      if (!sh) return;
      if (t.type === 'purchase') buy += num(sh.amount);
      else if (t.type === 'purchase_return') buy -= num(sh.amount);
      else if (t.type === 'sale') sell += num(sh.amount);
      else if (t.type === 'sale_return') sell -= num(sh.amount);
    });
    return {
      id: p.id,
      name: p.name,
      percent: percents[p.id] ?? 0,
      buy,
      sell,
      net: sell - buy,
    };
  });

  const hasShareDef = Object.keys(percents).length > 0;

  return (
    <>
      <div className="card" style={{ background: '#FAF8FE', boxShadow: 'none' }}>
        <div className="kv">
          <span>بازه دوره</span>
          <b>
            {format(f.startDate, 'long')} تا {format(end, 'long')}
          </b>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          همه اعداد این صفحه فقط به این گله مربوط است؛ معاملات و هزینه‌های سایر دوره‌ها در آن اثری
          ندارند.
        </div>
      </div>

      <div className="stats mt">
        <Stat icon="📦" label="خرید دوره" value={short(sums.purchase)} unit="تومان" />
        <Stat icon="💰" label="فروش دوره" value={short(sums.revenue)} unit="تومان" />
        <Stat icon="🧾" label="هزینه عملیاتی" value={short(expTotal)} unit="تومان" />
        <Stat
          icon={profit >= 0 ? '📈' : '📉'}
          label="سود دوره"
          value={short(profit)}
          unit="تومان"
        />
      </div>

      <div className="card mt">
        <SectionHead
          title="طرف حساب‌های این دوره"
          sub={`${n(byPerson.size)} مشتری/تامین‌کننده — فقط معاملات همین گله`}
        />
        {byPerson.size ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>طرف حساب</th>
                  <th>خرید از او</th>
                  <th>فروش به او</th>
                  <th>تسویه‌شده</th>
                  <th>مانده</th>
                </tr>
              </thead>
              <tbody>
                {[...byPerson.values()].map((r) => (
                  <tr key={r.name}>
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td className="num-cell">{n(r.buy)}</td>
                    <td className="num-cell">{n(r.sell)}</td>
                    <td className="num-cell">{n(r.paid)}</td>
                    <td className="num-cell">
                      <b style={{ color: r.remaining > 0 ? '#DC2626' : '#059669' }}>
                        {n(r.remaining)}
                      </b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="hint" style={{ padding: '8px 2px' }}>
            برای این دوره معامله‌ای ثبت نشده است.
          </div>
        )}
      </div>

      <div className="card mt">
        <SectionHead
          title="شرکای این دوره"
          sub={hasShareDef ? 'سهم از خرید و فروش همین گله' : 'برای این گله سهمی تعریف نشده'}
        />
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>شریک</th>
                <th>سهم دوره</th>
                <th>سهم از خرید</th>
                <th>سهم از فروش</th>
                <th>خالص</th>
              </tr>
            </thead>
            <tbody>
              {partnerRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td className="num-cell">{n(r.percent, 1)}٪</td>
                  <td className="num-cell">{n(r.buy)}</td>
                  <td className="num-cell">{n(r.sell)}</td>
                  <td className="num-cell">
                    <b style={{ color: r.net >= 0 ? '#059669' : '#DC2626' }}>{n(r.net)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="معاملات دوره" sub={`${n(txs.length)} سند`} />
        {txs.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>کد</th>
                  <th>نوع</th>
                  <th>طرف حساب</th>
                  <th>اقلام</th>
                  <th>پرداخت</th>
                  <th>مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td>{format(t.date, 'short')}</td>
                    <td className="num-cell">{t.code}</td>
                    <td>{TX_TYPE_LABEL[t.type] || t.type}</td>
                    <td>{t.personName || '—'}</td>
                    <td className="hint">
                      {(t.items || [])
                        .slice(0, 2)
                        .map((i) => i.name)
                        .join('، ')}
                      {(t.items || []).length > 2 ? ' …' : ''}
                    </td>
                    <td>{PAY_MODE_LABEL[t.payMode] || '—'}</td>
                    <td className="num-cell">{n(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="hint" style={{ padding: '8px 2px' }}>
            معامله‌ای به این گله وصل نشده است.
          </div>
        )}
      </div>

      <div className="card mt">
        <SectionHead title="هزینه‌های دوره" sub={`${n(exps.length)} رکورد`} />
        {exps.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>عنوان</th>
                  <th>مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {exps.slice(0, 15).map((e) => (
                  <tr key={e.id}>
                    <td>{format(e.date, 'short')}</td>
                    <td>{e.title}</td>
                    <td className="num-cell">{n(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="hint" style={{ padding: '8px 2px' }}>
            هزینه‌ای به این گله نسبت داده نشده است.
          </div>
        )}
      </div>
    </>
  );
}
