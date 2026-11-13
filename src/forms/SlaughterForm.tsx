/**
 * فرم ثبت و مدیریت عملیات کشتارگاه، افت بار، راندمان لاشه و قطعه‌بندی صنعتی
 */
import { useMemo, useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { actions, flockStats, num, useApp } from '../data/store';
import { today } from '../lib/jalali';
import { money, n, pct } from '../lib/format';
import type { Flock, Hall, SlaughterBatch, SlaughterCut, Warehouse } from '../data/types';

const STANDARD_CUT_TEMPLATES = [
  { name: 'سینه بی‌استخوان و بدون پوست', weightRatio: 0.35, defaultPrice: 320000 },
  { name: 'فیله بوقلمون', weightRatio: 0.08, defaultPrice: 380000 },
  { name: 'ران بوقلمون با استخوان', weightRatio: 0.28, defaultPrice: 260000 },
  { name: 'ساق بوقلمون', weightRatio: 0.1, defaultPrice: 240000 },
  { name: 'بال و بازو', weightRatio: 0.07, defaultPrice: 150000 },
  { name: 'گردن بوقلمون', weightRatio: 0.04, defaultPrice: 110000 },
  { name: 'دل، جگر و سنگدان', weightRatio: 0.03, defaultPrice: 95000 },
  { name: 'اسکلت و آلایش صنعتی', weightRatio: 0.05, defaultPrice: 45000 },
];

export function SlaughterForm({
  batch,
  onClose,
}: {
  batch?: SlaughterBatch;
  onClose: () => void;
}) {
  const state = useApp();
  const ui = useUI();

  // فیلدهای اطلاعات عمومی
  const [code, setCode] = useState(
    batch?.code || `SL-${today().replace(/\//g, '').slice(2)}-${state.slaughterBatches.length + 1}`,
  );
  const [date, setDate] = useState(batch?.date || today());
  const [flockId, setFlockId] = useState(batch?.flockId || state.flocks[0]?.id || '');
  const [hallId, setHallId] = useState(batch?.hallId || '');
  const [driverName, setDriverName] = useState(batch?.driverName || '');
  const [truckPlate, setTruckPlate] = useState(batch?.truckPlate || '');
  const [shippingDocNo, setShippingDocNo] = useState(batch?.shippingDocNo || '');

  // سنجش وزن و بارگیری
  const [dispatchBirds, setDispatchBirds] = useState(String(batch?.dispatchBirds ?? ''));
  const [originWeightKg, setOriginWeightKg] = useState(String(batch?.originWeightKg ?? ''));
  const [destWeightKg, setDestWeightKg] = useState(String(batch?.destWeightKg ?? ''));
  const [doaCount, setDoaCount] = useState(String(batch?.doaCount ?? '0'));

  // استحصال لاشه
  const [carcassWeightKg, setCarcassWeightKg] = useState(String(batch?.carcassWeightKg ?? ''));

  // هزینه‌ها
  const [slaughterFeePerBird, setSlaughterFeePerBird] = useState(
    String(batch?.slaughterFeePerBird ?? 15000),
  );
  const [transportCost, setTransportCost] = useState(String(batch?.transportCost ?? ''));
  const [packagingCost, setPackagingCost] = useState(String(batch?.packagingCost ?? ''));
  const [customLiveCost, setCustomLiveCost] = useState<string>(
    batch?.totalLiveCost ? String(batch.totalLiveCost) : '',
  );

  // انبار و تنظیمات
  const coldWarehouses = useMemo(
    () => state.warehouses.filter((w: Warehouse) => w.type === 'cold_storage' || w.type === 'finished_goods' || w.type === 'other'),
    [state.warehouses],
  );
  const [targetWarehouseId, setTargetWarehouseId] = useState(
    batch?.targetWarehouseId || coldWarehouses[0]?.id || '',
  );
  const [stockUpdated, setStockUpdated] = useState(batch?.stockUpdated ?? true);
  const [recordExpenses, setRecordExpenses] = useState(false);
  const [notes, setNotes] = useState(batch?.notes || '');

  // قطعات لاشه
  const [cuts, setCuts] = useState<SlaughterCut[]>(() => {
    if (batch?.cuts && batch.cuts.length > 0) {
      return batch.cuts.map((c) => ({ ...c }));
    }
    return STANDARD_CUT_TEMPLATES.map((t) => ({
      name: t.name,
      weightKg: 0,
      marketPricePerKg: t.defaultPrice,
      costPerKg: 0,
      totalCost: 0,
    }));
  });

  // محاسبات افت بار و راندمان
  const originW = num(originWeightKg);
  const destW = num(destWeightKg);
  const dispatchB = num(dispatchBirds);
  const doa = num(doaCount);
  const carcassW = num(carcassWeightKg);

  const transportShrinkKg = Math.max(0, originW - destW);
  const transportShrinkPct = originW > 0 ? (transportShrinkKg / originW) * 100 : 0;
  const slaughterBirds = Math.max(0, dispatchB - doa);
  const dressingYieldPct = destW > 0 ? (carcassW / destW) * 100 : 0;

  // محاسبه خودکار بهای تمام‌شده زنده بر اساس وضعیت گله
  const currentFlockStats = useMemo(() => {
    if (!flockId) return null;
    return flockStats(state, flockId);
  }, [state, flockId]);

  const estimatedLiveCost = useMemo(() => {
    if (customLiveCost !== '') return num(customLiveCost);
    if (!currentFlockStats) return 0;
    const unitLiveCost = currentFlockStats.costPerKg;
    if (unitLiveCost > 0 && originW > 0) {
      return Math.round(unitLiveCost * originW);
    }
    // اگر بهای گله در دسترس نبود، برآورد میانگین
    return Math.round(originW * 140000);
  }, [customLiveCost, currentFlockStats, originW]);

  const totalSlaughterFee = slaughterBirds * num(slaughterFeePerBird);
  const totalProcessingCosts = totalSlaughterFee + num(transportCost) + num(packagingCost);
  const grandTotalCost = estimatedLiveCost + totalProcessingCosts;

  // تسهیم هزینه به روش ارزش نسبی فروش (Relative Sales Value Method)
  const allocatedCuts = useMemo(() => {
    const totalPotentialSales = cuts.reduce(
      (sum, c) => sum + num(c.weightKg) * num(c.marketPricePerKg),
      0,
    );

    return cuts.map((c) => {
      const w = num(c.weightKg);
      const p = num(c.marketPricePerKg);
      const cutSalesVal = w * p;
      let cutTotalCost = 0;
      let cutCostPerKg = 0;

      if (totalPotentialSales > 0 && grandTotalCost > 0 && cutSalesVal > 0) {
        const share = cutSalesVal / totalPotentialSales;
        cutTotalCost = Math.round(grandTotalCost * share);
        cutCostPerKg = w > 0 ? Math.round(cutTotalCost / w) : 0;
      }

      return {
        ...c,
        costPerKg: cutCostPerKg,
        totalCost: cutTotalCost,
      };
    });
  }, [cuts, grandTotalCost]);

  const totalCutsWeight = useMemo(
    () => allocatedCuts.reduce((sum, c) => sum + num(c.weightKg), 0),
    [allocatedCuts],
  );
  const cutWeightDiff = carcassW - totalCutsWeight;
  const cutLossPct = carcassW > 0 ? (cutWeightDiff / carcassW) * 100 : 0;

  // پر کردن خودکار وزن قطعات بر اساس راندمان استاندارد لاشه
  const applyStandardCutsYield = () => {
    if (carcassW <= 0) {
      ui.toast('ابتدا وزن کل لاشه را وارد نمایید.', 'error');
      return;
    }
    setCuts(
      STANDARD_CUT_TEMPLATES.map((t) => ({
        name: t.name,
        weightKg: Math.round(carcassW * t.weightRatio * 10) / 10,
        marketPricePerKg: t.defaultPrice,
        costPerKg: 0,
        totalCost: 0,
      })),
    );
    ui.toast('اوزان قطعات بر اساس راندمان استاندارد لاشه محاسبه شد.', 'ok');
  };

  const handleCutChange = (index: number, field: keyof SlaughterCut, val: any) => {
    setCuts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const addCutRow = () => {
    setCuts((prev) => [
      ...prev,
      { name: '', weightKg: 0, marketPricePerKg: 0, costPerKg: 0, totalCost: 0 },
    ]);
  };

  const removeCutRow = (index: number) => {
    setCuts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!code.trim()) {
      ui.toast('کد سری کشتار الزامی است.', 'error');
      return;
    }
    if (!flockId) {
      ui.toast('انتخاب گله الزامی است.', 'error');
      return;
    }
    if (dispatchB <= 0) {
      ui.toast('تعداد پرنده ارسالی باید بزرگتر از صفر باشد.', 'error');
      return;
    }
    if (originW <= 0) {
      ui.toast('وزن کل در مبدا الزامی است.', 'error');
      return;
    }

    // ۱. ثبت یا به‌روزرسانی بچ کشتار
    actions.saveSlaughterBatch({
      id: batch?.id,
      code: code.trim(),
      date,
      flockId,
      hallId: hallId || undefined,
      driverName: driverName.trim() || undefined,
      truckPlate: truckPlate.trim() || undefined,
      shippingDocNo: shippingDocNo.trim() || undefined,
      dispatchBirds: dispatchB,
      originWeightKg: originW,
      destWeightKg: destW || originW,
      doaCount: doa,
      transportShrinkKg,
      transportShrinkPct: Math.round(transportShrinkPct * 100) / 100,
      slaughterBirds,
      carcassWeightKg: carcassW,
      dressingYieldPct: Math.round(dressingYieldPct * 100) / 100,
      slaughterFeePerBird: num(slaughterFeePerBird),
      transportCost: num(transportCost),
      packagingCost: num(packagingCost),
      totalLiveCost: estimatedLiveCost,
      totalSlaughterCost: grandTotalCost,
      cuts: allocatedCuts,
      targetWarehouseId: targetWarehouseId || undefined,
      stockUpdated,
      notes: notes.trim() || undefined,
    });

    // ۲. ثبت خودکار هزینه‌های کشتار و بارگیری در صورت تمایل کاربر
    if (recordExpenses && totalProcessingCosts > 0) {
      actions.add('expenses', {
        date,
        flockId,
        category: 'کشتار و فرآوری',
        amount: totalProcessingCosts,
        sub: 'حق‌العمل و لجستیک',
        title: `هزینه‌های کشتارگاه و بارگیری سری ${code}`,
        qty: 1,
        unit: 'سرویس',
        vendor: driverName || 'کشتارگاه',
        paidBy: 'fund',
        split: 'share',
        note: `کرایه: ${money(num(transportCost))} + حق‌العمل: ${money(totalSlaughterFee)} + بسته‌بندی: ${money(num(packagingCost))}`,
      });
    }

    ui.toast(batch ? 'بچ کشتار با موفقیت ویرایش شد.' : 'عملیات کشتارگاه و قطعه‌بندی با موفقیت ثبت شد.', 'ok');
    onClose();
  };

  return (
    <Modal
      title={batch ? `ویرایش بچ کشتارگاه — ${batch.code}` : 'ثبت عملیات کشتارگاه و قطعه‌بندی صنعتی'}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-5 text-sm" dir="rtl">
        {/* ۱. مشخصات عمومی و حمل و نقل */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="truck" className="w-5 h-5" />
            <span>مشخصات اعزام، گله و بارنامه</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">کد سری / بچ کشتار *</label>
              <input
                className="input text-left"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SL-1403-01"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تاریخ اعزام / کشتار *</label>
              <input
                className="input text-center"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">گله مبدا *</label>
              <select
                className="select"
                value={flockId}
                onChange={(e) => setFlockId(e.target.value)}
              >
                {state.flocks.map((f: Flock) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.breed || 'نامشخص'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">سالن مبدا (اختیاری)</label>
              <select
                className="select"
                value={hallId}
                onChange={(e) => setHallId(e.target.value)}
              >
                <option value="">همه سالن‌ها / کل گله</option>
                {state.halls.map((h: Hall) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">نام راننده خودرو حمل</label>
              <input
                className="input"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="مثلاً علی رضایی"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">شماره پلاک خودرو</label>
              <input
                className="input text-left"
                value={truckPlate}
                onChange={(e) => setTruckPlate(e.target.value)}
                placeholder="مثلاً ایران ۲۳ - ۶۱۴ ب ۷۲"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">شماره بارنامه / گواهی قرنطینه</label>
              <input
                className="input text-left"
                value={shippingDocNo}
                onChange={(e) => setShippingDocNo(e.target.value)}
                placeholder="شماره رهگیری دامپزشکی"
              />
            </div>
          </div>
        </div>

        {/* ۲. سنجش وزن، افت بار حمل و تلفات مسیر (DOA) */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="scale" className="w-5 h-5" />
            <span>توزین مبدا و مقصد، افت بار حمل و تلفات مسیر (DOA)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تعداد پرنده ارسالی (قطعه) *</label>
              <input
                type="number"
                className="input font-mono"
                value={dispatchBirds}
                onChange={(e) => setDispatchBirds(e.target.value)}
                placeholder="مثلاً ۱۲۰۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">وزن کل مبدا (باسکول مزرعه - کیلوگرم) *</label>
              <input
                type="number"
                className="input font-mono"
                value={originWeightKg}
                onChange={(e) => setOriginWeightKg(e.target.value)}
                placeholder="مثلاً ۱۰۲۵۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">وزن کل مقصد (باسکول کشتارگاه - کیلوگرم)</label>
              <input
                type="number"
                className="input font-mono"
                value={destWeightKg}
                onChange={(e) => setDestWeightKg(e.target.value)}
                placeholder="مثلاً ۹۹۸۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تلفات مسیر / DOA (قطعه)</label>
              <input
                type="number"
                className="input font-mono text-danger"
                value={doaCount}
                onChange={(e) => setDoaCount(e.target.value)}
                placeholder="۰"
              />
            </div>
          </div>

          {/* کارت خلاصه شاخص‌های بارگیری و افت بار */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 bg-muted/10 p-3 rounded-lg border border-border/60">
            <div>
              <span className="block text-xs text-muted">افت بار حین حمل:</span>
              <span className="font-bold text-danger">
                {n(transportShrinkKg)} کیلوگرم ({pct(transportShrinkPct)})
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted">میانگین وزن مبدا:</span>
              <span className="font-bold text-foreground">
                {dispatchB > 0 ? (originW / dispatchB).toFixed(2) : '۰'} کیلوگرم
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted">میانگین وزن مقصد:</span>
              <span className="font-bold text-foreground">
                {dispatchB > 0 && destW > 0 ? (destW / dispatchB).toFixed(2) : '۰'} کیلوگرم
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted">تعداد کشتارشده خالص:</span>
              <span className="font-bold text-ok">{n(slaughterBirds)} قطعه</span>
            </div>
          </div>
        </div>

        {/* ۳. راندمان لاشه و هزینه‌های فرآوری */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="tag" className="w-5 h-5" />
            <span>استحصال لاشه، راندمان کشتار و هزینه‌ها</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">وزن کل لاشه خنک‌شده (کیلوگرم)</label>
              <input
                type="number"
                className="input font-mono font-bold text-accent"
                value={carcassWeightKg}
                onChange={(e) => setCarcassWeightKg(e.target.value)}
                placeholder="مثلاً ۸۲۵۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">راندمان لاشه (Dressing %)</label>
              <div className="h-10 px-3 flex items-center bg-muted/20 border border-border rounded-lg font-bold text-foreground">
                {pct(dressingYieldPct)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">حق‌العمل کشتارگاه (تومان/قطعه)</label>
              <input
                type="number"
                className="input font-mono"
                value={slaughterFeePerBird}
                onChange={(e) => setSlaughterFeePerBird(e.target.value)}
                placeholder="۱۵۰۰۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">کرایه حمل و بارگیری (تومان)</label>
              <input
                type="number"
                className="input font-mono"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                placeholder="مثلاً ۶۵۰۰۰۰۰"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">هزینه بسته‌بندی و فرآوری (تومان)</label>
              <input
                type="number"
                className="input font-mono"
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
                placeholder="مثلاً ۳۲۰۰۰۰۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">بهای پرنده زنده ارسالی (تومان)</label>
              <input
                type="number"
                className="input font-mono"
                value={customLiveCost !== '' ? customLiveCost : estimatedLiveCost}
                onChange={(e) => setCustomLiveCost(e.target.value)}
                placeholder="محاسبه خودکار از گله"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">جمع بهای تمام‌شده کل (تومان)</label>
              <div className="h-10 px-3 flex items-center bg-accent/10 border border-accent/30 rounded-lg font-bold text-accent">
                {money(grandTotalCost)} تومان
              </div>
            </div>
          </div>
        </div>

        {/* ۴. قطعه‌بندی صنعتی و تسهیم بهای تمام‌شده فرآورده‌ها */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-accent">
              <Icon name="list" className="w-5 h-5" />
              <span>قطعه‌بندی صنعتی و تسهیم بهای تمام‌شده (ارزش نسبی فروش)</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline text-xs"
              onClick={applyStandardCutsYield}
            >
              <Icon name="sparkles" className="w-4 h-4 text-accent" />
              محاسبه خودکار اوزان با راندمان استاندارد
            </button>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/30 border-b border-border text-muted">
                <tr>
                  <th className="p-2.5">نام فرآورده / برش</th>
                  <th className="p-2.5 w-28">وزن (کیلوگرم)</th>
                  <th className="p-2.5 w-32">نرخ روز بازار (تومان/kg)</th>
                  <th className="p-2.5 w-32">بهای تمام‌شده هر کیلو</th>
                  <th className="p-2.5 w-36">بهای تمام‌شده کل</th>
                  <th className="p-2.5 w-12 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allocatedCuts.map((cut, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="p-2">
                      <input
                        className="input input-sm"
                        value={cut.name}
                        onChange={(e) => handleCutChange(idx, 'name', e.target.value)}
                        placeholder="نام قطعه..."
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.1"
                        className="input input-sm font-mono"
                        value={cut.weightKg || ''}
                        onChange={(e) => handleCutChange(idx, 'weightKg', e.target.value)}
                        placeholder="۰"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="input input-sm font-mono"
                        value={cut.marketPricePerKg || ''}
                        onChange={(e) => handleCutChange(idx, 'marketPricePerKg', e.target.value)}
                        placeholder="۰"
                      />
                    </td>
                    <td className="p-2 font-mono font-semibold text-foreground">
                      {money(cut.costPerKg || 0)}
                    </td>
                    <td className="p-2 font-mono font-bold text-accent">
                      {money(cut.totalCost || 0)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-danger"
                        onClick={() => removeCutRow(idx)}
                      >
                        <Icon name="x" className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20 border-t border-border font-bold">
                <tr>
                  <td className="p-2.5 text-foreground">جمع کل قطعات:</td>
                  <td className="p-2.5 font-mono text-accent">{n(totalCutsWeight)} kg</td>
                  <td className="p-2.5 text-muted">
                    {cutWeightDiff !== 0 && (
                      <span className={cutWeightDiff > 0 ? 'text-danger' : 'text-ok'}>
                        {cutWeightDiff > 0 ? `افت قطعه: ${n(cutWeightDiff)} kg (${pct(cutLossPct)})` : `اضافه: ${n(-cutWeightDiff)} kg`}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-muted">تطبیق تسهیم:</td>
                  <td className="p-2.5 font-mono text-accent">
                    {money(allocatedCuts.reduce((s, c) => s + (c.totalCost || 0), 0))} تومان
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

            <button
              type="button"
              className="btn btn-xs btn-outline w-full py-1 text-muted"
              onClick={addCutRow}
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              افزودن سطر قطعه جدید
            </button>
        </div>

        {/* ۵. انبارش و ثبت مالی */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="building" className="w-5 h-5" />
            <span>رسید انبار سردخانه و اسناد مالی</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/10">
              <input
                type="checkbox"
                className="checkbox mt-0.5"
                checked={stockUpdated}
                onChange={(e) => setStockUpdated(e.target.checked)}
              />
              <div className="text-xs">
                <span className="font-semibold block text-foreground">افزایش موجودی سردخانه / انبار با قطعات لاشه</span>
                <span className="text-muted">موجودی اوزان قطعات در کاردکس انبار و سردخانه شارژ می‌گردد.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/10">
              <input
                type="checkbox"
                className="checkbox mt-0.5"
                checked={recordExpenses}
                onChange={(e) => setRecordExpenses(e.target.checked)}
              />
              <div className="text-xs">
                <span className="font-semibold block text-foreground">ثبت هزینه‌های کشتار و بارگیری در سیستم هزینه</span>
                <span className="text-muted">مبلغ {money(totalProcessingCosts)} تومان به عنوان هزینه در دوره گله ثبت می‌شود.</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">انبار / سردخانه مقصد جهت تحویل گوشت</label>
              <select
                className="select"
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
              >
                {state.warehouses.map((w: Warehouse) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type === 'cold_storage' ? 'سردخانه' : w.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">توضیحات و یادداشت</label>
              <input
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="شماره پلمپ، نام ناظر دامپزشکی، شرایط چیلر..."
              />
            </div>
          </div>
        </div>

        {/* دکمه‌های اقدام */}
        <div className="flex items-center justify-between pt-2">
          {batch ? (
            <button
              type="button"
              className="btn btn-outline text-danger"
              onClick={() => {
                if (confirm('آیا از حذف این بچ کشتارگاه اطمینان دارید؟')) {
                  actions.removeSlaughterBatch(batch.id);
                  ui.toast('بچ کشتار با موفقیت حذف شد.', 'ok');
                  onClose();
                }
              }}
            >
              حذف این بچ
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              انصراف
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              {batch ? 'ذخیره تغییرات' : 'ثبت عملیات کشتار و قطعه‌بندی'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
