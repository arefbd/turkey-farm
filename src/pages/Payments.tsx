/** دریافت‌ها و پرداخت‌ها — دفتر نقدی */
import { useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Chips, Empty, PageHead, Row, SectionHead, Stat } from '../components/ui';
import { accountById, actions, num, partnerById, personName, useApp } from '../data/store';
import { PAYMENT_METHOD_LABEL, TX_TYPE_LABEL } from '../data/categories';
import { format } from '../lib/jalali';
import { n, short } from '../lib/format';
import { PaymentForm, TransferForm } from '../forms/crm';

type Filter = 'all' | 'in' | 'out';

export function Payments() {
  const s = useApp();
  const ui = useUI();
  const [filter, setFilter] = useState<Filter>('all');

  const all = s.payments.slice().sort((a, b) => b.date.localeCompare(a.date));
  const list = filter === 'all' ? all : all.filter((p) => p.kind === filter);

  const totalIn = all.filter((p) => p.kind === 'in').reduce((a, p) => a + num(p.amount), 0);
  const totalOut = all.filter((p) => p.kind === 'out').reduce((a, p) => a + num(p.amount), 0);

  const openForm = (id?: string, kind?: 'in' | 'out') =>
    ui.open(<PaymentForm id={id} presetKind={kind} onClose={ui.close} />);

  const accountLabel = (p: (typeof all)[number]) => {
    const acc = p.accountId ? s.accounts.find((a) => a.id === p.accountId) : null;
    if (acc) return acc.name;
    if (p.accountType === 'partner') {
      return partnerById(s, p.partnerId)?.name || 'شریک';
    }
    return 'صندوق مشترک';
  };

  return (
    <>
      <PageHead
        title="دریافت‌ها و پرداخت‌ها"
        sub="همه اسناد نقدی — از مشتری، به تامین‌کننده یا بین شرکا"
        actions={
          <>
            <button className="btn" onClick={() => openForm(undefined, 'out')}>
              <Icon name="down" size={16} /> پرداخت
            </button>
            <button
              className="btn"
              onClick={() => ui.open(<TransferForm onClose={ui.close} />)}
            >
              <Icon name="exchange" size={16} /> انتقال
            </button>
            <button className="btn primary" onClick={() => openForm(undefined, 'in')}>
              <Icon name="plus" size={16} /> سند جدید
            </button>
          </>
        }
      />

      <div className="stats">
        <Stat icon="⬇️" label="جمع دریافت‌ها" value={short(totalIn)} unit="تومان" sub={`${n(all.filter((p) => p.kind === 'in').length)} سند`} />
        <Stat icon="⬆️" label="جمع پرداخت‌ها" value={short(totalOut)} unit="تومان" sub={`${n(all.filter((p) => p.kind === 'out').length)} سند`} />
        <Stat
          icon="💵"
          label="مانده نقدی"
          value={short(totalIn - totalOut)}
          unit="تومان"
          sub={totalIn - totalOut >= 0 ? 'مثبت' : 'منفی'}
        />
        <Stat icon="🧾" label="تعداد اسناد" value={n(all.length)} sub="کل دوره" />
      </div>

      <div className="mt-sm">
        <Chips
          items={[
            { value: 'all', label: 'همه' },
            { value: 'in', label: 'دریافت' },
            { value: 'out', label: 'پرداخت' },
          ]}
          active={filter}
          onPick={(v) => setFilter(v as Filter)}
        />
      </div>

      <div className="card mt">
        <SectionHead title="فهرست اسناد" sub={`${n(list.length)} سند`} />
        {list.length ? (
          <div className="rows">
            {list.map((p) => {
              const tx = s.transactions.find((t) => t.id === p.transactionId);
              const who = p.personId ? personName(s, p.personId) : accountLabel(p);
              return (
                <Row
                  key={p.id}
                  icon={p.kind === 'in' ? '⬇️' : '⬆️'}
                  iconBg={p.kind === 'in' ? '#ECFDF5' : '#FEF2F2'}
                  title={`${p.kind === 'in' ? 'دریافت از' : 'پرداخت به'} ${who}`}
                  sub={
                    `${p.code}${p.locked ? ' 🔒' : ''} · ${format(p.date, 'long')} · ${accountLabel(
                      p,
                    )} · ${PAYMENT_METHOD_LABEL[p.method] || ''}` +
                    (tx ? ` · معامله ${tx.code} (${TX_TYPE_LABEL[tx.type]})` : '')
                  }
                  amount={(p.kind === 'in' ? '+' : '−') + n(p.amount)}
                  amountTone={p.kind === 'in' ? 'pos' : 'neg'}
                  actions={
                    <>
                      <button
                        className="icon-btn sm"
                        title={p.locked ? 'باز کردن قفل' : 'قفل کردن سند'}
                        onClick={() => {
                          actions.update('payments', p.id, { locked: !p.locked });
                          ui.toast(p.locked ? 'قفل سند باز شد' : 'سند قفل شد');
                        }}
                      >
                        <Icon name={p.locked ? 'check' : 'filter'} size={14} />
                      </button>
                      <button
                        className="icon-btn sm"
                        onClick={() => {
                          if (p.locked) {
                            ui.toast('سند قفل است؛ ابتدا قفل را باز کنید', 'error');
                            return;
                          }
                          openForm(p.id);
                        }}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        className="icon-btn sm"
                        onClick={async () => {
                          if (p.locked) {
                            ui.toast('سند قفل است؛ ابتدا قفل را باز کنید', 'error');
                            return;
                          }
                          const ok = await ui.confirm('این سند حذف شود؟', {
                            danger: true,
                            ok: 'حذف',
                          });
                          if (ok) actions.remove('payments', p.id);
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
            title="سندی ثبت نشده"
            text="اولین دریافت یا پرداخت را ثبت کنید"
            action={
              <button className="btn primary sm" onClick={() => openForm()}>
                <Icon name="plus" size={14} /> سند جدید
              </button>
            }
          />
        )}
      </div>

      <div className="card mt">
        <SectionHead
          title="انتقال بین حساب‌ها"
          sub={`${n(s.transfers.length)} سند — جابه‌جایی پول بین صندوق، بانک و جیب شرکا`}
        />
        {s.transfers.length ? (
          <div className="rows">
            {s.transfers
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((t) => {
                const from = accountById(s, t.fromAccountId);
                const to = accountById(s, t.toAccountId);
                return (
                  <Row
                    key={t.id}
                    icon="🔁"
                    iconBg="#EEF2FF"
                    title={`${from?.name || '—'} ← ${to?.name || '—'}`}
                    sub={`${t.code} · ${format(t.date, 'long')}${t.note ? ' · ' + t.note : ''}`}
                    amount={n(t.amount)}
                    actions={
                      <>
                        <button
                          className="icon-btn sm"
                          onClick={() =>
                            ui.open(<TransferForm id={t.id} onClose={ui.close} />)
                          }
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          className="icon-btn sm"
                          onClick={async () => {
                            const ok = await ui.confirm('این انتقال حذف شود؟', {
                              danger: true,
                              ok: 'حذف',
                            });
                            if (ok) actions.remove('transfers', t.id);
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
            title="انتقالی ثبت نشده"
            text="برای جابه‌جایی پول بین حساب‌ها از دکمه «انتقال» استفاده کنید"
          />
        )}
      </div>
    </>
  );
}
