/** فروش و درآمد */
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Bars, Donut } from '../components/Charts';
import { Empty, PageHead, Row, SectionHead, Stat } from '../components/ui';
import { actions, num, partnerName, useApp } from '../data/store';
import { format, today } from '../lib/jalali';
import { download, n, pct, short, toCsv } from '../lib/format';
import { SaleForm } from '../forms';

const COLORS = ['#6D28D9', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#06B6D4', '#F59E0B', '#10B981'];

export function Sales() {
  const s = useApp();
  const ui = useUI();

  const sales = s.sales.slice().sort((a, b) => b.date.localeCompare(a.date));
  const total = sales.reduce((a, b) => a + num(b.amount), 0);
  const kg = sales.reduce((a, b) => a + num(b.qtyKg), 0);

  const byTypeMap: Record<string, { kg: number; amount: number; count: number }> = {};
  sales.forEach((x) => {
    byTypeMap[x.type] = byTypeMap[x.type] || { kg: 0, amount: 0, count: 0 };
    byTypeMap[x.type].kg += num(x.qtyKg);
    byTypeMap[x.type].amount += num(x.amount);
    byTypeMap[x.type].count++;
  });
  const types = Object.keys(byTypeMap)
    .map((k) => ({ label: k, ...byTypeMap[k] }))
    .sort((a, b) => b.amount - a.amount);

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ['تاریخ', 'نوع محصول', 'وزن (کیلو)', 'قیمت هر کیلو', 'مبلغ کل', 'خریدار', 'گله', 'واریز به'],
    ];
    sales.forEach((x) => {
      rows.push([
        x.date,
        x.type,
        num(x.qtyKg),
        num(x.pricePerKg),
        num(x.amount),
        x.buyer || '',
        x.flockId,
        partnerName(s, x.paidTo),
      ]);
    });
    download(`sales-${today().replace(/\//g, '-')}.csv`, toCsv(rows));
    ui.toast('فایل خروجی آماده شد');
  };

  return (
    <>
      <PageHead
        title="فروش و درآمد"
        sub="ثبت فروش گوشت، ران، سینه و سایر محصولات"
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Icon name="download" size={16} /> خروجی
            </button>
            <button className="btn primary" onClick={() => ui.open(<SaleForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> ثبت فروش
            </button>
          </>
        }
      />

      <div className="stats">
        <Stat icon="💰" label="درآمد کل" value={short(total)} unit="تومان" sub={`${n(sales.length)} فاکتور`} />
        <Stat icon="⚖️" label="وزن فروخته‌شده" value={n(kg)} unit="کیلو" />
        <Stat icon="🏷️" label="میانگین هر کیلو" value={short(kg ? total / kg : 0)} unit="تومان" />
        <Stat icon="📦" label="تنوع محصول" value={n(types.length)} sub="نوع محصول" />
      </div>

      {types.length ? (
        <div className="grid grid-side mt">
          <div className="card">
            <SectionHead title="درآمد به تفکیک محصول" />
            <Bars
              labels={types.map((t) => t.label)}
              series={[{ values: types.map((t) => t.amount), color: '#7C3AED' }]}
              height={200}
              barWidth={22}
            />
          </div>
          <div className="card">
            <SectionHead title="سهم محصولات" />
            <Donut
              items={types.map((t, i) => ({
                label: t.label,
                value: t.amount,
                color: COLORS[i % COLORS.length],
              }))}
              size={148}
              centerLabel="درآمد"
              centerValue={short(total)}
            />
            <div className="donut-legend" style={{ marginTop: 10 }}>
              {types.map((t, i) => (
                <div className="dl" key={t.label}>
                  <i style={{ background: COLORS[i % COLORS.length] }} />
                  <span>
                    {t.label} ({n(t.kg)} کیلو)
                  </span>
                  <b>{pct(total ? (t.amount / total) * 100 : 0, 0)}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card mt">
        <SectionHead title="فهرست فروش‌ها" sub={`${n(sales.length)} رکورد`} />
        {sales.length ? (
          <div className="rows">
            {sales.map((x) => (
              <Row
                key={x.id}
                icon="🍗"
                iconBg="#ECFDF5"
                title={`${x.type} — ${n(x.qtyKg)} کیلو`}
                sub={`${format(x.date, 'long')} · ${x.buyer || 'بدون خریدار'} · کیلویی ${n(x.pricePerKg)} · ${partnerName(s, x.paidTo)}`}
                amount={'+' + n(x.amount)}
                amountTone="pos"
                actions={
                  <>
                    <button
                      className="icon-btn sm"
                      onClick={() => ui.open(<SaleForm id={x.id} onClose={ui.close} />)}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      className="icon-btn sm"
                      onClick={async () => {
                        const ok = await ui.confirm('این رکورد فروش حذف شود؟', {
                          danger: true,
                          ok: 'حذف',
                        });
                        if (ok) actions.remove('sales', x.id);
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
          <Empty title="فروشی ثبت نشده" text="اولین فروش را ثبت کنید" />
        )}
      </div>

      {types.length ? (
        <div className="card mt">
          <SectionHead title="جدول تجمیعی محصولات" />
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>محصول</th>
                  <th>تعداد فاکتور</th>
                  <th>وزن (کیلو)</th>
                  <th>مبلغ (تومان)</th>
                  <th>میانگین کیلویی</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.label}>
                    <td>
                      <b>{t.label}</b>
                    </td>
                    <td>{n(t.count)}</td>
                    <td className="num-cell">{n(t.kg)}</td>
                    <td className="num-cell">{n(t.amount)}</td>
                    <td className="num-cell">{n(t.kg ? t.amount / t.kg : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
