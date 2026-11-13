/**
 * فرم ثبت و مدیریت پارت‌های بازرگانی گوشت منجمد، ردیابی سری ساخت و FEFO
 */
import { useMemo, useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { actions, getLotFefoStatus, num, useApp } from '../data/store';
import { today } from '../lib/jalali';
import { money, n } from '../lib/format';
import type { TradeLot, Warehouse } from '../data/types';

const COMMON_MEAT_PRODUCTS = [
  'بوقلمون کامل منجمد',
  'سینه بی‌استخوان منجمد',
  'فیله بوقلمون منجمد',
  'ران بوقلمون منجمد',
  'ساق بوقلمون منجمد',
  'بال و بازو منجمد',
  'گردن بوقلمون منجمد',
  'دل و جگر منجمد',
  'اسکلت و آلایش منجمد',
];

export function TradeLotForm({
  lot,
  onClose,
}: {
  lot?: TradeLot;
  onClose: () => void;
}) {
  const state = useApp();
  const ui = useUI();

  const [code, setCode] = useState(
    lot?.code || `LOT-${today().replace(/\//g, '').slice(2)}-${state.tradeLots.length + 1}`,
  );
  const [productName, setProductName] = useState(lot?.productName || COMMON_MEAT_PRODUCTS[0]);
  const [supplierName, setSupplierName] = useState(lot?.supplierName || '');
  const [entryDate, setEntryDate] = useState(lot?.entryDate || today());
  const [productionDate, setProductionDate] = useState(lot?.productionDate || today());
  const [expiryDate, setExpiryDate] = useState(lot?.expiryDate || '');
  
  const coldWarehouses = useMemo(
    () => state.warehouses.filter((w: Warehouse) => w.type === 'cold_storage' || w.type === 'finished_goods' || w.type === 'other'),
    [state.warehouses],
  );
  const [warehouseId, setWarehouseId] = useState(lot?.warehouseId || coldWarehouses[0]?.id || '');
  const [temperatureC, setTemperatureC] = useState(String(lot?.temperatureC ?? -18));
  
  const [initialWeightKg, setInitialWeightKg] = useState(String(lot?.initialWeightKg ?? ''));
  const [buyPricePerKg, setBuyPricePerKg] = useState(String(lot?.buyPricePerKg ?? ''));
  const [transportCost, setTransportCost] = useState(String(lot?.transportCost ?? ''));
  const [storageCost, setStorageCost] = useState(String(lot?.storageCost ?? ''));
  const [packagingCost, setPackagingCost] = useState(String(lot?.packagingCost ?? ''));
  const [stockUpdated, setStockUpdated] = useState(lot?.stockUpdated ?? true);
  const [notes, setNotes] = useState(lot?.notes || '');

  // محاسبات مالی زنده
  const initialW = num(initialWeightKg);
  const buyP = num(buyPricePerKg);
  const transC = num(transportCost);
  const storC = num(storageCost);
  const packC = num(packagingCost);

  const buyTotal = initialW * buyP;
  const extraCostsTotal = transC + storC + packC;
  const grandTotalCost = buyTotal + extraCostsTotal;
  const effectiveCostPerKg = initialW > 0 ? Math.round(grandTotalCost / initialW) : buyP;

  // وضعیت FEFO
  const fefo = useMemo(() => getLotFefoStatus(expiryDate), [expiryDate]);

  const handleSave = () => {
    if (!code.trim()) {
      ui.toast('کد پارت بازرگانی الزامی است.', 'error');
      return;
    }
    if (!productName.trim()) {
      ui.toast('نام فرآورده الزامی است.', 'error');
      return;
    }
    if (initialW <= 0) {
      ui.toast('وزن اولیه باید بزرگتر از صفر باشد.', 'error');
      return;
    }
    if (buyP <= 0) {
      ui.toast('قیمت خرید هر کیلوگرم الزامی است.', 'error');
      return;
    }
    if (!expiryDate.trim()) {
      ui.toast('تاریخ انقضا جهت اعمال الگوریتم FEFO الزامی است.', 'error');
      return;
    }

    actions.saveTradeLot({
      id: lot?.id,
      code: code.trim(),
      productName: productName.trim(),
      supplierName: supplierName.trim() || undefined,
      entryDate,
      productionDate: productionDate || undefined,
      expiryDate,
      warehouseId: warehouseId || undefined,
      temperatureC: num(temperatureC) || -18,
      initialWeightKg: initialW,
      soldWeightKg: lot ? num(lot.soldWeightKg) : 0,
      buyPricePerKg: buyP,
      transportCost: transC,
      storageCost: storC,
      packagingCost: packC,
      effectiveCostPerKg,
      avgSellPricePerKg: lot?.avgSellPricePerKg || 0,
      sales: lot?.sales || [],
      status: lot?.status || 'active',
      stockUpdated,
      notes: notes.trim() || undefined,
    });

    ui.toast(lot ? 'پارت بازرگانی با موفقیت ویرایش شد.' : 'پارت بازرگانی گوشت منجمد ثبت شد.', 'ok');
    onClose();
  };

  return (
    <Modal
      title={lot ? `ویرایش پارت بازرگانی — ${lot.code}` : 'تعریف پارت بازرگانی گوشت منجمد و ردیابی سری ساخت'}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4 text-sm" dir="rtl">
        {/* ۱. هویت پارت و زنجیره سرد */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="tag" className="w-5 h-5" />
            <span>مشخصات سری ساخت، فرآورده و زنجیره سرد</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">کد پارت / سری ساخت *</label>
              <input
                className="input text-left"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="LOT-1403-01"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">نام فرآورده / برش گوشت *</label>
              <input
                className="input"
                list="meat-products-list"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="مثلاً سینه بی‌استخوان منجمد"
              />
              <datalist id="meat-products-list">
                {COMMON_MEAT_PRODUCTS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تامین‌کننده / کشتارگاه مبدا</label>
              <input
                className="input"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="مثلاً کشتارگاه مرکزی یا تولید فارم"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تاریخ تولید / انجماد</label>
              <input
                className="input text-center"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تاریخ ورود به سردخانه *</label>
              <input
                className="input text-center"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تاریخ انقضا (مبنای FEFO) *</label>
              <input
                className="input text-center font-bold text-accent"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="۱۴۰۴/۰۸/۲۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">دمای نگهداری (°C)</label>
              <input
                type="number"
                className="input text-left font-mono"
                value={temperatureC}
                onChange={(e) => setTemperatureC(e.target.value)}
                placeholder="-18"
              />
            </div>
          </div>

          {/* پیش‌نمایش FEFO */}
          {expiryDate && (
            <div className="flex items-center justify-between p-2.5 bg-muted/15 rounded-lg border border-border/70 text-xs">
              <span className="text-muted">وضعیت نگهداری و اولویت خروج بر اساس انقضا (FEFO):</span>
              <span className={`badge ${fefo.badgeClass} font-bold`}>{fefo.label}</span>
            </div>
          )}
        </div>

        {/* ۲. اوزان، قیمت خرید و هزینه‌های جانبی پارت */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="scale" className="w-5 h-5" />
            <span>تناژ، قیمت خرید و بهای تمام‌شده موثر</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">وزن کل ورودی پارت (کیلوگرم) *</label>
              <input
                type="number"
                className="input font-mono font-bold"
                value={initialWeightKg}
                onChange={(e) => setInitialWeightKg(e.target.value)}
                placeholder="مثلاً ۵۰۰۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">قیمت خرید خام (تومان/کیلوگرم) *</label>
              <input
                type="number"
                className="input font-mono font-bold text-accent"
                value={buyPricePerKg}
                onChange={(e) => setBuyPricePerKg(e.target.value)}
                placeholder="مثلاً ۲۶۰۰۰۰"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">کرایه حمل یخچالدار (تومان)</label>
              <input
                type="number"
                className="input font-mono"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                placeholder="مثلاً ۳۵۰۰۰۰۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">هزینه انبارداری و سردخانه (تومان)</label>
              <input
                type="number"
                className="input font-mono"
                value={storageCost}
                onChange={(e) => setStorageCost(e.target.value)}
                placeholder="مثلاً ۱۸۰۰۰۰۰"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">هزینه بسته‌بندی، سلفون، کارتن (تومان)</label>
              <input
                type="number"
                className="input font-mono"
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
                placeholder="مثلاً ۲۲۰۰۰۰۰"
              />
            </div>
          </div>

          {/* کارت محاسبات بهای تمام‌شده مؤثر */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 bg-muted/15 p-3 rounded-lg border border-border/70 text-xs">
            <div>
              <span className="block text-muted">مبلغ کل خرید خام:</span>
              <span className="font-bold text-foreground font-mono">{money(buyTotal)} تومان</span>
            </div>
            <div>
              <span className="block text-muted">مجموع هزینه‌های جانبی:</span>
              <span className="font-bold text-foreground font-mono">{money(extraCostsTotal)} تومان</span>
            </div>
            <div>
              <span className="block text-muted">بهای تمام‌شده کل پارت:</span>
              <span className="font-bold text-accent font-mono">{money(grandTotalCost)} تومان</span>
            </div>
            <div>
              <span className="block text-muted">بهای مؤثر هر کیلوگرم:</span>
              <span className="font-bold text-ok font-mono text-sm">{money(effectiveCostPerKg)} تومان</span>
            </div>
          </div>
        </div>

        {/* ۳. مکان انبارش و کنترل موجودی */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="building" className="w-5 h-5" />
            <span>انبار سردخانه و کنترل موجودی</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">سردخانه نگهداری</label>
              <select
                className="select"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {state.warehouses.map((w: Warehouse) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type === 'cold_storage' ? 'سردخانه' : w.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">توضیحات و مشخصات پالت</label>
              <input
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="شماره پلمپ کانتینر، شماره پالت در سالن منفی ۱۸..."
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/10">
            <input
              type="checkbox"
              className="checkbox mt-0.5"
              checked={stockUpdated}
              onChange={(e) => setStockUpdated(e.target.checked)}
            />
            <div className="text-xs">
              <span className="font-semibold block text-foreground">ثبت در کاردکس انبار و افزایش موجودی سردخانه</span>
              <span className="text-muted">موجودی به وزن {n(initialW)} کیلوگرم با عنوان «{productName}» در سردخانه ثبت می‌شود.</span>
            </div>
          </label>
        </div>

        {/* دکمه‌های اقدام */}
        <div className="flex items-center justify-between pt-2">
          {lot ? (
            <button
              type="button"
              className="btn btn-outline text-danger"
              onClick={() => {
                if (confirm('آیا از حذف این پارت بازرگانی اطمینان دارید؟ موجودی سردخانه اصلاح خواهد شد.')) {
                  actions.removeTradeLot(lot.id);
                  ui.toast('پارت بازرگانی با موفقیت حذف شد.', 'ok');
                  onClose();
                }
              }}
            >
              حذف پارت
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              انصراف
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              {lot ? 'ذخیره تغییرات' : 'ثبت پارت بازرگانی'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * فرم ثبت فروش از پارت بازرگانی (کسر از پارت بر اساس FEFO)
 */
export function LotSaleForm({
  lot,
  onClose,
}: {
  lot: TradeLot;
  onClose: () => void;
}) {
  const ui = useUI();
  const remainingKg = Math.max(0, num(lot.initialWeightKg) - num(lot.soldWeightKg));

  const [date, setDate] = useState(today());
  const [qtyKg, setQtyKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');

  const saleKg = num(qtyKg);
  const priceP = num(pricePerKg);
  const totalRevenue = saleKg * priceP;
  const cogs = Math.round(saleKg * num(lot.effectiveCostPerKg));
  const grossProfit = totalRevenue - cogs;
  const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const handleSale = () => {
    if (saleKg <= 0) {
      ui.toast('وزن فروش باید بزرگتر از صفر باشد.', 'error');
      return;
    }
    if (saleKg > remainingKg) {
      ui.toast(`وزن فروش نمی‌تواند بیشتر از موجودی باقیمانده (${n(remainingKg)} kg) باشد.`, 'error');
      return;
    }
    if (priceP <= 0) {
      ui.toast('نرخ فروش هر کیلوگرم الزامی است.', 'error');
      return;
    }

    actions.recordLotSale(lot.id, {
      date,
      qtyKg: saleKg,
      pricePerKg: priceP,
      buyerName: buyerName.trim() || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    ui.toast(`فروش به مقدار ${n(saleKg)} کیلوگرم از پارت ${lot.code} ثبت شد.`, 'ok');
    onClose();
  };

  return (
    <Modal
      title={`ثبت خروج و فروش از پارت ${lot.code} — ${lot.productName}`}
      onClose={onClose}
      size="md"
    >
      <div className="space-y-4 text-sm" dir="rtl">
        {/* اطلاعات پارت جاری */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted">موجودی باقیمانده در سردخانه:</span>
            <span className="font-bold text-accent text-sm font-mono">{n(remainingKg)} کیلوگرم</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">بهای تمام‌شده مؤثر هر کیلوگرم:</span>
            <span className="font-mono text-foreground">{money(lot.effectiveCostPerKg)} تومان</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">تاریخ انقضا (FEFO):</span>
            <span className="font-mono text-muted">{lot.expiryDate || '—'}</span>
          </div>
        </div>

        {/* فیلدهای فروش */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">تاریخ فروش *</label>
            <input
              className="input text-center"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">وزن فروش (کیلوگرم) *</label>
            <input
              type="number"
              className="input font-mono font-bold"
              value={qtyKg}
              onChange={(e) => setQtyKg(e.target.value)}
              placeholder={`حداکثر ${remainingKg}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">نرخ فروش هر کیلو (تومان) *</label>
            <input
              type="number"
              className="input font-mono font-bold text-accent"
              value={pricePerKg}
              onChange={(e) => setPricePerKg(e.target.value)}
              placeholder="مثلاً ۲۹۵۰۰۰"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">نام خریدار / مشتری</label>
            <input
              className="input"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="مثلاً هایپرمارکت افق یا آقای علوی"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">شماره فاکتور / حواله</label>
            <input
              className="input text-left"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="INV-1025"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">یادداشت</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="نحوه تسویه، شماره خودرو حمل..."
            />
          </div>
        </div>

        {/* شاخص سود فروش */}
        {saleKg > 0 && priceP > 0 && (
          <div className="rounded-xl p-3 bg-muted/20 border border-border space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted">مبلغ کل فاکتور فروش:</span>
              <span className="font-bold text-foreground">{money(totalRevenue)} تومان</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">بهای تمام‌شده کالای فروش‌رفته (COGS):</span>
              <span className="text-muted">{money(cogs)} تومان</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1">
              <span className="font-bold text-foreground">سود ناخالص فروش:</span>
              <span className={`font-bold ${grossProfit >= 0 ? 'text-ok' : 'text-danger'}`}>
                {money(grossProfit)} تومان ({marginPct.toFixed(1)}% حاشیه سود)
              </span>
            </div>
          </div>
        )}

        {/* دکمه‌های اقدام */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            انصراف
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSale}>
            ثبت فروش و کسر از پارت
          </button>
        </div>
      </div>
    </Modal>
  );
}
