/**
 * فرم‌های فاز ۴: فرمولاسیون صنعتی جیره غذایی و بچ تولید خوراک
 */
import { useMemo, useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Chips, DecimalInput } from '../components/ui';
import { actions, num, useApp } from '../data/store';
import { today } from '../lib/jalali';
import { money, n } from '../lib/format';
import type { Batch, FeedStage, Formula, FormulaItem } from '../data/types';

/* -------------------------------------------------------------------------- */
/*                                فرمولاسیون دان                              */
/* -------------------------------------------------------------------------- */

export const FEED_STAGE_LABELS: Record<FeedStage, { label: string; period: string; targetProtein: number; icon: string }> = {
  pre_starter: { label: 'پیش‌دان (سوپراستارتر)', period: 'هفته ۱ تا ۴', targetProtein: 28, icon: '🐣' },
  starter: { label: 'استارتر (آغازین)', period: 'هفته ۵ تا ۸', targetProtein: 26, icon: '🐥' },
  grower1: { label: 'میان‌دان ۱ (رشد اولیه)', period: 'هفته ۹ تا ۱۲', targetProtein: 22.5, icon: '🦃' },
  grower2: { label: 'میان‌دان ۲ (رشد تکمیلی)', period: 'هفته ۱۳ تا ۱۶', targetProtein: 20, icon: '🦃' },
  finisher: { label: 'پس‌دان (فینیشر پایان دوره)', period: 'هفته ۱۷ تا کشتار', targetProtein: 16.5, icon: '🍗' },
  custom: { label: 'سفارشی / آزمایشی', period: 'ویژه مزرعه', targetProtein: 22, icon: '🧪' },
};

/**
 * محاسبه خودکار و دقیق میانگین موزون نرخ هر کیلو ماده اولیه از فاکتورهای خرید انبار
 * فرمول: مجموع (مقدار خرید × فی خرید) ÷ مجموع کل کیلوگرم خریداری‌شده
 */
export function computeWeightedAverageRate(
  rawName: string,
  state: { transactions: any[]; inventory: any[]; expenses?: any[] }
): { price: number; desc: string; count: number; totalQty: number } {
  if (!rawName || !rawName.trim()) {
    return { price: 0, desc: 'بدون نام', count: 0, totalQty: 0 };
  }

  const clean = (str: string) =>
    (str || '')
      .toLowerCase()
      .replace(/[\s‌\-_()]+/g, '')
      .replace(/ی/g, 'ی')
      .replace(/ي/g, 'ی')
      .replace(/ک/g, 'ک')
      .replace(/ك/g, 'ک');

  const target = clean(rawName);

  // ۱. اولویت اول: فاکتورهای خرید در بخش معاملات (میانگین موزون رسمی)
  let sumCost = 0;
  let sumQty = 0;
  let txMatches = 0;

  for (const tx of state.transactions || []) {
    if (tx.type !== 'purchase') continue;
    for (const it of tx.items || []) {
      const itName = clean(it.name);
      if (itName && (itName.includes(target) || target.includes(itName))) {
        const q = num(it.qty);
        const p = num(it.price);
        if (q > 0 && p > 0) {
          sumQty += q;
          sumCost += q * p;
          txMatches++;
        }
      }
    }
  }

  if (sumQty > 0 && sumCost > 0) {
    const avg = Math.round(sumCost / sumQty);
    return {
      price: avg,
      desc: `میانگین موزون ${n(txMatches)} خرید (${n(sumQty)} کیلو)`,
      count: txMatches,
      totalQty: sumQty,
    };
  }

  // ۲. اولویت دوم: نرخ ثبت‌شده در کاردکس موجودی انبار
  const invMatched = (state.inventory || []).find((i) => {
    const iName = clean(i.name);
    return iName && (iName.includes(target) || target.includes(iName));
  });

  if (invMatched && num(invMatched.pricePerKg) > 0) {
    return {
      price: num(invMatched.pricePerKg),
      desc: `نرخ ثبت‌شده در انبار (${invMatched.name})`,
      count: 1,
      totalQty: num(invMatched.qty),
    };
  }

  // ۳. اولویت سوم: هزینه‌های مرتبط با خرید دان و خوراک
  for (const exp of state.expenses || []) {
    const expTitle = clean((exp.title || '') + ' ' + (exp.sub || ''));
    if (expTitle && (expTitle.includes(target) || target.includes(expTitle))) {
      const q = num(exp.qty);
      const a = num(exp.amount);
      if (q > 0 && a > 0) {
        sumQty += q;
        sumCost += a;
        txMatches++;
      }
    }
  }

  if (sumQty > 0 && sumCost > 0) {
    const avg = Math.round(sumCost / sumQty);
    return {
      price: avg,
      desc: `میانگین هزینه خوراک (${n(sumQty)} کیلو)`,
      count: txMatches,
      totalQty: sumQty,
    };
  }

  return { price: 0, desc: 'نرخ خریدی در انبار یافت نشد', count: 0, totalQty: 0 };
}

