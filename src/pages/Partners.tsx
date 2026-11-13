/** شرکا، آورده‌ها، تسویه حساب، واحدهای مشارکت و معاملات دلالی */
import { useMemo, useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Avatar, Empty, PageHead, Row, SectionHead, Stat } from '../components/ui';
import {
  actions,
  flockSharePercents,
  flockStats,
  num,
  partnerById,
  settlement,
  suggestTransfers,
  useApp,
} from '../data/store';
import { format, today } from '../lib/jalali';
import { money, n, pct, short } from '../lib/format';
import {
  ContributionForm,
  DealForm,
  PartnerForm,
  PartnershipUnitForm,
  PARTNERSHIP_SCOPE_LABELS,
} from '../forms';
import type { PartnershipUnit, PartnershipUnitStatus } from '../data/types';

type MainTab = 'settle' | 'partners' | 'units';

const dealProfit = (d: { sellPrice: number; buyPrice: number; qty: number; commission: number }) =>
  (num(d.sellPrice) - num(d.buyPrice)) * num(d.qty) + num(d.commission);

export function Partners() {
  const s = useApp();
  const ui = useUI();
  const [mainTab, setMainTab] = useState<MainTab>('settle');
  // انتخاب چندگانه گله‌ها: خالی یعنی همه گله‌ها (کل مزرعه)
  const [selectedFlockIds, setSelectedFlockIds] = useState<string[]>([]);

  const filter = useMemo(() => {
    if (selectedFlockIds.length === 0) return {};
    if (selectedFlockIds.length === 1) return { flockId: selectedFlockIds[0] };
    return { flockIds: selectedFlockIds };
  }, [selectedFlockIds]);

  const settle = settlement(s, filter);

  // محاسبات سرجمع گله‌های انتخابی
  const totalRevenue = settle.rows.reduce((sum, r) => sum + r.shareRevenue, 0);
  const totalExpense = settle.rows.reduce((sum, r) => sum + r.shareExpenseTotal, 0);
  const totalProfit = totalRevenue - totalExpense;
  const totalCapital = settle.rows.reduce((a, r) => a + r.capital, 0);
  const totalPaidDirect = settle.rows.reduce((a, r) => a + r.paidDirect + r.paidOut, 0);
  const totalReceived = settle.rows.reduce((a, r) => a + r.received, 0);
  const totalBalance = settle.rows.reduce((a, r) => a + r.balance, 0);

  // تفکیک مالی تک‌تک گله‌های فارم
  const perFlockAnalysis = useMemo(() => {
    return s.flocks.map((f) => {
      const fSettle = settlement(s, { flockId: f.id });
      const fShares = flockSharePercents(s, f.id);
      const fStats = flockStats(s, f.id);
      const fRev = fSettle.rows.reduce((sum, r) => sum + r.shareRevenue, 0);
      const fExp = fSettle.rows.reduce((sum, r) => sum + r.shareExpenseTotal, 0);
      const fProf = fRev - fExp;
      return {
        flock: f,
        settle: fSettle,
        shares: fShares,
        stats: fStats,
        revenue: fRev,
        expense: fExp,
        profit: fProf,
      };
    });
  }, [s]);

  const deals = s.deals.slice().sort((a, b) => b.date.localeCompare(a.date));
  const transfers = suggestTransfers(settle.rows, settle.surplus);

  // واحدهای مشارکت
  const units = s.partnershipUnits || [];
  const activeUnits = units.filter((u) => u.status === 'active');
  const totalCommittedCapital = units.reduce(
    (sum, u) => sum + (u.shares || []).reduce((acc, row) => acc + num(row.initialCapital), 0),
    0,
  );

  const autoCreateUnitsFromFlocks = () => {
    let count = 0;
    s.flocks.forEach((f) => {
      const exists = units.some((u) => u.targetId === f.id && u.scope === 'flock');
      if (!exists && f.shares && f.shares.length > 0) {
        actions.add('partnershipUnits', {
          code: `PU-${f.code || f.id}`,
          title: `قرارداد مشارکت ${f.name}`,
          scope: 'flock',
          targetId: f.id,
          startDate: f.startDate || today(),
          endDate: f.endDate || undefined,
          shareMode: f.shareMode || 'percent',
          shares: f.shares.map((sh) => ({
            partnerId: sh.partnerId,
            percent: num(sh.percent),
            units: num(sh.units) || 1,
            initialCapital: 0,
          })),
          status: f.status === 'closed' ? 'settled' : 'active',
          notes: f.notes || `قرارداد مشارکت ایجادشده از اطلاعات گله ${f.name}`,
        });
        count++;
      }
    });
    if (count > 0) {
      ui.toast(`${count} قرارداد مشارکت بر اساس گله‌های موجود با موفقیت ایجاد گردید`);
    } else {
      ui.toast('تمام گله‌ها قبلاً دارای قرارداد مشارکت ثبت‌شده هستند یا فاقد سهم شرکا می‌باشند');
    }
  };

  const openUnitMenu = (unit: PartnershipUnit) =>
    ui.sheet({
      title: `عملیات قرارداد ${unit.title}`,
      items: [
        { act: 'edit', label: 'ویرایش مشخصات قرارداد', icon: '✏️' },
        { act: 'toggle_settle', label: unit.status === 'settled' ? 'بازگشت به وضعیت در جریان' : 'تسویه نهایی قرارداد', icon: '✔️' },
        { act: 'del', label: 'حذف قرارداد', icon: '🗑️' },
      ],
      onPick: async (act) => {
        if (act === 'edit') {
          ui.open(<PartnershipUnitForm id={unit.id} onClose={ui.close} />);
        }
        if (act === 'toggle_settle') {
          const nextStatus: PartnershipUnitStatus = unit.status === 'settled' ? 'active' : 'settled';
          actions.update('partnershipUnits', unit.id, { status: nextStatus });
          ui.toast(`وضعیت قرارداد به ${nextStatus === 'settled' ? 'تسویه‌شده' : 'در جریان'} تغییر یافت`);
        }
        if (act === 'del') {
          const ok = await ui.confirm(`قرارداد «${unit.title}» حذف شود؟`, {
            danger: true,
            ok: 'حذف قرارداد',
          });
          if (!ok) return;
          actions.remove('partnershipUnits', unit.id);
          ui.toast('قرارداد مشارکت حذف شد');
        }
      },
    });

  return (
    <>
      <PageHead
        title={
          mainTab === 'settle'
            ? 'شرکا و تسویه حساب'
            : mainTab === 'partners'
            ? 'مدیریت شرکا و آورده‌ها'
            : 'قراردادها و واحدهای مشارکت مستقل'
        }
        sub={
          mainTab === 'settle'
            ? 'مدیریت سهام، آورده‌ها و تقسیم سود و زیان بین شرکا با امکان تفکیک به ازای هر گله'
            : mainTab === 'partners'
            ? 'مشخصات شرکا، آورده‌های نقدی/غیرنقدی و معاملات دلالی اختصاصی'
            : 'تفکیک حقوقی و مالی قراردادهای پرورش، سالن‌ها و بازرگانی آزاد'
        }
        actions={
          mainTab === 'units' ? (
            <button className="btn primary" onClick={() => ui.open(<PartnershipUnitForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> ثبت قرارداد مشارکت
            </button>
          ) : (
            <>
              <button className="btn" onClick={() => ui.open(<ContributionForm onClose={ui.close} />)}>
                <Icon name="money" size={16} /> ثبت آورده
              </button>
              <button className="btn primary" onClick={() => ui.open(<PartnerForm onClose={ui.close} />)}>
                <Icon name="users" size={16} /> شریک جدید
              </button>
            </>
          )
        }
      />

      {/* تب‌های بالای صفحه */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${mainTab === 'settle' ? 'primary' : ''}`}
          onClick={() => setMainTab('settle')}
        >
          <Icon name="scale" size={16} /> تسویه و مانده حساب
        </button>
        <button
          className={`btn ${mainTab === 'partners' ? 'primary' : ''}`}
          onClick={() => setMainTab('partners')}
        >
          <Icon name="users" size={16} /> شرکا و آورده‌ها ({n(s.partners.length)})
        </button>
        <button
          className={`btn ${mainTab === 'units' ? 'primary' : ''}`}
          onClick={() => setMainTab('units')}
        >
          <Icon name="file" size={16} /> واحدهای مشارکت و قراردادها ({n(units.length)})
        </button>
      </div>

      {mainTab === 'settle' && (
        <>
          {/* کارت‌های آماری سرجمع گله‌های انتخابی */}
          <div className="stats">
            <Stat
              icon="💰"
              label="کل درآمد گله‌های انتخابی"
              value={short(totalRevenue)}
              unit="تومان"
              sub="فروش زنده، گوشت، کود و معاملات"
              tone="green"
            />
            <Stat
              icon="💸"
              label="کل هزینه‌های دوره"
              value={short(totalExpense)}
              unit="تومان"
              sub="دان، جوجه، دارو، انرژی و کشتار"
              tone="red"
            />
            <Stat
              icon="📈"
              label="سود / زیان خالص دوره"
              value={short(totalProfit)}
              unit="تومان"
              sub={totalProfit >= 0 ? 'سودآوری خالص' : 'زیان دوره'}
              tone={totalProfit >= 0 ? 'green' : 'red'}
            />
            <Stat
              icon="🏦"
              label="مجموع آورده نقدی شرکا"
              value={short(totalCapital)}
              unit="تومان"
              sub={`${n(settle.rows.length)} شریک`}
            />
          </div>

          {/* نوار انتخاب چندگانه گله‌ها */}
          <div className="card mt" style={{ padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>🎯 فیلتر گله مبنای تسویه:</span>
                <span className="badge purple" style={{ fontSize: 12, padding: '4px 10px' }}>
                  {selectedFlockIds.length === 0
                    ? '🌍 کل مزرعه (همه گله‌ها)'
                    : selectedFlockIds.length === 1
                    ? `🎯 گله ${s.flocks.find((f) => f.id === selectedFlockIds[0])?.name}`
                    : `📊 تجمیعی ${selectedFlockIds.length} گله (${selectedFlockIds.map((id) => s.flocks.find((f) => f.id === id)?.name).join(' + ')})`}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {selectedFlockIds.length === 1
                  ? 'نمایش حسابداری کاملاً تفکیک‌شده و مجزای این گله'
                  : 'امکان انتخاب یک یا چند گله به صورت همزمان (کلیک برای فعال/غیرفعال کردن)'}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className={`btn sm ${selectedFlockIds.length === 0 ? 'primary' : ''}`}
                onClick={() => setSelectedFlockIds([])}
                style={{ borderRadius: 20 }}
              >
                🌐 همه گله‌ها (کل مزرعه)
              </button>
              {s.flocks.map((f) => {
                const isSelected = selectedFlockIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`btn sm ${isSelected ? 'primary' : ''}`}
                    style={{
                      borderRadius: 20,
                      border: isSelected ? 'none' : '1px solid var(--border)',
                      background: isSelected ? undefined : '#FFF',
                    }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFlockIds((prev) => prev.filter((id) => id !== f.id));
                      } else {
                        setSelectedFlockIds((prev) => [...prev, f.id]);
                      }
                    }}
                  >
                    {isSelected ? '✓ ' : ''}🦃 {f.name} {f.status === 'closed' ? '(بسته)' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* جدول اصلی صورت تسویه و سود/زیان شرکا */}
          <div className="card">
            <SectionHead
              title={
                selectedFlockIds.length === 1
                  ? `صورت تسویه و سود/زیان تفکیکی ${s.flocks.find((f) => f.id === selectedFlockIds[0])?.name}`
                  : selectedFlockIds.length > 1
                  ? `صورت تجمیعی تسویه و سود/زیان ${selectedFlockIds.length} گله انتخابی`
                  : 'صورت تجمیعی تسویه و سود/زیان شرکا در کل مزرعه'
              }
              sub={`${n(settle.rows.length)} شریک — بر مبنای درصد دقیق سهام هر گله`}
            />
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>شریک</th>
                    <th>درصد سهم</th>
                    <th>سهم از درآمد (فروش)</th>
                    <th>سهم از کل هزینه</th>
                    <th>سود / زیان سهم شریک</th>
                    <th>آورده نقدی</th>
                    <th>پرداخت مستقیم</th>
                    <th>برداشتی / دریافتی</th>
                    <th>مانده نهایی تسویه</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {settle.rows.map((r) => {
                    const pos = r.balance >= 0;
                    const profitPos = r.shareProfit >= 0;
                    return (
                      <tr key={r.id}>
                        <td>
                          <b>{r.name}</b>
                        </td>
                        <td>
                          <b style={{ color: 'var(--primary, #6D28D9)' }}>{pct(r.share, 2)}</b>
                        </td>
                        <td className="num-cell" style={{ color: '#059669', fontWeight: 600 }}>
                          {money(r.shareRevenue)}
                        </td>
                        <td className="num-cell" style={{ color: '#DC2626' }}>
                          {money(r.shareExpenseTotal)}
                        </td>
                        <td
                          className="num-cell"
                          style={{
                            color: profitPos ? '#059669' : '#DC2626',
                            fontWeight: 700,
                          }}
                        >
                          {money(r.shareProfit)}
                        </td>
                        <td className="num-cell">{money(r.capital)}</td>
                        <td className="num-cell">{money(r.paidDirect + r.paidOut)}</td>
                        <td className="num-cell">{money(r.received)}</td>
                        <td className="num-cell" style={{ color: pos ? '#059669' : '#DC2626', fontWeight: 700 }}>
                          {money(r.balance)}
                        </td>
                        <td>
                          <span className={'badge ' + (pos ? 'green' : 'red')}>
                            {pos ? 'طلبکار' : 'بدهکار'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: 'var(--surface-sunken)', fontWeight: 700 }}>
                    <td>
                      <b>جمع کل:</b>
                    </td>
                    <td>100%</td>
                    <td className="num-cell" style={{ color: '#059669' }}>
                      {money(totalRevenue)}
                    </td>
                    <td className="num-cell" style={{ color: '#DC2626' }}>
                      {money(totalExpense)}
                    </td>
                    <td
                      className="num-cell"
                      style={{ color: totalProfit >= 0 ? '#059669' : '#DC2626' }}
                    >
                      {money(totalProfit)}
                    </td>
                    <td className="num-cell">{money(totalCapital)}</td>
                    <td className="num-cell">{money(totalPaidDirect)}</td>
                    <td className="num-cell">{money(totalReceived)}</td>
                    <td
                      className="num-cell"
                      style={{ color: totalBalance >= 0 ? '#059669' : '#DC2626' }}
                    >
                      {money(totalBalance)}
                    </td>
                    <td>
                      <span className="badge gray">موازنه دوره</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="hint" style={{ marginTop: 8, lineHeight: 1.9 }}>
              💡 <b>فرمول محاسبه دقیق حسابداری:</b> سود سهم هر شریک = (سهم از کل درآمد گله) − (سهم از کل هزینه گله).
              <br />
              مانده نهایی تسویه = سود سهم شریک + آورده‌های نقدی + پرداخت‌های مستقیم از جیب − دریافتی‌ها و برداشت‌ها. عدد سبز یعنی شریک بستانکار است و باید دریافت کند، عدد قرمز یعنی بدهکار است و باید به صندوق واریز کند.
            </div>
          </div>

          {/* تفکیک حساب‌های مالی به تفکیک گله‌ها (گزارش بدون تداخل) */}
          <div className="card mt">
            <SectionHead
              title="ماتریس تفکیک سود و زیان و سهم شرکا به تفکیک هر گله"
              sub="محاسبه مجزا و مستقل حساب‌های هر گله بدون تداخل با سایر گله‌ها"
            />
            <div className="grid grid-1 sm:grid-2" style={{ gap: 14 }}>
              {perFlockAnalysis
                .filter((pfa) => selectedFlockIds.length === 0 || selectedFlockIds.includes(pfa.flock.id))
                .map((pfa) => {
                  return (
                    <div
                      key={pfa.flock.id}
                      className="card p-3 space-y-3"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface-sunken)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 18 }}>🦃</span>
                            <h4 style={{ margin: 0 }}>{pfa.flock.name}</h4>
                            <span className={`badge ${pfa.flock.status === 'closed' ? 'gray' : 'green'}`}>
                              {pfa.flock.status === 'closed' ? 'پایان دوره' : 'در حال پرورش'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            سالن: {pfa.flock.hall || 'نامشخص'} | ورود: {pfa.flock.startDate}
                          </span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                            سود خالص گله:
                          </span>
                          <span
                            className="font-mono font-bold"
                            style={{ color: pfa.profit >= 0 ? '#166534' : '#991B1B' }}
                          >
                            {money(pfa.profit)} تومان
                          </span>
                        </div>
                      </div>

                      {/* خلاصه درآمد و هزینه گله */}
                      <div className="grid grid-2" style={{ fontSize: '0.8rem', gap: 6, background: '#FFF', padding: '6px 10px', borderRadius: 6 }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>درآمد گله:</span>{' '}
                          <b style={{ color: '#166534' }}>{money(pfa.revenue)}</b>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>هزینه گله:</span>{' '}
                          <b style={{ color: '#991B1B' }}>{money(pfa.expense)}</b>
                        </div>
                      </div>

                      {/* جدول سهم هر شریک در این گله اختصاصی */}
                      <table style={{ width: '100%', fontSize: '0.78rem', textAlign: 'right', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '4px 6px' }}>شریک</th>
                            <th style={{ padding: '4px 6px' }}>درصد سهم</th>
                            <th style={{ padding: '4px 6px' }}>سهم از درآمد</th>
                            <th style={{ padding: '4px 6px' }}>سهم از هزینه</th>
                            <th style={{ padding: '4px 6px' }}>سود سهم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pfa.settle.rows.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '4px 6px' }}>{row.name}</td>
                              <td style={{ padding: '4px 6px', fontWeight: 600, color: 'var(--primary)' }}>
                                {pct(pfa.shares[row.id] ?? row.share, 1)}
                              </td>
                              <td style={{ padding: '4px 6px', color: '#166534' }}>{money(row.shareRevenue)}</td>
                              <td style={{ padding: '4px 6px', color: '#991B1B' }}>{money(row.shareExpenseTotal)}</td>
                              <td
                                style={{
                                  padding: '4px 6px',
                                  fontWeight: 700,
                                  color: row.shareProfit >= 0 ? '#166534' : '#991B1B',
                                }}
                              >
                                {money(row.shareProfit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
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
            <button className="btn sm block mt-sm no-print" onClick={() => window.print()}>
              <Icon name="print" size={15} /> چاپ صورت‌حساب شرکا
            </button>
          </div>
        </>
      )}

      {mainTab === 'partners' && (
        <>
          <div className="card">
            <SectionHead
              title="لیست شرکای مزرعه"
              sub={`${n(s.partners.length)} شریک`}
              action={
                <button className="btn sm primary" onClick={() => ui.open(<PartnerForm onClose={ui.close} />)}>
                  <Icon name="plus" size={14} /> شریک جدید
                </button>
              }
            />
            <div className="grid grid-3" style={{ gap: 12 }}>
              {s.partners.map((p) => (
                <div className="card" key={p.id} style={{ border: `1px solid ${p.color}40`, margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Avatar name={p.name} color={p.color} size={38} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15 }}>{p.name}</h4>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{p.role || 'شریک'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>درصد سهام پیش‌فرض:</span>
                      <b style={{ color: p.color }}>{pct(p.share, 1)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>شماره تماس:</span>
                      <span>{p.phone || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>تاریخ عضویت:</span>
                      <span>{p.joined ? format(p.joined, 'short') : '—'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button className="btn sm" onClick={() => ui.open(<PartnerForm id={p.id} onClose={ui.close} />)}>
                      <Icon name="pencil" size={13} /> ویرایش
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
      )}

      {mainTab === 'units' && (
        <div>
          {/* کارت‌های خلاصه آماری قراردادهای مشارکت */}
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <Stat label="کل واحدهای مشارکت" value={n(units.length)} sub="قرارداد مستقل" />
            <Stat label="قراردادهای در جریان" value={n(activeUnits.length)} sub="فعال و در گردش" />
            <Stat label="کل سرمایه متعهد شده" value={short(totalCommittedCapital)} unit="تومان" />
            <Stat
              label="واحدهای تسویه‌شده"
              value={n(units.filter((u) => u.status === 'settled').length)}
              sub="تسویه نهایی موفق"
            />
          </div>

          {units.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>📜</div>
              <h3>هنوز قرارداد یا واحد مشارکتی تعریف نشده است</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
                برای استقلال کامل حسابداری هر گله، سالن، یا معامله تجاری آزاد از سایر بخش‌ها،
                می‌توانید واحدهای مشارکت را تعریف کرده یا به‌طور خودکار از گله‌های فعلی ایجاد نمایید.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button className="btn primary" onClick={() => ui.open(<PartnershipUnitForm onClose={ui.close} />)}>
                  <Icon name="plus" size={16} /> ثبت اولین قرارداد مشارکت
                </button>
                <button className="btn" onClick={autoCreateUnitsFromFlocks}>
                  ایجاد خودکار قرارداد از گله‌های موجود
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-2">
              {units.map((unit) => {
                const scopeInfo = PARTNERSHIP_SCOPE_LABELS[unit.scope] || { label: unit.scope, icon: '💼' };
                const totalUnitShares = (unit.shares || []).reduce(
                  (acc, row) => acc + (unit.shareMode === 'percent' ? num(row.percent) : num(row.units)),
                  0,
                );

                // پیدا کردن موضوع منتسب
                let targetLabel = '';
                if (unit.scope === 'flock') {
                  const targetFlock = s.flocks.find((f) => f.id === unit.targetId);
                  targetLabel = targetFlock ? `گله: ${targetFlock.name}` : '';
                } else if (unit.scope === 'hall') {
                  const targetHall = s.halls.find((h) => h.id === unit.targetId);
                  targetLabel = targetHall ? `سالن: ${targetHall.name}` : '';
                }

                return (
                  <div className="card" key={unit.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 22 }}>{scopeInfo.icon}</span>
                          <h3 style={{ margin: 0, fontSize: 16 }}>{unit.title}</h3>
                          <span className="badge gray" style={{ fontSize: '0.8rem' }}>
                            {unit.code}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {scopeInfo.label} {targetLabel ? ` · ${targetLabel}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${unit.status === 'active' ? 'green' : unit.status === 'settled' ? 'blue' : 'gray'}`}>
                          {unit.status === 'active' ? 'در جریان' : unit.status === 'settled' ? 'تسویه شده' : 'مختومه'}
                        </span>
                        <button className="icon-btn sm" onClick={() => openUnitMenu(unit)}>
                          <Icon name="dots" size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', display: 'flex', gap: 16, marginBottom: 10, color: 'var(--text-muted)' }}>
                      <span>شروع: <b>{format(unit.startDate, 'short')}</b></span>
                      {unit.endDate && <span>پایان: <b>{format(unit.endDate, 'short')}</b></span>}
                      <span>نحوه تقسیم: <b>{unit.shareMode === 'percent' ? 'درصدی (٪)' : 'نسبتی / سهمی'}</b></span>
                    </div>

                    {/* جدول سهام‌داران قرارداد */}
                    <div style={{ background: 'var(--surface-sunken)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                        سهام‌داران این قرارداد:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(unit.shares || []).map((sh, idx) => {
                          const p = partnerById(s, sh.partnerId) || { name: 'شریک نامشخص', color: '#666' };
                          const shareDisplay = unit.shareMode === 'percent'
                            ? `${n(sh.percent)}٪`
                            : `${n(sh.units)} از ${n(totalUnitShares)} سهم (${totalUnitShares > 0 ? ((num(sh.units) / totalUnitShares) * 100).toFixed(1) : 0}٪)`;

                          return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Avatar name={p.name} color={p.color} size={22} />
                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 14 }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{shareDisplay}</span>
                                {sh.initialCapital > 0 && (
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    آورده: {money(sh.initialCapital)} تومان
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {unit.notes && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                        {unit.notes}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="btn sm" onClick={() => ui.open(<PartnershipUnitForm id={unit.id} onClose={ui.close} />)}>
                        <Icon name="pencil" size={13} /> ویرایش قرارداد
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
