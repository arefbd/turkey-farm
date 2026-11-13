/**
 * دریافت‌ها و پرداخت‌ها — خزانه‌داری پیشرفته، چک‌های صیادی، راس‌گیری و مغایرت‌گیری بانکی
 */
import { useMemo, useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Chips, Empty, PageHead, Row, SectionHead, Stat } from '../components/ui';
import {
  accountById,
  actions,
  calculateRaas,
  num,
  partnerById,
  personName,
  useApp,
} from '../data/store';
import { PAYMENT_METHOD_LABEL, TX_TYPE_LABEL } from '../data/categories';
import { diff, format, today } from '../lib/jalali';
import { money, n, short } from '../lib/format';
import { PaymentForm, TransferForm } from '../forms/crm';
import {
  ChequeActionModal,
  ChequeForm,
  CHEQUE_STATUS_INFO,
} from '../forms';
import type { Account, Cheque } from '../data/types';

type MainTab = 'cash' | 'cheques' | 'raas' | 'reconciliation';
type CashFilter = 'all' | 'in' | 'out';
type ChequeFilter = 'all' | 'in' | 'out' | 'pending' | 'cleared' | 'bounced' | 'passed_on';

export function Payments() {
  const s = useApp();
  const ui = useUI();
  const [mainTab, setMainTab] = useState<MainTab>('cash');

  // فیلترهای نقدی
  const [cashFilter, setCashFilter] = useState<CashFilter>('all');
  const allPayments = s.payments.slice().sort((a, b) => b.date.localeCompare(a.date));
  const cashList = cashFilter === 'all' ? allPayments : allPayments.filter((p) => p.kind === cashFilter);

  const totalIn = allPayments.filter((p) => p.kind === 'in').reduce((a, p) => a + num(p.amount), 0);
  const totalOut = allPayments.filter((p) => p.kind === 'out').reduce((a, p) => a + num(p.amount), 0);

  // فیلترها و محاسبات چک‌های صیادی
  const [chequeFilter, setChequeFilter] = useState<ChequeFilter>('all');
  const [activeChequeAction, setActiveChequeAction] = useState<Cheque | null>(null);

  const cheques = s.cheques || [];
  const filteredCheques = useMemo(() => {
    return cheques
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .filter((c) => {
        if (chequeFilter === 'all') return true;
        if (chequeFilter === 'in' || chequeFilter === 'out') return c.kind === chequeFilter;
        return c.status === chequeFilter;
      });
  }, [cheques, chequeFilter]);

  const pendingCheques = cheques.filter((c) => c.status === 'pending');
  const clearedCheques = cheques.filter((c) => c.status === 'cleared');
  const bouncedCheques = cheques.filter((c) => c.status === 'bounced');
  const passedCheques = cheques.filter((c) => c.status === 'passed_on');

  const pendingInTotal = pendingCheques.filter((c) => c.kind === 'in').reduce((sum, c) => sum + num(c.amount), 0);
  const pendingOutTotal = pendingCheques.filter((c) => c.kind === 'out').reduce((sum, c) => sum + num(c.amount), 0);
  const clearedTotal = clearedCheques.reduce((sum, c) => sum + num(c.amount), 0);
  const bouncedTotal = bouncedCheques.reduce((sum, c) => sum + num(c.amount), 0);

  // راس‌گیری صیادی
  const [raasBaseDate, setRaasBaseDate] = useState(today());
  const [selectedChequeIds, setSelectedChequeIds] = useState<Record<string, boolean>>({});
  const [customRaasRows, setCustomRaasRows] = useState<Array<{ id: string; amount: string; dueDate: string }>>([
    { id: '1', amount: '', dueDate: today() },
  ]);

  const raasItemsToCalculate = useMemo(() => {
    const list: Array<{ amount: number; dueDate: string }> = [];
    // ۱. چک‌های انتخاب‌شده از سیستم
    cheques.forEach((c) => {
      if (selectedChequeIds[c.id]) {
        list.push({ amount: num(c.amount), dueDate: c.dueDate });
      }
    });
    // ۲. سطرهای دستی
    customRaasRows.forEach((r) => {
      if (num(r.amount) > 0 && r.dueDate) {
        list.push({ amount: num(r.amount), dueDate: r.dueDate });
      }
    });
    return list;
  }, [cheques, selectedChequeIds, customRaasRows]);

  const raasResult = useMemo(() => {
    return calculateRaas(raasItemsToCalculate, raasBaseDate);
  }, [raasItemsToCalculate, raasBaseDate]);

  // مغایرت‌گیری بانکی
  const bankAccounts = useMemo(() => s.accounts.filter((a: Account) => a.active !== false), [s.accounts]);
  const [reconcileAccountId, setReconcileAccountId] = useState(bankAccounts[0]?.id || '');
  const [reconFilter, setReconFilter] = useState<'all' | 'open' | 'reconciled'>('all');

  const selectedAccount = s.accounts.find((a) => a.id === reconcileAccountId);

  // اسناد متصل به این حساب (پرداخت‌ها و چک‌های وصول‌شده)
  const accountPaymentItems = useMemo(() => {
    if (!reconcileAccountId) return [];
    return allPayments.filter((p) => p.accountId === reconcileAccountId);
  }, [allPayments, reconcileAccountId]);

  const accountChequeItems = useMemo(() => {
    if (!reconcileAccountId) return [];
    return cheques.filter((c) => c.accountId === reconcileAccountId || c.destinationAccountId === reconcileAccountId);
  }, [cheques, reconcileAccountId]);

  const openForm = (id?: string, kind?: 'in' | 'out') =>
    ui.open(<PaymentForm id={id} presetKind={kind} onClose={ui.close} />);

  const accountLabel = (p: (typeof allPayments)[number]) => {
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
        title={
          mainTab === 'cash'
            ? 'دریافت‌ها و پرداخت‌های نقدی'
            : mainTab === 'cheques'
            ? 'مدیریت چک‌های صیادی و اسناد تجاری'
            : mainTab === 'raas'
            ? 'ماشین‌حساب راس‌گیری صیادی و فاکتورها'
            : 'مغایرت‌گیری بانکی و تطبیق خزانه‌داری'
        }
        sub={
          mainTab === 'cash'
            ? 'مدیریت واریزی‌ها، برداشت‌ها و نقل‌وانتقالات بین‌حسابی'
            : mainTab === 'cheques'
            ? 'سامانه کنترل چک‌های دریافتی/پرداختی، اعلام وصول، واخواست و خرج‌کردن'
            : mainTab === 'raas'
            ? 'محاسبه سررسید میانگین وزنی چک‌ها و تطبیق با مهلت پرداخت فاکتور'
            : 'کنترل اقلام باز، چک‌های در راه و تطبیق دفتر مالی با صورتحساب بانک'
        }
        actions={
          mainTab === 'cash' ? (
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
          ) : mainTab === 'cheques' ? (
            <div className="flex gap-2">
              <button
                className="btn"
                onClick={() => ui.open(<ChequeForm presetKind="out" onClose={ui.close} />)}
              >
                <Icon name="down" size={16} /> ثبت چک پرداختی
              </button>
              <button
                className="btn primary"
                onClick={() => ui.open(<ChequeForm presetKind="in" onClose={ui.close} />)}
              >
                <Icon name="plus" size={16} /> ثبت چک دریافتی (صیاد)
              </button>
            </div>
          ) : null
        }
      />

      {/* تب‌های خزانه‌داری */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={`btn ${mainTab === 'cash' ? 'primary' : ''}`}
          onClick={() => setMainTab('cash')}
        >
          <Icon name="dollar" size={16} /> اسناد نقدی و واریزی ({n(allPayments.length)})
        </button>
        <button
          className={`btn ${mainTab === 'cheques' ? 'primary' : ''}`}
          onClick={() => setMainTab('cheques')}
        >
          <Icon name="card" size={16} /> چک‌های صیادی ({n(cheques.length)})
        </button>
        <button
          className={`btn ${mainTab === 'raas' ? 'primary' : ''}`}
          onClick={() => setMainTab('raas')}
        >
          <Icon name="calendar" size={16} /> راس‌گیری صیادی
        </button>
        <button
          className={`btn ${mainTab === 'reconciliation' ? 'primary' : ''}`}
          onClick={() => setMainTab('reconciliation')}
        >
          <Icon name="check" size={16} /> مغایرت‌گیری بانکی
        </button>
      </div>

      {/* --------------------------- ۱. اسناد نقدی --------------------------- */}
      {mainTab === 'cash' && (
        <>
          <div className="stats">
            <Stat icon="⬇️" label="جمع دریافت‌ها" value={short(totalIn)} unit="تومان" sub={`${n(allPayments.filter((p) => p.kind === 'in').length)} سند`} />
            <Stat icon="⬆️" label="جمع پرداخت‌ها" value={short(totalOut)} unit="تومان" sub={`${n(allPayments.filter((p) => p.kind === 'out').length)} سند`} />
            <Stat
              icon="💵"
              label="مانده نقدی"
              value={short(totalIn - totalOut)}
              unit="تومان"
              sub={totalIn - totalOut >= 0 ? 'تراز مثبت' : 'تراز منفی'}
              tone={totalIn - totalOut >= 0 ? 'green' : 'red'}
            />
            <Stat icon="🧾" label="تعداد اسناد" value={n(allPayments.length)} sub="کل دوره" />
          </div>

          <div className="mt-sm">
            <Chips
              items={[
                { value: 'all', label: 'همه اسناد' },
                { value: 'in', label: 'دریافت‌ها' },
                { value: 'out', label: 'پرداخت‌ها' },
              ]}
              active={cashFilter}
              onPick={(v) => setCashFilter(v as CashFilter)}
            />
          </div>

          <div className="card mt">
            <SectionHead title="فهرست اسناد نقدی" sub={`${n(cashList.length)} سند`} />
            {cashList.length ? (
              <div className="rows">
                {cashList.map((p) => {
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
      )}

      {/* --------------------------- ۲. چک‌های صیادی --------------------------- */}
      {mainTab === 'cheques' && (
        <div className="space-y-4">
          <div className="stats">
            <Stat
              icon="⏳"
              label="چک‌های دریافتی نزد صندوق"
              value={short(pendingInTotal)}
              unit="تومان"
              sub={`${n(pendingCheques.filter((c) => c.kind === 'in').length)} فقره چک`}
              tone="blue"
            />
            <Stat
              icon="📤"
              label="چک‌های پرداختی متعهد"
              value={short(pendingOutTotal)}
              unit="تومان"
              sub={`${n(pendingCheques.filter((c) => c.kind === 'out').length)} فقره چک`}
            />
            <Stat
              icon="✅"
              label="وصول‌شده کل"
              value={short(clearedTotal)}
              unit="تومان"
              sub={`${n(clearedCheques.length)} فقره وصولی`}
              tone="green"
            />
            <Stat
              icon="❌"
              label="چک‌های برگشتی"
              value={short(bouncedTotal)}
              unit="تومان"
              sub={`${n(bouncedCheques.length)} فقره واخواست`}
              tone={bouncedCheques.length ? 'red' : undefined}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chips
              items={[
                { value: 'all', label: `همه چک‌ها (${cheques.length})` },
                { value: 'pending', label: `نزد صندوق (${pendingCheques.length})` },
                { value: 'in', label: 'چک‌های دریافتی' },
                { value: 'out', label: 'چک‌های پرداختی' },
                { value: 'cleared', label: `وصول‌شده (${clearedCheques.length})` },
                { value: 'passed_on', label: `خرج‌شده (${passedCheques.length})` },
                { value: 'bounced', label: `برگشتی (${bouncedCheques.length})` },
              ]}
              active={chequeFilter}
              onPick={(v) => setChequeFilter(v as ChequeFilter)}
            />
          </div>

          {filteredCheques.length === 0 ? (
            <Empty
              title="چکی در این دسته‌بندی یافت نشد"
              text="با استفاده از دکمه‌های بالای صفحه می‌توانید چک جدید ثبت کنید."
              action={
                <button
                  className="btn primary sm"
                  onClick={() => ui.open(<ChequeForm onClose={ui.close} />)}
                >
                  <Icon name="plus" size={14} /> ثبت چک صیادی جدید
                </button>
              }
            />
          ) : (
            <div className="grid grid-1 sm:grid-2" style={{ gap: 12 }}>
              {filteredCheques.map((chq) => {
                const sInfo = CHEQUE_STATUS_INFO[chq.status] || CHEQUE_STATUS_INFO.pending;
                const daysToDue = diff(today(), chq.dueDate);

                return (
                  <div
                    key={chq.id}
                    className="card p-4 space-y-3"
                    style={{
                      border: '1px solid var(--border)',
                      borderRight: chq.kind === 'in' ? '4px solid #10B981' : '4px solid #EF4444',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 18 }}>{chq.kind === 'in' ? '📥' : '📤'}</span>
                          <span className="font-bold text-accent">{money(chq.amount)} تومان</span>
                          <span className={`badge ${sInfo.badgeClass}`}>
                            {sInfo.icon} {sInfo.label}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
                          کد سند: {chq.code} | {chq.bankName} {chq.branchName ? `(${chq.branchName})` : ''}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn sm"
                          onClick={() => setActiveChequeAction(chq)}
                          title="تغییر وضعیت چک"
                        >
                          عملیات
                        </button>
                        <button
                          className="icon-btn sm"
                          onClick={() => ui.open(<ChequeForm cheque={chq} onClose={ui.close} />)}
                          title="ویرایش چک"
                        >
                          <Icon name="edit" size={14} />
                        </button>
                      </div>
                    </div>

                    {/* کادر شناسه صیاد */}
                    <div
                      style={{
                        background: 'var(--surface-sunken)',
                        borderRadius: 6,
                        padding: '6px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>شناسه ۱۶ رقمی صیاد:</span>
                      <span className="font-mono font-bold tracking-wider" style={{ letterSpacing: 1.5 }}>
                        {chq.sayadNo.replace(/(\d{4})/g, '$1 ').trim()}
                      </span>
                    </div>

                    <div className="grid grid-2" style={{ fontSize: '0.82rem', gap: 6 }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {chq.kind === 'in' ? 'واگذارکننده:' : 'گیرنده چک:'}
                        </span>{' '}
                        <b>{chq.personName || '—'}</b>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>سررسید:</span>{' '}
                        <b className="font-mono">{chq.dueDate}</b>{' '}
                        {chq.status === 'pending' && (
                          <span style={{ color: daysToDue < 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.75rem' }}>
                            ({daysToDue < 0 ? `${Math.abs(daysToDue)} روز گذشته` : `${daysToDue} روز مانده`})
                          </span>
                        )}
                      </div>
                    </div>

                    {chq.status === 'cleared' && chq.clearDate && (
                      <div style={{ fontSize: '0.8rem', color: '#166534', background: '#F0FDF4', padding: '4px 8px', borderRadius: 4 }}>
                        ✓ وصول‌شده در تاریخ: {chq.clearDate}
                      </div>
                    )}
                    {chq.status === 'passed_on' && chq.passedToPersonName && (
                      <div style={{ fontSize: '0.8rem', color: '#854D0E', background: '#FEFCE8', padding: '4px 8px', borderRadius: 4 }}>
                        🔄 واگذارشده به: {chq.passedToPersonName} ({chq.passedDate})
                      </div>
                    )}
                    {chq.status === 'bounced' && chq.bounceReason && (
                      <div style={{ fontSize: '0.8rem', color: '#991B1B', background: '#FEF2F2', padding: '4px 8px', borderRadius: 4 }}>
                        ❌ برگشت‌خورده: {chq.bounceReason}
                      </div>
                    )}

                    {chq.notes && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                        یادداشت: {chq.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------- ۳. ماشین‌حساب راس‌گیری صیادی --------------------------- */}
      {mainTab === 'raas' && (
        <div className="space-y-4">
          {/* کارت نتایج محاسبه راس */}
          <div className="stats">
            <Stat
              icon="📅"
              label="تاریخ موثر سررسید (راس چک‌ها)"
              value={raasResult.effectiveDueDate}
              sub={`بر مبنای تاریخ ${raasBaseDate}`}
              tone="accent"
            />
            <Stat
              icon="⏱️"
              label="فاصله زمانی راس"
              value={`${raasResult.averageDays} روز`}
              sub="میانگین موزون اعتباری"
              tone="blue"
            />
            <Stat
              icon="💰"
              label="مجموع مبالغ محاسباتی"
              value={short(raasResult.totalAmount)}
              unit="تومان"
              sub={`${n(raasItemsToCalculate.length)} فقره چک / قسط`}
            />
          </div>

          <div className="card p-4 space-y-4" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="font-bold">تاریخ مبدا راس‌گیری (تاریخ فاکتور یا معامله):</span>
                <input
                  className="input text-center font-mono"
                  style={{ width: 140 }}
                  value={raasBaseDate}
                  onChange={(e) => setRaasBaseDate(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn sm btn-outline"
                onClick={() => {
                  const allSelected: Record<string, boolean> = {};
                  cheques.forEach((c) => (allSelected[c.id] = true));
                  setSelectedChequeIds(allSelected);
                }}
              >
                انتخاب همه چک‌های نزد صندوق
              </button>
            </div>

            {/* بخش انتخاب از چک‌های سیستم */}
            {cheques.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-sm block">۱. انتخاب از چک‌های صیادی ثبت‌شده در سیستم:</span>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table style={{ width: '100%', fontSize: '0.82rem', textAlign: 'right', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                      <tr>
                        <th style={{ padding: '6px 10px', width: 40 }}>انتخاب</th>
                        <th style={{ padding: '6px 10px' }}>کد و صیاد</th>
                        <th style={{ padding: '6px 10px' }}>بانک و طرف حساب</th>
                        <th style={{ padding: '6px 10px' }}>مبلغ (تومان)</th>
                        <th style={{ padding: '6px 10px' }}>سررسید</th>
                        <th style={{ padding: '6px 10px' }}>فاصله از مبدا</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cheques.map((c) => {
                        const isSel = !!selectedChequeIds[c.id];
                        const d = diff(raasBaseDate, c.dueDate);
                        return (
                          <tr
                            key={c.id}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              background: isSel ? 'var(--primary-subtle, rgba(59, 130, 246, 0.05))' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={(e) =>
                                  setSelectedChequeIds((prev) => ({ ...prev, [c.id]: e.target.checked }))
                                }
                              />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <b>{c.code}</b> ({c.sayadNo.slice(-6)})
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              {c.bankName} — {c.personName || '—'}
                            </td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                              {money(c.amount)}
                            </td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{c.dueDate}</td>
                            <td style={{ padding: '6px 10px', color: d < 0 ? 'var(--danger)' : 'inherit' }}>
                              {d} روز
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* بخش ورود دستی اقلام راس‌گیری */}
            <div className="space-y-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-bold text-sm">۲. افزودن چک یا اقساط دلخواه جهت راس‌گیری فرضی:</span>
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() =>
                    setCustomRaasRows((prev) => [
                      ...prev,
                      { id: String(Date.now()), amount: '', dueDate: today() },
                    ])
                  }
                >
                  <Icon name="plus" size={12} /> سطر جدید
                </button>
              </div>

              <div className="space-y-2">
                {customRaasRows.map((row, idx) => (
                  <div key={row.id} className="flex gap-2 items-center">
                    <span className="text-xs text-muted w-6">{idx + 1}.</span>
                    <input
                      type="number"
                      placeholder="مبلغ (تومان)"
                      className="input input-sm font-mono flex-1"
                      value={row.amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomRaasRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, amount: val } : r)),
                        );
                      }}
                    />
                    <input
                      placeholder="تاریخ سررسید"
                      className="input input-sm text-center font-mono w-32"
                      value={row.dueDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomRaasRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, dueDate: val } : r)),
                        );
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost text-danger"
                      onClick={() =>
                        setCustomRaasRows((prev) => prev.filter((r) => r.id !== row.id))
                      }
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------- ۴. مغایرت‌گیری بانکی --------------------------- */}
      {mainTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="font-bold">انتخاب حساب بانکی جهت تطبیق:</span>
                <select
                  className="select"
                  style={{ width: 220 }}
                  value={reconcileAccountId}
                  onChange={(e) => setReconcileAccountId(e.target.value)}
                >
                  {bankAccounts.map((a: Account) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.kind})
                    </option>
                  ))}
                </select>
              </div>

              <Chips
                items={[
                  { value: 'all', label: 'همه اقلام' },
                  { value: 'open', label: 'اقلام باز (تطبیق‌نیافته)' },
                  { value: 'reconciled', label: 'تطبیق‌یافته' },
                ]}
                active={reconFilter}
                onPick={(v) => setReconFilter(v as any)}
              />
            </div>
          </div>

          {/* خلاصه مغایرت */}
          <div className="stats">
            <Stat
              icon="🏦"
              label="حساب منتخب"
              value={selectedAccount?.name || '—'}
              sub={selectedAccount?.kind || ''}
            />
            <Stat
              icon="✅"
              label="اقلام تطبیق‌یافته"
              value={n(
                accountPaymentItems.filter((p) => p.reconciled).length +
                  accountChequeItems.filter((c) => c.reconciled).length,
              )}
              sub="مورد تایید صورتحساب بانک"
              tone="green"
            />
            <Stat
              icon="⏳"
              label="اقلام باز (در راه)"
              value={n(
                accountPaymentItems.filter((p) => !p.reconciled).length +
                  accountChequeItems.filter((c) => !c.reconciled).length,
              )}
              sub="نیاز به بررسی صورتحساب"
              tone="warn"
            />
          </div>

          {/* جدول تطبیق تراکنش‌ها */}
          <div className="card" style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
            <SectionHead
              title="گردش‌های ثبت‌شده در سیستم برای تطبیق با پرینت بانکی"
              sub="با علامت‌زدن تیک هر تراکنش، وضعیت آن به «تطبیق‌یافته» تغییر می‌کند."
            />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.84rem', textAlign: 'right', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', width: 50, textAlign: 'center' }}>تطبیق</th>
                    <th style={{ padding: '8px 12px' }}>تاریخ</th>
                    <th style={{ padding: '8px 12px' }}>کد سند / مرجع</th>
                    <th style={{ padding: '8px 12px' }}>شرح / طرف حساب</th>
                    <th style={{ padding: '8px 12px' }}>مبلغ واریز (+)</th>
                    <th style={{ padding: '8px 12px' }}>مبلغ برداشت (−)</th>
                    <th style={{ padding: '8px 12px' }}>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {accountPaymentItems
                    .filter((p) => {
                      if (reconFilter === 'open') return !p.reconciled;
                      if (reconFilter === 'reconciled') return p.reconciled;
                      return true;
                    })
                    .map((p) => {
                      const who = p.personId ? personName(s, p.personId) : accountLabel(p);
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={!!p.reconciled}
                              onChange={(e) => actions.reconcilePayment(p.id, e.target.checked)}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{p.date}</td>
                          <td style={{ padding: '8px 12px' }}>{p.code}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {p.kind === 'in' ? 'دریافت از' : 'پرداخت به'} {who}
                            {p.note ? ` (${p.note})` : ''}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#166534' }}>
                            {p.kind === 'in' ? money(p.amount) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#991B1B' }}>
                            {p.kind === 'out' ? money(p.amount) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className={`badge ${p.reconciled ? 'green' : 'warn'}`}>
                              {p.reconciled ? '✓ تطبیق شد' : 'در انتظار تطبیق'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  {accountChequeItems
                    .filter((c) => {
                      if (reconFilter === 'open') return !c.reconciled;
                      if (reconFilter === 'reconciled') return c.reconciled;
                      return true;
                    })
                    .map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!c.reconciled}
                            onChange={(e) => actions.reconcileCheque(c.id, e.target.checked)}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                          {c.clearDate || c.dueDate}
                        </td>
                        <td style={{ padding: '8px 12px' }}>چک {c.code}</td>
                        <td style={{ padding: '8px 12px' }}>
                          چک صیاد {c.sayadNo} ({c.bankName} - {c.personName || '—'})
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#166534' }}>
                          {c.kind === 'in' && c.status === 'cleared' ? money(c.amount) : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#991B1B' }}>
                          {c.kind === 'out' && c.status === 'cleared' ? money(c.amount) : '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className={`badge ${c.reconciled ? 'green' : 'warn'}`}>
                            {c.reconciled ? '✓ تطبیق شد' : 'در انتظار تطبیق'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* مودال عملیات چک */}
      {activeChequeAction && (
        <ChequeActionModal
          cheque={activeChequeAction}
          onClose={() => setActiveChequeAction(null)}
        />
      )}
    </>
  );
}
