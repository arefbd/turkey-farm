/** معاملات — خرید، فروش و برگشتی‌ها */
import { useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Chips, Empty, PageHead, Row, SectionHead, Stat } from '../components/ui';
import { actions, num, personName, sumTransactions, txStockDelta, useApp } from '../data/store';
import { PAY_MODE_LABEL, TX_TYPE_LABEL } from '../data/categories';
import { format } from '../lib/jalali';
import { download, n, short, toCsv } from '../lib/format';
import { TransactionForm } from '../forms/crm';
import { today } from '../lib/jalali';
import type { Transaction } from '../data/types';

type Filter = 'all' | 'purchase' | 'sale' | 'purchase_return' | 'sale_return';

const TYPE_TONE: Record<string, string> = {
  sale: 'green',
  purchase: 'gray',
  sale_return: 'red',
  purchase_return: 'brand',
};

export function Transactions() {
  const s = useApp();
  const ui = useUI();
  const [filter, setFilter] = useState<Filter>('all');

  const all = s.transactions.slice().sort((a, b) => b.date.localeCompare(a.date));
  const list = filter === 'all' ? all : all.filter((t) => t.type === filter);
  const sums = sumTransactions(list);
  const net = sums.revenue - sums.purchase;

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ['کد سند', 'تاریخ', 'نوع', 'طرف حساب', 'نوع پرداخت', 'تعداد اقلام', 'مبلغ کل'],
    ];
    list.forEach((t) => {
      rows.push([
        t.code,
        t.date,
        TX_TYPE_LABEL[t.type] || t.type,
        t.personName || personName(s, t.personId),
        PAY_MODE_LABEL[t.payMode] || t.payMode,
        (t.items || []).length,
        num(t.total),
      ]);
    });
    download(`transactions-${today().replace(/\//g, '-')}.csv`, toCsv(rows));
    ui.toast('فایل خروجی آماده شد');
  };

  const openForm = (id?: string) =>
    ui.open(<TransactionForm id={id} onClose={ui.close} />);

  return (
    <>
      <PageHead
        title="معاملات"
        sub="خرید و فروش جوجه، گوشت و خوراک — با اقلام فاکتور و سهم شرکا"
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Icon name="download" size={16} /> خروجی
            </button>
            <button className="btn primary" onClick={() => openForm()}>
              <Icon name="plus" size={16} /> معامله جدید
            </button>
          </>
        }
      />

      <div className="stats">
        <Stat icon="💰" label="فروش خالص" value={short(sums.revenue)} unit="تومان" sub={`${n(sums.saleCount)} فاکتور فروش`} />
        <Stat icon="📦" label="خرید خالص" value={short(sums.purchase)} unit="تومان" sub={`${n(sums.purchaseCount)} فاکتور خرید`} />
        <Stat
          icon={net >= 0 ? '📈' : '📉'}
          label="تراز خرید و فروش"
          value={short(net)}
          unit="تومان"
          sub="فروش منهای خرید"
        />
        <Stat icon="🧾" label="تعداد اسناد" value={n(list.length)} sub="در فیلتر فعلی" />
      </div>

      <div className="mt-sm">
        <Chips
          items={[
            { value: 'all', label: 'همه انواع' },
            { value: 'purchase', label: 'خرید' },
            { value: 'sale', label: 'فروش' },
            { value: 'purchase_return', label: 'برگشت از خرید' },
            { value: 'sale_return', label: 'برگشت از فروش' },
          ]}
          active={filter}
          onPick={(v) => setFilter(v as Filter)}
        />
      </div>

      <div className="card mt">
        <SectionHead title="فهرست معاملات" sub={`${n(list.length)} سند`} />
        {list.length ? (
          <div className="rows">
            {list.map((t: Transaction) => {
              const qty = (t.items || []).reduce((a, i) => a + num(i.qty), 0);
              return (
                <Row
                  key={t.id}
                  icon={t.type === 'sale' || t.type === 'sale_return' ? '🍗' : '📦'}
                  iconBg={t.type === 'sale' ? '#ECFDF5' : t.type === 'purchase' ? '#F4EEFF' : '#FEF2F2'}
                  title={`${TX_TYPE_LABEL[t.type] || t.type} · ${t.personName || personName(s, t.personId)}`}
                  sub={
                    `${t.code} · ${format(t.date, 'long')} · ` +
                    (t.items || [])
                      .slice(0, 2)
                      .map((i) => i.name)
                      .join('، ') +
                    ((t.items || []).length > 2 ? ' و ...' : '') +
                    ` · ${n(qty)} عدد · ${PAY_MODE_LABEL[t.payMode] || ''}`
                  }
                  amount={n(t.total)}
                  amountTone={t.type === 'sale' ? 'pos' : t.type === 'purchase' ? 'neg' : ''}
                  badge={
                    <div className="row-side" style={{ marginInlineStart: 6 }}>
                      <span className={'badge ' + (TYPE_TONE[t.type] || 'gray')}>
                        {TX_TYPE_LABEL[t.type]}
                      </span>
                    </div>
                  }
                  actions={
                    <>
                      <button className="icon-btn sm" onClick={() => openForm(t.id)}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        className="icon-btn sm"
                        onClick={async () => {
                          const ok = await ui.confirm('این سند معامله حذف شود؟', {
                            danger: true,
                            ok: 'حذف',
                          });
                          if (ok) {
                            actions.adjustStock(txStockDelta(t, -1));
                            actions.remove('transactions', t.id);
                            ui.toast('سند حذف و موجودی انبار اصلاح شد');
                          }
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </>
                  }
                />
              );
            })}
          </div>
        ) : (
          <Empty
            title="معامله‌ای ثبت نشده"
            text="اولین خرید یا فروش را ثبت کنید"
            action={
              <button className="btn primary sm" onClick={() => openForm()}>
                <Icon name="plus" size={14} /> معامله جدید
              </button>
            }
          />
        )}
      </div>
    </>
  );
}