export function FormulaForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.formulas.find((f) => f.id === id) : null;

  const [name, setName] = useState(editing?.name ?? '');
  const [code, setCode] = useState(editing?.code ?? `FRM-${String(s.formulas.length + 1).padStart(2, '0')}`);
  const [stage, setStage] = useState<FeedStage>(editing?.stage ?? 'grower1');
  const [note, setNote] = useState(editing?.note ?? '');
  const [mode, setMode] = useState<'percent' | 'unit'>(editing?.shareMode ?? 'percent');
  const [items, setItems] = useState<FormulaItem[]>(() => {
    const src = editing?.items;
    if (src && src.length) return src.map((i) => ({ ...i }));

    const defaults = [
      { name: 'ذرت دانه‌ای', percent: 50, protein: 8.5, energyKcal: 3350, fallbackPrice: 18500 },
      { name: 'کنجاله سویا', percent: 35, protein: 44, energyKcal: 2250, fallbackPrice: 28000 },
      { name: 'کنسانتره بوقلمون', percent: 5, protein: 30, energyKcal: 1800, fallbackPrice: 65000 },
      { name: 'روغن مایع خوراکی', percent: 2.5, protein: 0, energyKcal: 8800, fallbackPrice: 58000 },
      { name: 'دی‌کلسیم فسفات (DCP)', percent: 1.5, protein: 0, energyKcal: 0, fallbackPrice: 35000 },
      { name: 'کربنات کلسیم (صدف)', percent: 1.2, protein: 0, energyKcal: 0, fallbackPrice: 4000 },
      { name: 'مکمل دوقلو و اسیدهای آمینه', percent: 4.8, protein: 15, energyKcal: 1200, fallbackPrice: 85000 },
    ];

    return defaults.map((d) => {
      const avg = computeWeightedAverageRate(d.name, s);
      return {
        name: d.name,
        percent: d.percent,
        pricePerKg: avg.price > 0 ? avg.price : d.fallbackPrice,
        protein: d.protein,
        energyKcal: d.energyKcal,
      };
    });
  });

  // مواد موجود در انبار برای پیشنهاد خودکار نام و قیمت
  const rawIngredients = useMemo(() => {
    return s.inventory.filter((i) => {
      const cat = (i.cat || '').trim();
      const name = (i.name || '').trim();
      return (
        cat.includes('دان') ||
        cat.includes('خوراک') ||
        cat.includes('مکمل') ||
        name.includes('ذرت') ||
        name.includes('سویا') ||
        name.includes('گندم') ||
        name.includes('کنسانتره') ||
        name.includes('روغن') ||
        name.includes('سبوس') ||
        name.includes('فسفات')
      );
    });
  }, [s.inventory]);

  const totalUnits = items.reduce((acc, it) => acc + num(it.percent), 0);
  const totals = items.reduce(
    (acc, it) => {
      const p = mode === 'unit'
        ? (totalUnits > 0 ? (num(it.percent) / totalUnits) * 100 : 0)
        : num(it.percent);
      acc.pct += p;
      acc.cost += (p / 100) * num(it.pricePerKg);
      acc.protein += (p / 100) * num(it.protein);
      acc.energy += (p / 100) * num(it.energyKcal || 0);
      return acc;
    },
    { pct: 0, cost: 0, protein: 0, energy: 0 },
  );

  const updateItem = (idx: number, patch: Partial<FormulaItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { name: '', percent: 0, pricePerKg: 0, protein: 0, energyKcal: 0 }]);
  };

  const onIngredientPicked = (idx: number, rawName: string) => {
    const avg = computeWeightedAverageRate(rawName, s);
    const matchedInv = s.inventory.find((i) => i.name.trim() === rawName.trim());
    const cleanName = matchedInv ? matchedInv.name : rawName;
    const newPrice = avg.price > 0 ? avg.price : (matchedInv?.pricePerKg ? num(matchedInv.pricePerKg) : (items[idx]?.pricePerKg || 0));

    updateItem(idx, {
      name: cleanName,
      pricePerKg: newPrice,
    });
  };

  const refreshRatesFromWarehouse = () => {
    let updatedCount = 0;
    setItems((prev) =>
      prev.map((it) => {
        if (!it.name.trim()) return it;
        const avg = computeWeightedAverageRate(it.name, s);
        if (avg.price > 0) {
          updatedCount++;
          return { ...it, pricePerKg: avg.price };
        }
        return it;
      })
    );
    toast(`نرخ‌های میانگین خرید ${n(updatedCount)} قلم از فاکتورهای انبار به‌روزرسانی و جایگذاری شد`);
  };

  const onStageChange = (newStage: FeedStage) => {
    setStage(newStage);
    const info = FEED_STAGE_LABELS[newStage];
    if (info && !editing) {
      setName(`جیره ${info.label}`);
    }
  };

  const save = () => {
    if (!name.trim()) {
      toast('نام فرمول الزامی است', 'error');
      return;
    }
    const cleanItems = items
      .filter((i) => i.name.trim())
      .map((it) => ({
        ...it,
        name: it.name.trim(),
        percent: mode === 'unit'
          ? (totalUnits > 0 ? Math.round(((num(it.percent) / totalUnits) * 100) * 100) / 100 : 0)
          : num(it.percent),
        pricePerKg: num(it.pricePerKg),
        protein: num(it.protein),
        energyKcal: num(it.energyKcal),
      }));

    if (!cleanItems.length) {
      toast('حداقل یک ماده اولیه در فرمول لازم است', 'error');
      return;
    }

    const payload: Omit<Formula, 'id' | 'createdAt'> = {
      code: code.trim(),
      name: name.trim(),
      stage,
      shareMode: mode,
      targetProtein: FEED_STAGE_LABELS[stage]?.targetProtein,
      note: note.trim(),
      items: cleanItems,
    };

    if (editing) {
      actions.update('formulas', editing.id, payload);
      toast('فرمول جیره غذایی با موفقیت ویرایش شد');
    } else {
      actions.add('formulas', payload);
      toast('فرمول جیره غذایی جدید ثبت شد');
    }
    onClose();
  };

  const stageInfo = FEED_STAGE_LABELS[stage] || FEED_STAGE_LABELS.custom;

  return (
    <Modal
      title={editing ? `ویرایش فرمول جیره — ${editing.name}` : 'طراحی فرمول جیره غذایی صنعتی بوقلمون'}
      size="xl"
      expandable={true}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            ذخیره فرمول جیره
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field third">
          <label className="lbl">کد فرمول</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FRM-01" />
        </div>
        <div className="field third">
          <label className="lbl">مرحله رشد پرورشی</label>
          <select className="input" value={stage} onChange={(e) => onStageChange(e.target.value as FeedStage)}>
            {Object.entries(FEED_STAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label} ({v.period})
              </option>
            ))}
          </select>
        </div>
        <div className="field third">
          <label className="lbl">نام فرمول *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً پیش‌دان سوپر استارتر" />
        </div>

        <div className="field full">
          <label className="lbl">توضیحات و مشخصات فرمول</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="شرایط ساخت، مکمل‌های دارویی اضافه و..."
          />
        </div>
      </div>

      {/* نحوه ورود مقادیر و ابزارهای استعلام انبار */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 8px', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>اقلام تشکیل‌دهنده جیره:</span>
          <span className="badge blue" style={{ fontSize: '0.8rem' }}>
            هدف استاندارد پروتئین: {stageInfo.targetProtein}٪
          </span>
          <button
            type="button"
            className="btn ghost small"
            onClick={refreshRatesFromWarehouse}
            title="محاسبه خودکار میانگین موزون نرخ خرید اقلام بر اساس فاکتورهای معاملات و موجودی انبار"
            style={{ fontSize: '0.78rem', color: 'var(--brand)', padding: '2px 8px', borderRadius: 8, border: '1px solid var(--line)' }}
          >
            ⚡ استعلام میانگین نرخ خرید از انبار
          </button>
        </div>
        <Chips
          items={[
            { value: 'percent', label: 'درصدی (مبنای ۱۰۰٪)' },
            { value: 'unit', label: 'نسبتی / وزنی (بچ آسیاب)' },
          ]}
          active={mode}
          onPick={(v) => setMode(v as 'percent' | 'unit')}
        />
      </div>

      {/* جدول مواد اولیه با عرض منعطف و پشتیبانی از انواع ارقام و اعشار */}
      <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: 12, overflowX: 'auto' }}>
        <table className="tbl" style={{ fontSize: '0.88rem', margin: 0, minWidth: 720 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 230 }}>نام ماده اولیه</th>
              <th style={{ width: 110, minWidth: 100 }}>{mode === 'percent' ? 'درصد (٪)' : 'وزن (کیلو)'}</th>
              {mode === 'unit' && <th style={{ width: 90, minWidth: 80 }}>درصد معادل</th>}
              <th style={{ width: 145, minWidth: 135 }}>نرخ هر کیلو (تومان)</th>
              <th style={{ width: 100, minWidth: 90 }}>پروتئین (CP ٪)</th>
              <th style={{ width: 110, minWidth: 100 }}>انرژی (ME kcal)</th>
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => {
              const equivPct = totalUnits > 0 && mode === 'unit'
                ? ((num(row.percent) / totalUnits) * 100).toFixed(1)
                : num(row.percent).toFixed(1);

              return (
                <tr key={idx}>
                  <td>
                    <input
                      className="input"
                      style={{ padding: '6px 10px', fontSize: '0.88rem', minWidth: 200 }}
                      list={`raw-feed-list-${idx}`}
                      value={row.name}
                      onChange={(e) => onIngredientPicked(idx, e.target.value)}
                      placeholder="انتخاب یا تایپ ماده خام..."
                    />
                    <datalist id={`raw-feed-list-${idx}`}>
                      {rawIngredients.map((ri) => {
                        const avg = computeWeightedAverageRate(ri.name, s);
                        return (
                          <option key={ri.id} value={ri.name}>
                            موجودی انبار: {n(ri.qty)} {ri.unit} · {avg.desc || `نرخ: ${n(ri.pricePerKg)} تومان`}
                          </option>
                        );
                      })}
                    </datalist>
                  </td>
                  <td>
                    <DecimalInput
                      style={{ padding: '6px 8px', textAlign: 'center' }}
                      value={row.percent}
                      placeholder={mode === 'percent' ? 'درصد' : 'کیلو'}
                      onChange={(val) => updateItem(idx, { percent: val })}
                    />
                  </td>
                  {mode === 'unit' && (
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      {n(equivPct)}٪
                    </td>
                  )}
                  <td>
                    <DecimalInput
                      style={{ padding: '6px 8px', textAlign: 'center' }}
                      value={row.pricePerKg}
                      placeholder="۰"
                      onChange={(val) => updateItem(idx, { pricePerKg: val })}
                    />
                  </td>
                  <td>
                    <DecimalInput
                      style={{ padding: '6px 8px', textAlign: 'center' }}
                      value={row.protein}
                      placeholder="۰"
                      onChange={(val) => updateItem(idx, { protein: val })}
                    />
                  </td>
                  <td>
                    <DecimalInput
                      style={{ padding: '6px 8px', textAlign: 'center' }}
                      value={row.energyKcal}
                      placeholder="۰"
                      onChange={(val) => updateItem(idx, { energyKcal: val })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn ghost small"
                      style={{ color: 'var(--danger)', padding: 4 }}
                      onClick={() => removeItem(idx)}
                      title="حذف این ماده اولیه"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn small" onClick={addItem}>
          <Icon name="plus" size={14} /> افزودن ماده اولیه دیگر
        </button>
      </div>

      {/* کارت خلاصه محاسباتی و تغذیه‌ای فرمول */}
      <div
        style={{
          marginTop: 14,
          padding: '12px 16px',
          background: 'var(--surface-sunken)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>بهای تمام‌شده هر کیلو</div>
          <b style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{money(totals.cost)} تومان</b>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>پروتئین خام (CP)</div>
          <b
            style={{
              fontSize: '1.05rem',
              color: Math.abs(totals.protein - stageInfo.targetProtein) <= 1.5 ? '#059669' : '#D97706',
            }}
          >
            {n(totals.protein, 1)}٪
          </b>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>انرژی قابل متابولیسم (ME)</div>
          <b style={{ fontSize: '1.05rem' }}>{n(totals.energy, 0)} kcal</b>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {mode === 'percent' ? 'جمع درصدها (مبنای ۱۰۰٪)' : 'جمع وزن‌ها / نسبت‌ها'}
          </div>
          <b
            style={{
              fontSize: '1.05rem',
              color:
                mode === 'percent'
                  ? Math.abs(totals.pct - 100) < 0.5
                    ? '#059669'
                    : '#DC2626'
                  : 'var(--primary)',
            }}
          >
            {mode === 'percent'
              ? `${n(totals.pct, 1)}٪ ${Math.abs(totals.pct - 100) < 0.5 ? '✓' : '⚠️'}`
              : `${n(totalUnits)} کیلوگرم (نسبتی)`}
          </b>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                               بچ تولید خوراک                               */
/* -------------------------------------------------------------------------- */

export function BatchForm({
  formulaId: presetFormulaId,
  onClose,
}: {
  formulaId?: string;
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();

  const [date, setDate] = useState(today());
  const [code, setCode] = useState(`BATCH-${String(s.batches.length + 1).padStart(2, '0')}`);
  const [formulaId, setFormulaId] = useState(presetFormulaId || s.formulas[0]?.id || '');
  const [qtyKg, setQtyKg] = useState('2000');
  const [flockId, setFlockId] = useState('');
  const [hallId, setHallId] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [millingCostPerKg, setMillingCostPerKg] = useState('450');
  const [stockDeducted, setStockDeducted] = useState(true);
  const [expensed, setExpensed] = useState(false);
  const [note, setNote] = useState('');

  const fm = s.formulas.find((f) => f.id === formulaId);

  // محاسبه هزینه‌ها
  const qty = num(qtyKg);
  const rawCostPerKg = useMemo(() => {
    if (!fm) return 0;
    return (fm.items || []).reduce((acc, it) => acc + (num(it.percent) / 100) * num(it.pricePerKg), 0);
  }, [fm]);

  const millCostPerKg = num(millingCostPerKg);
  const totalCostPerKg = rawCostPerKg + millCostPerKg;
  const totalBatchCost = Math.round(totalCostPerKg * qty);

  const save = () => {
    if (!formulaId) {
      toast('انتخاب فرمول جیره غذایی الزامی است', 'error');
      return;
    }
    if (qty <= 0) {
      toast('مقدار تولید باید بیشتر از صفر باشد', 'error');
      return;
    }

    const payload: Omit<Batch, 'id' | 'createdAt'> = {
      code: code.trim(),
      date,
      formulaId,
      qtyKg: qty,
      flockId,
      hallId: hallId || undefined,
      sourceWarehouseId: sourceWarehouseId || undefined,
      targetWarehouseId: targetWarehouseId || undefined,
      millingCostPerKg: millCostPerKg,
      costPerKg: Math.round(totalCostPerKg),
      totalCost: totalBatchCost,
      stockDeducted,
      expensed,
      note: note.trim(),
    };

    actions.saveBatch(payload);

    // اگر ثبت در هزینه‌های حسابداری انتخاب شده باشد
    if (expensed && totalBatchCost > 0) {
      actions.add('expenses', {
        date,
        category: 'mix',
        sub: fm ? fm.name : 'خوراک ساختگی مزرعه',
        title: `تولید ${n(qty)} کیلو ${fm ? fm.name : 'خوراک'} (بچ ${code})`,
        amount: totalBatchCost,
        qty,
        unit: 'کیلوگرم',
        vendor: 'آسیاب‌میکسر فارم',
        paidBy: 'fund',
        split: 'share',
        flockId,
        note: `ثبت خودکار بهای تمام‌شده بچ خوراک شامل مواد اولیه و تبدیل`,
      });
    }

    toast(
      `بچ تولید خوراک ثبت شد` +
        (stockDeducted ? ' و مواد اولیه از انبار کسر و خوراک ساخته‌شده اضافه گردید' : ''),
    );
    onClose();
  };

  return (
    <Modal
      title="ثبت بچ تولید دان در آسیاب‌میکسر مزرعه"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            ثبت و صدور بچ تولید
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field third">
          <label className="lbl">شماره بچ تولید</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="field third">
          <label className="lbl">تاریخ تولید</label>
          <input className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field third">
          <label className="lbl">فرمول جیره انتخابی *</label>
          <select className="input" value={formulaId} onChange={(e) => setFormulaId(e.target.value)}>
            {s.formulas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code || '—'})
              </option>
            ))}
          </select>
        </div>

        <div className="field half">
          <label className="lbl">مقدار کل تولید (کیلوگرم) *</label>
          <DecimalInput
            value={qtyKg}
            onChange={(val) => setQtyKg(String(val))}
            placeholder="مثلاً ۲۰۰۰"
          />
        </div>
        <div className="field half">
          <label className="lbl">هزینه آسیاب و میکسر به ازای هر کیلو (تومان)</label>
          <DecimalInput
            value={millingCostPerKg}
            onChange={(val) => setMillingCostPerKg(String(val))}
            placeholder="مثلاً ۴۵۰"
          />
        </div>

        <div className="field half">
          <label className="lbl">گله مصرف‌کننده (اختیاری)</label>
          <select className="input" value={flockId} onChange={(e) => setFlockId(e.target.value)}>
            <option value="">عمومی مزرعه / ذخیره انبار</option>
            {s.flocks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} — {f.hall || ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field half">
          <label className="lbl">سالن مقصد (اختیاری)</label>
          <select className="input" value={hallId} onChange={(e) => setHallId(e.target.value)}>
            <option value="">انتخاب سالن...</option>
            {s.halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.code})
              </option>
            ))}
          </select>
        </div>

        <div className="field half">
          <label className="lbl">انبار مبدأ (کسر مواد اولیه)</label>
          <select
            className="input"
            value={sourceWarehouseId}
            onChange={(e) => setSourceWarehouseId(e.target.value)}
          >
            <option value="">انبار مواد اولیه خوراک مزرعه</option>
            {s.warehouses
              .filter((w) => ['raw_feed', 'farm_feed'].includes(w.type))
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
          </select>
        </div>
        <div className="field half">
          <label className="lbl">انبار مقصد (افزایش دان ساخته‌شده)</label>
          <select
            className="input"
            value={targetWarehouseId}
            onChange={(e) => setTargetWarehouseId(e.target.value)}
          >
            <option value="">انبار دان آماده مزرعه / انبارک سالن</option>
            {s.warehouses
              .filter((w) => ['farm_feed', 'hall_sub', 'factory_pellet'].includes(w.type))
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
          </select>
        </div>

        {/* سوییچ‌های انبار و حسابداری */}
        <div className="field full" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={stockDeducted}
              onChange={(e) => setStockDeducted(e.target.checked)}
            />
            <span>📦 کسر خودکار مواد اولیه از انبار و ورود دان تولیدی به موجودی انبار</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={expensed}
              onChange={(e) => setExpensed(e.target.checked)}
            />
            <span>💸 ثبت مستقیم بهای کل بچ به عنوان سند هزینه گله در حسابداری</span>
          </label>
        </div>

        {/* کارت بهای تمام‌شده */}
        <div
          className="field full"
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#166534' }}>بهای مواد اولیه هر کیلو</div>
            <b style={{ fontSize: '1rem', color: '#15803D' }}>{money(rawCostPerKg)} تومان</b>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#166534' }}>بهای تمام‌شده هر کیلو دان</div>
            <b style={{ fontSize: '1.05rem', color: '#15803D' }}>{money(totalCostPerKg)} تومان</b>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#166534' }}>ارزش کل بچ ({n(qty)} کیلو)</div>
            <b style={{ fontSize: '1.05rem', color: '#15803D' }}>{money(totalBatchCost)} تومان</b>
          </div>
        </div>

        <div className="field full">
          <label className="lbl">توضیحات و گزارش اپراتور آسیاب‌میکسر</label>
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="کیفیت آسیاب، رطوبت دان، زمان اختلاط و..."
          />
        </div>
      </div>
    </Modal>
  );
}
