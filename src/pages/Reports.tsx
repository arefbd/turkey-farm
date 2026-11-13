/** گزارش‌ها و تحلیل مالی و بهای تمام‌شده مزرعه */
import { useState, useMemo } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Bars } from '../components/Charts';
import { Bar, Chips, Empty, PageHead, SectionHead, Stat } from '../components/ui';
import {
  accountBalance,
  activeFlocks,
  byCategory,
  cashSeries,
  filterExpenses,
  flockStats,
  lotProfitSummary,
  monthlySeries,
  receivables,
  settlement,
  suggestTransfers,
  totals,
  useApp,
} from '../data/store';
import { format, pad, parse, today } from '../lib/jalali';
import { download, money, n, pct, short, toCsv } from '../lib/format';
import type { ExpenseFilter, FlockStats } from '../data/types';

type Period = 'all' | 'month' | '3m' | 'year';
type ReportTab = 'pnl' | 'balance_sheet' | 'cost_accounting' | 'flocks_matrix' | 'partners_settle';

export function Reports() {
  const s = useApp();
  const ui = useUI();
  const [reportTab, setReportTab] = useState<ReportTab>('pnl');
  const [period, setPeriod] = useState<Period>('all');
  const [selectedFlockIds, setSelectedFlockIds] = useState<string[]>([]);
  const [isMultiMode, setIsMultiMode] = useState<boolean>(false);

  const filter: ExpenseFilter = useMemo(() => {
    const f: ExpenseFilter = {};
    if (selectedFlockIds.length === 1) {
      f.flockId = selectedFlockIds[0];
    } else if (selectedFlockIds.length > 1) {
      f.flockIds = selectedFlockIds;
    }
    const t = parse(today());
    if (!t) return f;
    if (period === 'month') f.from = `${pad(t.jy)}/${pad(t.jm)}/01`;
    else if (period === '3m') {
      let m = t.jm - 3;
      let y = t.jy;
      while (m <= 0) {
        m += 12;
        y--;
      }
      f.from = `${pad(y)}/${pad(m)}/01`;
    } else if (period === 'year') {
      f.from = `${pad(t.jy)}/01/01`;
    }
    return f;
  }, [selectedFlockIds, period]);

  const t = totals(s, filter);
  const cats = byCategory(s, filter);
  const series = monthlySeries(s, 6, filter);
  const cash = cashSeries(s, 6, filter);
  const rec = receivables(s, filter);
  const settle = settlement(s, filter);

  const selectedFlock = selectedFlockIds.length === 1 ? s.flocks.find((f) => f.id === selectedFlockIds[0]) : null;
  const active = selectedFlock || activeFlocks(s)[0];
  const fs: FlockStats | null = active ? flockStats(s, active.id) : null;

  const periodLabel = { all: 'کل دوره', month: 'ماه جاری', '3m': '۳ ماه اخیر', year: 'سال جاری' }[
    period
  ];

  const flockFilterLabel =
    selectedFlockIds.length === 0
      ? 'کل مزرعه (همه گله‌ها)'
      : selectedFlockIds.length === 1
      ? `گله ${selectedFlock?.name || ''}`
      : `مجموع ${selectedFlockIds.length} گله انتخابی`;

  /* ------------------- محاسبات ترازنامه تلفیقی ------------------- */
  const balanceSheet = useMemo(() => {
    // ۱. دارایی‌های جاری
    const cashAndBanks = s.accounts.reduce((sum, a) => sum + (accountBalance(s, a.id) || 0), 0);
    const receivableCheques = (s.cheques || [])
      .filter((c) => c.kind === 'in' && (!c.status || c.status === 'pending'))
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const tradeReceivables = rec.receivable;
    const inventoryGoods = s.inventory.reduce((sum, i) => sum + (Number(i.qty) * (Number(i.pricePerKg) || 0)), 0);
    const frozenMeat = (s.tradeLots || []).reduce((sum, l) => {
      const prof = lotProfitSummary(l);
      return sum + (prof.remainingKg * prof.effectiveCostPerKg);
    }, 0);
    const biologicalAssets = s.flocks
      .filter((f) => f.status !== 'closed')
      .reduce((sum, f) => {
        const st = flockStats(s, f.id);
        return sum + (st ? st.expenses : 0);
      }, 0);

    const totalCurrentAssets =
      cashAndBanks + receivableCheques + tradeReceivables + inventoryGoods + frozenMeat + biologicalAssets;

    // ۲. دارایی‌های غیرجاری / ثابت
    const fixedAssets = s.expenses
      .filter((e) => e.category === 'equip' || e.category === 'tasisat' || e.category === 'capital')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalAssets = totalCurrentAssets + fixedAssets;

    // ۳. بدهی‌های جاری
    const tradePayables = rec.payable;
    const payableCheques = (s.cheques || [])
      .filter((c) => c.kind === 'out' && (!c.status || c.status === 'pending'))
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalLiabilities = tradePayables + payableCheques;

    // ۴. حقوق صاحبان سرمایه
    const contributions = (s.contributions || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalEquity = Math.max(0, totalAssets - totalLiabilities);
    const retainedEarnings = totalEquity - contributions;

    return {
      cashAndBanks,
      receivableCheques,
      tradeReceivables,
      inventoryGoods,
      frozenMeat,
      biologicalAssets,
      totalCurrentAssets,
      fixedAssets,
      totalAssets,
      tradePayables,
      payableCheques,
      totalLiabilities,
      contributions,
      retainedEarnings,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    };
  }, [s, rec]);

  /* ------------------- محاسبات بهای تمام‌شده استاندارد ۲۶ ------------------- */
  const costAnalysis = useMemo(() => {
    const targetFlocks = selectedFlockIds.length
      ? s.flocks.filter((f) => selectedFlockIds.includes(f.id))
      : s.flocks;

    let totalBiomassProducedKg = 0;
    let totalLiveSoldKg = 0;
    let totalFlockCost = 0;

    targetFlocks.forEach((f) => {
      const st = flockStats(s, f.id);
      if (st) {
        totalBiomassProducedKg += st.biomass;
        totalLiveSoldKg += st.sold * (st.avgWeightG ? st.avgWeightG / 1000 : 10);
        totalFlockCost += st.expenses;
      }
    });

    const totalKg = Math.max(1, totalBiomassProducedKg + totalLiveSoldKg);
    const costPerKgLive = totalFlockCost > 0 ? totalFlockCost / totalKg : 0;

    // تفکیک سرفصل‌های هزینه
    const exps = filterExpenses(s, filter);
    const chickCost = exps.filter((e) => e.category === 'chick').reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const feedCost = exps.filter((e) => e.category === 'feed').reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const medCost = exps.filter((e) => e.category === 'med' || e.category === 'vaccine').reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const energyCost = exps.filter((e) => e.category === 'fuel' || e.category === 'energy').reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const laborCost = exps.filter((e) => e.category === 'salary' || e.category === 'labor').reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const otherCost = exps.filter((e) => !['chick', 'feed', 'med', 'vaccine', 'fuel', 'energy', 'salary', 'labor'].includes(e.category)).reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const totalExp = chickCost + feedCost + medCost + energyCost + laborCost + otherCost || 1;

    // بهای لاشه و قطعات به روش ارزش نسبی فروش
    const carcassYieldPct = 0.80; // ۸۰٪ راندمان استاندارد لاشه
    const baseCarcassCostPerKg = costPerKgLive > 0 ? costPerKgLive / carcassYieldPct : 110000;

    const cuts = [
      { name: 'سینه با استخوان', shareOfCarcass: 0.32, relativeValueRatio: 1.35 },
      { name: 'فیله خالص بدون استخوان', shareOfCarcass: 0.15, relativeValueRatio: 1.80 },
      { name: 'ران با پوست و استخوان', shareOfCarcass: 0.28, relativeValueRatio: 1.10 },
      { name: 'بال و بازو', shareOfCarcass: 0.08, relativeValueRatio: 0.65 },
      { name: 'گردن و اسکلت', shareOfCarcass: 0.11, relativeValueRatio: 0.30 },
      { name: 'آلایش (دل، جگر و سنگدان)', shareOfCarcass: 0.06, relativeValueRatio: 0.45 },
    ];

    const allocatedCuts = cuts.map((c) => {
      const cutCostPerKg = Math.round(baseCarcassCostPerKg * c.relativeValueRatio);
      return {
        ...c,
        cutCostPerKg,
      };
    });

    return {
      totalBiomassProducedKg,
      totalLiveSoldKg,
      totalFlockCost,
      costPerKgLive: Math.round(costPerKgLive),
      baseCarcassCostPerKg: Math.round(baseCarcassCostPerKg),
      chickCost,
      feedCost,
      medCost,
      energyCost,
      laborCost,
      otherCost,
      totalExp,
      allocatedCuts,
    };
  }, [s, selectedFlockIds, filter]);

  /* ------------------- دانلود گزارش جامع اکسل / CSV ------------------- */
  const exportComprehensiveReport = () => {
    const rows: Array<Array<string | number>> = [];
    rows.push(['گزارش جامع مالی، ترازنامه و بهای تمام‌شده مزرعه', s.settings.farmName || 'مزرعه بوقلمون']);
    rows.push(['محدوده گزارش', flockFilterLabel]);
    rows.push(['بازه زمانی', periodLabel]);
    rows.push(['تاریخ استخراج گزارش', today()]);
    rows.push([]);

    rows.push(['================== بخش ۱: صورت سود و زیان (P&L) ==================']);
    rows.push(['شرح', 'مبلغ (تومان)']);
    rows.push(['درآمد کل فروش', Math.round(t.revenue)]);
    rows.push(['بهای خرید کالا', Math.round(t.purchase)]);
    rows.push(['هزینه‌های عملیاتی', Math.round(t.expenses)]);
    rows.push(['سود / زیان ناخالص', Math.round(t.profit)]);
    rows.push(['حاشیه سود ناخالص (٪)', t.margin.toFixed(2)]);
    rows.push([]);

    rows.push(['================== بخش ۲: ترازنامه تجمیعی مزرعه ==================']);
    rows.push(['دارایی‌ها (Assets)', 'مبلغ (تومان)']);
    rows.push(['وجوه نقد و بانک‌ها', Math.round(balanceSheet.cashAndBanks)]);
    rows.push(['اسناد دریافتنی (چک‌های صیادی نزد صندوق)', Math.round(balanceSheet.receivableCheques)]);
    rows.push(['مطالبات تجاری (طلب از خریداران)', Math.round(balanceSheet.tradeReceivables)]);
    rows.push(['موجودی کالا و انبار نهاده‌ها', Math.round(balanceSheet.inventoryGoods)]);
    rows.push(['موجودی گوشت منجمد سردخانه', Math.round(balanceSheet.frozenMeat)]);
    rows.push(['دارایی‌های زیستی جاری گله‌ها (استاندارد ۲۶)', Math.round(balanceSheet.biologicalAssets)]);
    rows.push(['جمع کل دارایی‌های جاری', Math.round(balanceSheet.totalCurrentAssets)]);
    rows.push(['دارایی‌های ثابت و تاسیسات', Math.round(balanceSheet.fixedAssets)]);
    rows.push(['جمع کل دارایی‌ها', Math.round(balanceSheet.totalAssets)]);
    rows.push([]);
    rows.push(['بدهی‌ها و سرمایه (Liabilities & Equity)', 'مبلغ (تومان)']);
    rows.push(['حساب‌های پرداختنی تجاری (بدهی به تامین‌کنندگان)', Math.round(balanceSheet.tradePayables)]);
    rows.push(['اسناد پرداختنی (چک‌های صیادی صادره سررسیدنشده)', Math.round(balanceSheet.payableCheques)]);
    rows.push(['جمع کل بدهی‌ها', Math.round(balanceSheet.totalLiabilities)]);
    rows.push(['سرمایه و آورده نقدی شرکا', Math.round(balanceSheet.contributions)]);
    rows.push(['سود (زیان) انباشته', Math.round(balanceSheet.retainedEarnings)]);
    rows.push(['جمع حقوق صاحبان سرمایه', Math.round(balanceSheet.totalEquity)]);
    rows.push(['جمع کل بدهی‌ها و حقوق صاحبان سرمایه', Math.round(balanceSheet.totalLiabilities + balanceSheet.totalEquity)]);
    rows.push([]);

    rows.push(['================== بخش ۳: بهای تمام‌شده استاندارد ۲۶ ==================']);
    rows.push(['سرفصل هزینه', 'مبلغ (تومان)', 'درصد از کل']);
    rows.push(['جوجه یکروزه', Math.round(costAnalysis.chickCost), ((costAnalysis.chickCost / costAnalysis.totalExp) * 100).toFixed(1)]);
    rows.push(['دان و خوراک و مکمل', Math.round(costAnalysis.feedCost), ((costAnalysis.feedCost / costAnalysis.totalExp) * 100).toFixed(1)]);
    rows.push(['دارو و واکسن و بهداشت', Math.round(costAnalysis.medCost), ((costAnalysis.medCost / costAnalysis.totalExp) * 100).toFixed(1)]);
    rows.push(['سوخت و گاز و انرژی سالن‌ها', Math.round(costAnalysis.energyCost), ((costAnalysis.energyCost / costAnalysis.totalExp) * 100).toFixed(1)]);
    rows.push(['دستمزد و کارگری', Math.round(costAnalysis.laborCost), ((costAnalysis.laborCost / costAnalysis.totalExp) * 100).toFixed(1)]);
    rows.push(['سایر هزینه‌های عمومی و سربار', Math.round(costAnalysis.otherCost), ((costAnalysis.otherCost / costAnalysis.totalExp) * 100).toFixed(1)]);
    rows.push(['بهای تمام‌شده هر کیلو وزن زنده', Math.round(costAnalysis.costPerKgLive), 'تومان/کیلوگرم']);
    rows.push(['بهای تمام‌شده برآوردی هر کیلو لاشه (۸۰٪ راندمان)', Math.round(costAnalysis.baseCarcassCostPerKg), 'تومان/کیلوگرم']);
    rows.push([]);

    rows.push(['================== بخش ۴: تقسیم سود و تسویه شرکا ==================']);
    rows.push(['شریک', 'درصد سهم', 'سهم از درآمد', 'سهم از هزینه', 'سود/زیان سهم', 'مانده حساب']);
    settle.rows.forEach((r) => {
      rows.push([
        r.name,
        r.share.toFixed(2),
        Math.round(r.shareRevenue),
        Math.round(r.shareExpenseTotal),
        Math.round(r.shareProfit),
        Math.round(r.balance),
      ]);
    });
    rows.push([]);

    rows.push(['================== بخش ۵: ماتریس مقایسه عملکرد گله‌ها ==================']);
    rows.push(['نام گله', 'سن (روز)', 'موجودی زنده', 'تلفات (٪)', 'ضریب تبدیل FCR', 'شاخص اروپایی EPEF', 'کل هزینه', 'کل درآمد', 'سود دوره']);
    s.flocks.forEach((f) => {
      const st = flockStats(s, f.id);
      if (st) {
        rows.push([
          f.name,
          st.age,
          st.alive,
          st.mortalityPct.toFixed(1),
          st.fcr.toFixed(2),
          Math.round(st.epef || 0),
          Math.round(st.expenses),
          Math.round(st.revenue),
          Math.round(st.profit),
        ]);
      }
    });

    download(`turkey-farm-report-${today().replace(/\//g, '-')}.csv`, toCsv(rows));
    ui.toast('فایل اکسل جامع گزارش‌ها با موفقیت دانلود شد');
  };

  const transfers = suggestTransfers(settle.rows, settle.surplus);

  return (
    <>
      {/* سربرگ مخصوص حالت پرینت رسمی */}
      <div className="print-header" style={{ display: 'none', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111', paddingBottom: 10 }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0' }}>مزرعه پرورش بوقلمون {s.settings.farmName || ''}</h2>
            <div style={{ fontSize: 13, color: '#444' }}>صورت‌های مالی تلفیقی و بهای تمام‌شده استاندارد ۲۶ حسابداری ایران</div>
          </div>
          <div style={{ textAlign: 'left', fontSize: 12 }}>
            <div><b>تاریخ صدور:</b> {today()}</div>
            <div><b>محدوده:</b> {flockFilterLabel} — {periodLabel}</div>
          </div>
        </div>
      </div>

      <PageHead
        title="گزارش‌ها، ترازنامه و بهای تمام‌شده"
        sub="تصویر جامع وضعیت مالی، ترازنامه تلفیقی، استاندارد ۲۶ حسابداری، و عملکرد تفکیکی گله‌ها"
        actions={
          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={exportComprehensiveReport}>
              <Icon name="download" size={16} /> دانلود اکسل جامع (CSV)
            </button>
            <button className="btn primary" onClick={() => window.print()}>
              <Icon name="print" size={16} /> چاپ رسمی / PDF
            </button>
          </div>
        }
      />

      {/* تب‌های صفحه گزارش‌ها */}
      <div className="subnav-scroll no-print">
        <button
          type="button"
          className={`btn ${reportTab === 'pnl' ? 'primary' : ''}`}
          onClick={() => setReportTab('pnl')}
        >
          📊 صورت سود و زیان و نقدینگی
        </button>
        <button
          type="button"
          className={`btn ${reportTab === 'balance_sheet' ? 'primary' : ''}`}
          onClick={() => setReportTab('balance_sheet')}
        >
          ⚖️ ترازنامه جامع مزرعه
        </button>
        <button
          type="button"
          className={`btn ${reportTab === 'cost_accounting' ? 'primary' : ''}`}
          onClick={() => setReportTab('cost_accounting')}
        >
          🏷️ بهای تمام‌شده (استاندارد ۲۶)
        </button>
        <button
          type="button"
          className={`btn ${reportTab === 'flocks_matrix' ? 'primary' : ''}`}
          onClick={() => setReportTab('flocks_matrix')}
        >
          🐥 مقایسه جامع گله‌ها
        </button>
        <button
          type="button"
          className={`btn ${reportTab === 'partners_settle' ? 'primary' : ''}`}
          onClick={() => setReportTab('partners_settle')}
        >
          🤝 تسویه‌حساب و سهم شرکا
        </button>
      </div>

      {/* نوار انتخاب و فیلتر گله‌ها */}
      <div className="card no-print" style={{ padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>🎯 فیلتر گله:</span>
            <span className="badge purple" style={{ fontSize: 12, padding: '4px 10px' }}>
              {flockFilterLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className={`btn sm ${isMultiMode ? 'primary' : 'ghost'}`}
              onClick={() => setIsMultiMode(!isMultiMode)}
              title="امکان انتخاب همزمان چند گله برای مشاهده سرجمع آنها"
            >
              {isMultiMode ? '✓ حالت چند گله‌ای فعال' : '＋ انتخاب چند گله'}
            </button>
          </div>
        </div>

        <div className="subnav-scroll" style={{ paddingBottom: 4, marginTop: 10 }}>
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
                  if (isMultiMode) {
                    if (isSelected) {
                      setSelectedFlockIds(selectedFlockIds.filter((id) => id !== f.id));
                    } else {
                      setSelectedFlockIds([...selectedFlockIds, f.id]);
                    }
                  } else {
                    if (isSelected) {
                      setSelectedFlockIds([]);
                    } else {
                      setSelectedFlockIds([f.id]);
                    }
                  }
                }}
              >
                🐥 {f.name}
                {f.status === 'closed' ? ' (خاتمه‌یافته)' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="no-print">
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
      </div>

      {/* ============================================================== */}
      {/* تب ۱: صورت سود و زیان و نقدینگی */}
      {/* ============================================================== */}
      {reportTab === 'pnl' && (
        <>
          <div className="card mt">
            <SectionHead title="صورت سود و زیان" sub={`${flockFilterLabel} — ${periodLabel}`} />
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
                  {n(rec.unlinkedPayments)} سند دریافت/پرداخت به فاکتوری وصل نشده است و در این جدول لحاظ نشده.
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
            <SectionHead title="مقایسه ماهانه درآمد و هزینه" sub="۶ ماه اخیر" />
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
                    <tr style={{ background: '#FBF9FF', fontWeight: 700 }}>
                      <td>جمع</td>
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
        </>
      )}

      {/* ============================================================== */}
      {/* تب ۲: ترازنامه جامع و صورت وضعیت مالی تلفیقی */}
      {/* ============================================================== */}
      {reportTab === 'balance_sheet' && (
        <div className="space-y-4">
          <div className="stats">
            <Stat
              icon="🏦"
              label="جمع کل دارایی‌ها"
              value={short(balanceSheet.totalAssets)}
              unit="تومان"
              sub="دارایی‌های جاری و سرمایه‌ای مزرعه"
              tone="green"
            />
            <Stat
              icon="🧾"
              label="جمع کل بدهی‌ها"
              value={short(balanceSheet.totalLiabilities)}
              unit="تومان"
              sub="اسناد و حساب‌های پرداختنی تجاری"
              tone="red"
            />
            <Stat
              icon="💎"
              label="حقوق صاحبان سرمایه"
              value={short(balanceSheet.totalEquity)}
              unit="تومان"
              sub="آورده نقدی شرکا + سود انباشته"
              tone="purple"
            />
            <Stat
              icon="⚖️"
              label="وضعیت تراز"
              value={balanceSheet.isBalanced ? 'موزون و تراز' : 'نیازمند بررسی'}
              sub="دارایی = بدهی + سرمایه"
              tone={balanceSheet.isBalanced ? 'green' : 'warn'}
            />
          </div>

          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* سمت راست: دارایی‌ها */}
            <div className="card">
              <SectionHead title="دارایی‌ها (Assets)" sub="موجودی نقد، مطالبات، انبار، گوشت و دارایی‌های زیستی" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  ۱. دارایی‌های جاری
                </div>
                <div className="kv">
                  <span>وجوه نقد، بانک‌ها و صندوق‌ها</span>
                  <b className="font-mono">{money(balanceSheet.cashAndBanks)}</b>
                </div>
                <div className="kv">
                  <span>اسناد دریافتنی (چک‌های صیادی نزد صندوق)</span>
                  <b className="font-mono">{money(balanceSheet.receivableCheques)}</b>
                </div>
                <div className="kv">
                  <span>حساب‌ها و مطالبات تجاری (طلب از خریداران)</span>
                  <b className="font-mono">{money(balanceSheet.tradeReceivables)}</b>
                </div>
                <div className="kv">
                  <span>موجودی کالا و انبار نهاده‌ها و دان</span>
                  <b className="font-mono">{money(balanceSheet.inventoryGoods)}</b>
                </div>
                <div className="kv">
                  <span>موجودی گوشت منجمد سردخانه (پارت‌های بازرگانی)</span>
                  <b className="font-mono">{money(balanceSheet.frozenMeat)}</b>
                </div>
                <div className="kv">
                  <span>دارایی‌های زیستی جاری گله‌ها (استاندارد ۲۶)</span>
                  <b className="font-mono">{money(balanceSheet.biologicalAssets)}</b>
                </div>
                <div className="kv" style={{ background: '#F0FDF4', padding: '8px 10px', borderRadius: 8 }}>
                  <b>جمع دارایی‌های جاری</b>
                  <b style={{ color: '#059669' }}>{money(balanceSheet.totalCurrentAssets)}</b>
                </div>

                <div style={{ fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginTop: 10 }}>
                  ۲. دارایی‌های غیرجاری و ثابت
                </div>
                <div className="kv">
                  <span>تاسیسات، ماشین‌آلات، آسیاب و تجهیزات سالن‌ها</span>
                  <b className="font-mono">{money(balanceSheet.fixedAssets)}</b>
                </div>
                <div className="kv" style={{ background: '#F5F3FF', padding: '10px', borderRadius: 8, fontSize: '1.05rem' }}>
                  <b style={{ color: '#6D28D9' }}>جمع کل دارایی‌ها</b>
                  <b style={{ color: '#6D28D9' }}>{money(balanceSheet.totalAssets)} تومان</b>
                </div>
              </div>
            </div>

            {/* سمت چپ: بدهی‌ها و حقوق صاحبان سرمایه */}
            <div className="card">
              <SectionHead title="بدهی‌ها و حقوق صاحبان سرمایه" sub="تعهدات به تامین‌کنندگان، چک‌ها، سرمایه شرکا و سود انباشته" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 700, color: '#DC2626', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  ۱. بدهی‌های جاری
                </div>
                <div className="kv">
                  <span>حساب‌های پرداختنی تجاری (بدهی به تامین‌کنندگان)</span>
                  <b className="font-mono">{money(balanceSheet.tradePayables)}</b>
                </div>
                <div className="kv">
                  <span>اسناد پرداختنی (چک‌های صیادی صادره سررسیدنشده)</span>
                  <b className="font-mono">{money(balanceSheet.payableCheques)}</b>
                </div>
                <div className="kv" style={{ background: '#FEF2F2', padding: '8px 10px', borderRadius: 8 }}>
                  <b>جمع کل بدهی‌ها</b>
                  <b style={{ color: '#DC2626' }}>{money(balanceSheet.totalLiabilities)}</b>
                </div>

                <div style={{ fontWeight: 700, color: '#059669', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginTop: 10 }}>
                  ۲. حقوق صاحبان سرمایه (حقوق شرکا)
                </div>
                <div className="kv">
                  <span>سرمایه و آورده نقدی شرکا</span>
                  <b className="font-mono">{money(balanceSheet.contributions)}</b>
                </div>
                <div className="kv">
                  <span>سود (زیان) انباشته دوره‌ها</span>
                  <b className="font-mono" style={{ color: balanceSheet.retainedEarnings >= 0 ? '#059669' : '#DC2626' }}>
                    {money(balanceSheet.retainedEarnings)}
                  </b>
                </div>
                <div className="kv" style={{ background: '#ECFDF5', padding: '8px 10px', borderRadius: 8 }}>
                  <b>جمع حقوق صاحبان سرمایه</b>
                  <b style={{ color: '#059669' }}>{money(balanceSheet.totalEquity)}</b>
                </div>

                <div className="kv" style={{ background: '#F5F3FF', padding: '10px', borderRadius: 8, fontSize: '1.05rem', marginTop: 10 }}>
                  <b style={{ color: '#6D28D9' }}>جمع کل بدهی‌ها و حقوق صاحبان سرمایه</b>
                  <b style={{ color: '#6D28D9' }}>{money(balanceSheet.totalLiabilities + balanceSheet.totalEquity)} تومان</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* تب ۳: بهای تمام‌شده و استاندارد ۲۶ حسابداری ایران */}
      {/* ============================================================== */}
      {reportTab === 'cost_accounting' && (
        <div className="space-y-4">
          <div className="stats">
            <Stat
              icon="⚖️"
              label="بهای تمام‌شده هر کیلو وزن زنده"
              value={money(costAnalysis.costPerKgLive)}
              unit="تومان"
              sub="پای باسکول خروجی مزرعه"
              tone="purple"
            />
            <Stat
              icon="🍗"
              label="بهای تمام‌شده هر کیلو لاشه"
              value={money(costAnalysis.baseCarcassCostPerKg)}
              unit="تومان"
              sub="با احتساب راندمان ۸۰٪ کشتار"
              tone="green"
            />
            <Stat
              icon="🌾"
              label="سهم دان در بهای تمام‌شده"
              value={pct((costAnalysis.feedCost / costAnalysis.totalExp) * 100, 1)}
              sub={`${money(costAnalysis.feedCost)} تومان`}
              tone="warn"
            />
            <Stat
              icon="🐥"
              label="سهم جوجه در بهای تمام‌شده"
              value={pct((costAnalysis.chickCost / costAnalysis.totalExp) * 100, 1)}
              sub={`${money(costAnalysis.chickCost)} تومان`}
            />
          </div>

          {/* آنالیز سرفصل‌های بهای تمام‌شده استاندارد ۲۶ */}
          <div className="card">
            <SectionHead
              title="آنالیز عوامل بهای تمام‌شده تولید (استاندارد ۲۶ حسابداری)"
              sub="تفکیک هزینه‌های مستقیم پرورش و هزینه‌های سربار عمومی مزرعه"
            />
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>سرفصل بهای تمام‌شده</th>
                    <th>نوع هزینه</th>
                    <th>مبلغ کل (تومان)</th>
                    <th>سهم از بهای تمام‌شده</th>
                    <th style={{ width: 140 }}>نمودار سهم</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'خوراک و دان آماده و مکمل‌ها', type: 'مستقیم', amt: costAnalysis.feedCost, color: '#10B981' },
                    { name: 'جوجه یکروزه بوقلمون', type: 'مستقیم', amt: costAnalysis.chickCost, color: '#8B5CF6' },
                    { name: 'دارو، واکسن و بهداشت سالن', type: 'مستقیم', amt: costAnalysis.medCost, color: '#EC4899' },
                    { name: 'سوخت، گاز و انرژی گرمایشی', type: 'سربار مستقیم', amt: costAnalysis.energyCost, color: '#F59E0B' },
                    { name: 'دستمزد و کارگری و سرپرستی', type: 'سربار عمومی', amt: costAnalysis.laborCost, color: '#3B82F6' },
                    { name: 'تعمیرات، حمل و استهلاک', type: 'سربار غیرمستقیم', amt: costAnalysis.otherCost, color: '#6B7280' },
                  ].map((row, idx) => {
                    const p = (row.amt / costAnalysis.totalExp) * 100;
                    return (
                      <tr key={idx}>
                        <td><b>{row.name}</b></td>
                        <td><span className="badge gray">{row.type}</span></td>
                        <td className="num-cell">{money(row.amt)}</td>
                        <td className="num-cell">{pct(p, 1)}</td>
                        <td>
                          <Bar value={p} color={row.color} />
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#FBF9FF', fontWeight: 700 }}>
                    <td>جمع کل هزینه‌های بهای تمام‌شده</td>
                    <td>—</td>
                    <td className="num-cell">{money(costAnalysis.totalExp)}</td>
                    <td className="num-cell">۱۰۰٪</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* جدول تسهیم بهای تمام‌شده قطعات گوشت به روش ارزش نسبی فروش */}
          <div className="card">
            <SectionHead
              title="تسهیم بهای تمام‌شده قطعات صنعتی گوشت لاشه (روش ارزش نسبی فروش)"
              sub="محاسبه استاندارد حسابداری صنعتی برای تسهیم هزینه پرنده زنده و کشتار به قطعات استحصالی"
            />
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>قطعه صنعتی گوشت</th>
                    <th>درصد بازده وزنی از لاشه</th>
                    <th>ضریب ارزش بازاری نسبت به لاشه</th>
                    <th>بهای تمام‌شده هر کیلوگرم (تومان)</th>
                    <th>توجیه بهای صنعتی</th>
                  </tr>
                </thead>
                <tbody>
                  {costAnalysis.allocatedCuts.map((cut, idx) => (
                    <tr key={idx}>
                      <td><b>🍗 {cut.name}</b></td>
                      <td className="num-cell">{pct(cut.shareOfCarcass * 100, 0)}</td>
                      <td className="num-cell">{cut.relativeValueRatio.toFixed(2)}x</td>
                      <td className="num-cell">
                        <b style={{ color: 'var(--primary)' }}>{money(cut.cutCostPerKg)}</b>
                      </td>
                      <td>
                        <span className="hint">
                          {cut.relativeValueRatio > 1 ? 'قطعه پرارزش (سودده)' : 'قطعه فرعی / اقتصادی'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              بر اساس استاندارد حسابداری، بهای تمام‌شده لاشه کشتارگاهی بر اساس نسبت ارزش بازاری (Relative Sales Value) بین قطعات تسهیم شده است تا سود واقعی هر قطعه به درستی استخراج شود.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* تب ۴: ماتریس جامع مقایسه فنی و مالی گله‌ها */}
      {/* ============================================================== */}
      {reportTab === 'flocks_matrix' && (
        <div className="card">
          <SectionHead
            title="ماتریس تفصیلی مقایسه عملکرد فنی و مالی گله‌ها"
            sub="بررسی همزمان سن، تلفات، ضریب تبدیل (FCR)، شاخص کارایی (EPEF)، بهای تمام‌شده و سود خالص"
          />
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>گله</th>
                  <th>وضعیت</th>
                  <th>سن</th>
                  <th>موجودی</th>
                  <th>تلفات (٪)</th>
                  <th>FCR</th>
                  <th>EPEF</th>
                  <th>بهای هر کیلو</th>
                  <th>کل هزینه</th>
                  <th>کل درآمد</th>
                  <th>سود / زیان</th>
                </tr>
              </thead>
              <tbody>
                {s.flocks.map((f) => {
                  const st = flockStats(s, f.id);
                  if (!st) return null;
                  const isSelected = selectedFlockIds.includes(f.id);
                  return (
                    <tr
                      key={f.id}
                      style={{
                        background: isSelected ? '#F5F3FF' : undefined,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (isMultiMode) {
                          if (isSelected) {
                            setSelectedFlockIds(selectedFlockIds.filter((id) => id !== f.id));
                          } else {
                            setSelectedFlockIds([...selectedFlockIds, f.id]);
                          }
                        } else {
                          if (isSelected) {
                            setSelectedFlockIds([]);
                          } else {
                            setSelectedFlockIds([f.id]);
                          }
                        }
                      }}
                    >
                      <td>
                        <b>{f.name}</b>
                      </td>
                      <td>
                        <span className={`badge ${f.status === 'closed' ? 'gray' : 'green'}`}>
                          {f.status === 'closed' ? 'خاتمه‌یافته' : 'فعال'}
                        </span>
                      </td>
                      <td>{n(st.age)} روز</td>
                      <td className="num-cell">{n(st.alive)}</td>
                      <td className="num-cell" style={{ color: st.mortalityPct > 8 ? '#DC2626' : undefined }}>
                        {pct(st.mortalityPct, 1)}
                      </td>
                      <td className="num-cell"><b>{n(st.fcr, 2)}</b></td>
                      <td className="num-cell">
                        <b style={{ color: (st.epef || 0) > 300 ? '#059669' : '#D97706' }}>
                          {n(Math.round(st.epef || 0))}
                        </b>
                      </td>
                      <td className="num-cell">{money(Math.round(st.costPerKg))}</td>
                      <td className="num-cell">{short(st.expenses)}</td>
                      <td className="num-cell">{short(st.revenue)}</td>
                      <td className="num-cell" style={{ color: st.profit >= 0 ? '#059669' : '#DC2626' }}>
                        <b>{short(st.profit)}</b>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="hint" style={{ marginTop: 8 }}>
            با کلیک بر روی هر سطر، می‌توانید فیلتر اختصاصی آن گله را برای کل صفحه گزارش‌ها فعال یا غیرفعال نمایید.
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* تب ۵: تسهیم سود و تسویه‌حساب شرکا */}
      {/* ============================================================== */}
      {reportTab === 'partners_settle' && (
        <div className="space-y-4">
          <div className="card">
            <SectionHead
              title="تقسیم سود و زیان بین شرکا"
              sub={
                selectedFlockIds.length === 1
                  ? `بر اساس سهم واقعی شرکا در ${flockFilterLabel}`
                  : selectedFlockIds.length > 1
                  ? `بر اساس سهم شرکا در ${flockFilterLabel}`
                  : 'بر اساس درصد سهام شرکا در کل مزرعه'
              }
            />
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>شریک</th>
                    <th>درصد سهم</th>
                    <th>سهم از هزینه</th>
                    <th>سهم از درآمد</th>
                    <th>سود / زیان سهم</th>
                    <th>مانده حساب</th>
                  </tr>
                </thead>
                <tbody>
                  {settle.rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.name}</b>
                      </td>
                      <td>
                        <b style={{ color: 'var(--primary, #6D28D9)' }}>{pct(r.share, 2)}</b>
                      </td>
                      <td className="num-cell">{n(r.shareExpenseTotal)}</td>
                      <td className="num-cell" style={{ color: '#059669' }}>
                        {n(r.shareRevenue)}
                      </td>
                      <td
                        className="num-cell"
                        style={{ color: r.shareProfit >= 0 ? '#059669' : '#DC2626' }}
                      >
                        <b>{n(r.shareProfit)}</b>
                      </td>
                      <td className="num-cell" style={{ color: r.balance >= 0 ? '#059669' : '#DC2626' }}>
                        <b>{n(r.balance)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              سهم هر شریک، سهم از درآمد، سهم از هزینه و سود/زیان بر اساس گله(های) انتخاب‌شده به صورت مجزا محاسبه شده است.
            </div>
          </div>

          {/* پیشنهادات تسویه حساب دوطرفه بین شرکا */}
          {transfers.length > 0 && (
            <div className="card">
              <SectionHead
                title="پیشنهاد نقل و انتقالات مالی جهت تسویه نهایی بین شرکا"
                sub="کمترین تعداد تراکنش برای به صفر رساندن مانده حساب شرکا"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {transfers.map((tr, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--surface-sunken)',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: '#DC2626' }}>{tr.from}</span>
                      <span>باید پرداخت کند به</span>
                      <span style={{ fontWeight: 700, color: '#059669' }}>{tr.to}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                      {money(tr.amount)} تومان
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
