/**
 * فرم‌های فاز ۲: سالن‌ها، انبارهای چندگانه، و واحدهای مشارکت / قراردادها
 */
import { useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { actions, num, useApp } from '../data/store';
import { today } from '../lib/jalali';
import { money, n } from '../lib/format';
import type {
  Hall,
  HallStatus,
  PartnershipScope,
  PartnershipUnit,
  PartnershipUnitStatus,
  Warehouse,
  WarehouseType,
} from '../data/types';

/* -------------------------------------------------------------------------- */
/*                                فرم سالن‌ها                                 */
/* -------------------------------------------------------------------------- */
export function HallForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.halls.find((h) => h.id === id) : null;

  const [code, setCode] = useState(editing?.code || `H-${String(s.halls.length + 1).padStart(2, '0')}`);
  const [name, setName] = useState(editing?.name || `سالن شماره ${s.halls.length + 1}`);
  const [farmName, setFarmName] = useState(editing?.farmName || s.settings.farmName || 'فارم مرکزی');
  const [lengthM, setLengthM] = useState(editing?.lengthM ? String(editing.lengthM) : '80');
  const [widthM, setWidthM] = useState(editing?.widthM ? String(editing.widthM) : '14');
  const [areaM2, setAreaM2] = useState(editing?.areaM2 ? String(editing.areaM2) : '1120');
  const [capacity, setCapacity] = useState(editing?.capacity ? String(editing.capacity) : '5500');
  const [ventilationType, setVentilationType] = useState(editing?.ventilationType || 'تونلی مکشی');
  const [heatingType, setHeatingType] = useState(editing?.heatingType || 'جت‌هیتر دوگانه‌سوز');
  const [coolingType, setCoolingType] = useState(editing?.coolingType || 'پد سلولزی');
  const [status, setStatus] = useState<HallStatus>(editing?.status || 'empty');
  const [lastDisinfectionDate, setLastDisinfectionDate] = useState(editing?.lastDisinfectionDate || today());
  const [readyDate, setReadyDate] = useState(editing?.readyDate || today());
  const [notes, setNotes] = useState(editing?.notes || '');

  // محاسبه خودکار مساحت و پیشنهاد ظرفیت اسمی بر مبنای تراکم استاندارد (حدود ۵ پرنده در هر متر مربع)
  const onDimChange = (l: string, w: string) => {
    setLengthM(l);
    setWidthM(w);
    const area = num(l) * num(w);
    if (area > 0) {
      setAreaM2(String(area));
      setCapacity(String(Math.round(area * 4.8)));
    }
  };

  const save = () => {
    if (!name.trim()) {
      toast('نام سالن الزامی است', 'error');
      return;
    }
    const payload: Omit<Hall, 'id' | 'createdAt'> = {
      code: code.trim(),
      name: name.trim(),
      farmName: farmName.trim(),
      lengthM: num(lengthM),
      widthM: num(widthM),
      areaM2: num(areaM2) || num(lengthM) * num(widthM),
      capacity: num(capacity),
      ventilationType: ventilationType.trim(),
      heatingType: heatingType.trim(),
      coolingType: coolingType.trim(),
      status,
      lastDisinfectionDate,
      readyDate,
      notes: notes.trim(),
    };

    if (editing) {
      actions.update('halls', editing.id, payload);
      toast('مشخصات سالن با موفقیت به‌روزرسانی شد');
    } else {
      actions.add('halls', payload);
      toast('سالن جدید با موفقیت به فارم اضافه شد');
    }
    onClose();
  };

  return (
    <Modal
      title={editing ? `ویرایش سالن — ${editing.name}` : 'تعریف سالن جدید فارم'}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            ذخیره سالن
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field half">
          <label className="lbl">کد سالن</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثلاً H-01" />
        </div>
        <div className="field half">
          <label className="lbl">نام سالن *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً سالن ۱ پرورشی" />
        </div>

        <div className="field half">
          <label className="lbl">نام فارم / واحد پرورشی</label>
          <input className="input" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
        </div>
        <div className="field half">
          <label className="lbl">وضعیت جاری سالن</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as HallStatus)}>
            <option value="active">در حال بهره‌برداری (دارای گله فعال)</option>
            <option value="empty">خالی و آماده جوجه‌ریزی</option>
            <option value="disinfecting">در حال شستشو، شعله‌افکنی و ضدعفونی</option>
            <option value="maintenance">تحت تعمیرات و بازسازی</option>
          </select>
        </div>

        <div className="field third">
          <label className="lbl">طول (متر)</label>
          <input
            className="input"
            type="number"
            value={lengthM}
            onChange={(e) => onDimChange(e.target.value, widthM)}
          />
        </div>
        <div className="field third">
          <label className="lbl">عرض (متر)</label>
          <input
            className="input"
            type="number"
            value={widthM}
            onChange={(e) => onDimChange(lengthM, e.target.value)}
          />
        </div>
        <div className="field third">
          <label className="lbl">مساحت مفید (مترمربع)</label>
          <input
            className="input"
            type="number"
            value={areaM2}
            onChange={(e) => setAreaM2(e.target.value)}
          />
        </div>

        <div className="field half">
          <label className="lbl">ظرفیت اسمی پرورشی (قطعه بوقلمون)</label>
          <input
            className="input"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="مثلاً ۵۰۰۰"
          />
        </div>
        <div className="field half">
          <label className="lbl">سیستم تهویه</label>
          <input
            className="input"
            value={ventilationType}
            onChange={(e) => setVentilationType(e.target.value)}
            placeholder="تونلی مکشی، طولی، پادگان و..."
          />
        </div>

        <div className="field half">
          <label className="lbl">سیستم گرمایشی</label>
          <input
            className="input"
            value={heatingType}
            onChange={(e) => setHeatingType(e.target.value)}
            placeholder="جت‌هیتر دوگانه‌سوز، کوره هوای گرم، تابشی"
          />
        </div>
        <div className="field half">
          <label className="lbl">سیستم سرمایشی</label>
          <input
            className="input"
            value={coolingType}
            onChange={(e) => setCoolingType(e.target.value)}
            placeholder="پد سلولزی، مه‌پاش نازلی"
          />
        </div>

        <div className="field half">
          <label className="lbl">تاریخ آخرین ضدعفونی</label>
          <input
            className="input"
            value={lastDisinfectionDate}
            onChange={(e) => setLastDisinfectionDate(e.target.value)}
            placeholder="۱۴۰۵/۰۱/۱۰"
          />
        </div>
        <div className="field half">
          <label className="lbl">تاریخ آمادگی جهت جوجه‌ریزی</label>
          <input
            className="input"
            value={readyDate}
            onChange={(e) => setReadyDate(e.target.value)}
            placeholder="۱۴۰۵/۰۱/۱۵"
          />
        </div>

        <div className="field full">
          <label className="lbl">مشخصات فنی و یادداشت‌ها</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="تعداد خطوط دانخوری بشقابی و آبخوری نیپل، اتوماسیون روشنایی و دما..."
          />
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                                فرم انبارها                                 */
/* -------------------------------------------------------------------------- */
export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, { label: string; icon: string }> = {
  raw_feed: { label: 'انبار مواد اولیه خوراک (ذرت، سویا، کنجاله)', icon: '🌾' },
  factory_pellet: { label: 'انبار دان پلت کارخانه (آماده)', icon: '📦' },
  farm_feed: { label: 'انبار خوراک ترکیبی مزرعه (آسیاب‌میکسر)', icon: '⚙️' },
  hall_sub: { label: 'انبارک فرعی سالن (سیلو / اتاق دان سالن)', icon: '🛖' },
  medicine_vaccine: { label: 'انبار دارو، واکسن و مکمل (زنجیره سرد)', icon: '💉' },
  cold_storage: { label: 'سردخانه گوشت منجمد و لاشه', icon: '❄️' },
  finished_goods: { label: 'انبار محصولات فرآوری‌شده و قطعات لاشه', icon: '🍗' },
  equipment: { label: 'انبار ملزومات، پوشال و قطعات', icon: '🔧' },
  waste: { label: 'انبار ضایعات و دورریز', icon: '🗑️' },
  other: { label: 'سایر انبارها', icon: '🏬' },
};

export function WarehouseForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.warehouses.find((w) => w.id === id) : null;

  const [code, setCode] = useState(editing?.code || `WH-${String(s.warehouses.length + 1).padStart(2, '0')}`);
  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState<WarehouseType>(editing?.type || 'raw_feed');
  const [hallId, setHallId] = useState(editing?.hallId || '');
  const [manager, setManager] = useState(editing?.manager || s.settings.owner || 'انباردار مزرعه');
  const [temperature, setTemperature] = useState(editing?.temperature != null ? String(editing.temperature) : '');
  const [active, setActive] = useState(editing?.active !== false);
  const [notes, setNotes] = useState(editing?.notes || '');

  const save = () => {
    if (!name.trim()) {
      toast('نام انبار الزامی است', 'error');
      return;
    }
    const payload: Omit<Warehouse, 'id' | 'createdAt'> = {
      code: code.trim(),
      name: name.trim(),
      type,
      hallId: type === 'hall_sub' ? hallId : undefined,
      manager: manager.trim(),
      temperature: temperature !== '' ? num(temperature) : undefined,
      active,
      notes: notes.trim(),
    };

    if (editing) {
      actions.update('warehouses', editing.id, payload);
      toast('اطلاعات انبار به‌روزرسانی شد');
    } else {
      actions.add('warehouses', payload);
      toast('انبار جدید با موفقیت ثبت شد');
    }
    onClose();
  };

  return (
    <Modal
      title={editing ? `ویرایش انبار — ${editing.name}` : 'تعریف انبار جدید در فارم'}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            ذخیره انبار
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field half">
          <label className="lbl">کد انبار</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثلاً WH-RAW" />
        </div>
        <div className="field half">
          <label className="lbl">نام انبار *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً انبار دان اولیه" />
        </div>

        <div className="field full">
          <label className="lbl">نوع و کاربری انبار</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as WarehouseType)}>
            {Object.entries(WAREHOUSE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
        </div>

        {type === 'hall_sub' && (
          <div className="field full">
            <label className="lbl">اتصال به سالن پرورشی</label>
            <select className="input" value={hallId} onChange={(e) => setHallId(e.target.value)}>
              <option value="">انتخاب سالن...</option>
              {s.halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field half">
          <label className="lbl">انباردار / مسئول تحویل</label>
          <input className="input" value={manager} onChange={(e) => setManager(e.target.value)} />
        </div>
        <div className="field half">
          <label className="lbl">دمای نگهداری (درجه سانتی‌گراد)</label>
          <input
            className="input"
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="مثلاً ۱۸- برای سردخانه یا ۴ برای واکسن"
          />
        </div>

        <div className="field full">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>انبار فعال است و گردش کالا می‌پذیرد</span>
          </label>
        </div>

        <div className="field full">
          <label className="lbl">توضیحات و مشخصات موقعیت مکانی</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="آدرس دقیق داخل محوطه، مشخصات سوله یا سردخانه..."
          />
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                     فرم واحدهای مشارکت و قراردادها                         */
/* -------------------------------------------------------------------------- */
export const PARTNERSHIP_SCOPE_LABELS: Record<PartnershipScope, { label: string; icon: string }> = {
  flock: { label: 'مشارکت در دوره پرورش گله مشخص', icon: '🦃' },
  hall: { label: 'مشارکت در ظرفیت یک سالن پرورشی', icon: '🛖' },
  trading: { label: 'مشارکت در پارت تجاری / بازرگانی آزاد (گوشت، جوجه، دان)', icon: '💼' },
  general: { label: 'مشارکت عمومی در کل مزرعه و عملیات فارم', icon: '🏢' },
};

export function PartnershipUnitForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.partnershipUnits.find((u) => u.id === id) : null;

  const [code, setCode] = useState(editing?.code || `PU-${String(s.partnershipUnits.length + 1).padStart(2, '0')}`);
  const [title, setTitle] = useState(editing?.title || '');
  const [scope, setScope] = useState<PartnershipScope>(editing?.scope || 'flock');
  const [targetId, setTargetId] = useState(editing?.targetId || '');
  const [startDate, setStartDate] = useState(editing?.startDate || today());
  const [endDate, setEndDate] = useState(editing?.endDate || '');
  const [shareMode, setShareMode] = useState<'percent' | 'unit'>(editing?.shareMode || 'percent');
  const [status, setStatus] = useState<PartnershipUnitStatus>(editing?.status || 'active');
  const [notes, setNotes] = useState(editing?.notes || '');

  // لیست شرکا در قرارداد
  const [shares, setShares] = useState<Array<{ partnerId: string; percent: number; units: number; initialCapital: number }>>(
    () => {
      if (editing?.shares && editing.shares.length) return [...editing.shares];
      if (s.partners.length) {
        return s.partners.map((p) => ({
          partnerId: p.id,
          percent: p.share || Math.round(100 / s.partners.length),
          units: 1,
          initialCapital: 0,
        }));
      }
      return [];
    },
  );

  const totalSharesValue = shares.reduce((acc, row) => acc + (shareMode === 'percent' ? num(row.percent) : num(row.units)), 0);
  const totalCommittedCapital = shares.reduce((acc, row) => acc + num(row.initialCapital), 0);

  const updateShare = (idx: number, patch: Partial<(typeof shares)[number]>) => {
    setShares((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeShare = (idx: number) => {
    setShares((prev) => prev.filter((_, i) => i !== idx));
  };

  const addPartnerRow = () => {
    const available = s.partners.find((p) => !shares.some((r) => r.partnerId === p.id));
    if (!available) {
      toast('همه شرکای ثبت‌شده در جدول حضور دارند');
      return;
    }
    setShares((prev) => [
      ...prev,
      {
        partnerId: available.id,
        percent: 0,
        units: 1,
        initialCapital: 0,
      },
    ]);
  };

  const save = () => {
    if (!title.trim()) {
      toast('عنوان واحد مشارکت الزامی است', 'error');
      return;
    }
    if (shares.length === 0) {
      toast('حداقل یک شریک باید در قرارداد مشارکت ثبت گردد', 'error');
      return;
    }

    const payload: Omit<PartnershipUnit, 'id' | 'createdAt'> = {
      code: code.trim(),
      title: title.trim(),
      scope,
      targetId: targetId || undefined,
      startDate,
      endDate: endDate || undefined,
      shareMode,
      shares: shares.map((r) => ({
        partnerId: r.partnerId,
        percent: num(r.percent),
        units: num(r.units),
        initialCapital: num(r.initialCapital),
      })),
      status,
      notes: notes.trim(),
    };

    if (editing) {
      actions.update('partnershipUnits', editing.id, payload);
      toast('قرارداد مشارکت به‌روزرسانی شد');
    } else {
      actions.add('partnershipUnits', payload);
      toast('واحد مشارکت جدید با موفقیت ثبت شد');
    }
    onClose();
  };

  return (
    <Modal
      title={editing ? `ویرایش قرارداد مشارکت — ${editing.title}` : 'ثبت قرارداد و واحد مشارکت جدید'}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            ذخیره قرارداد مشارکت
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field half">
          <label className="lbl">کد قرارداد / واحد</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثلاً PU-01" />
        </div>
        <div className="field half">
          <label className="lbl">عنوان قرارداد مشارکت *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً مشارکت دوره گله ۱ — بهار ۱۴۰۵"
          />
        </div>

        <div className="field half">
          <label className="lbl">حیطه و زمینه مشارکت</label>
          <select className="input" value={scope} onChange={(e) => setScope(e.target.value as PartnershipScope)}>
            {Object.entries(PARTNERSHIP_SCOPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field half">
          <label className="lbl">انتساب به موضوع (گله / سالن)</label>
          {scope === 'flock' ? (
            <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">انتخاب گله پرورشی...</option>
              {s.flocks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          ) : scope === 'hall' ? (
            <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">انتخاب سالن...</option>
              {s.halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="شماره پارت یا مرجع معامله"
            />
          )}
        </div>

        <div className="field half">
          <label className="lbl">تاریخ شروع قرارداد</label>
          <input className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field half">
          <label className="lbl">تاریخ پایان یا تسویه (اختیاری)</label>
          <input className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="۱۴۰۵/۰۵/۰۱" />
        </div>

        <div className="field half">
          <label className="lbl">وضعیت قرارداد</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as PartnershipUnitStatus)}>
            <option value="active">در جریان و فعال</option>
            <option value="settled">تسویه‌شده نهایی</option>
            <option value="closed">مختومه</option>
          </select>
        </div>
        <div className="field half">
          <label className="lbl">نحوه تعیین سهم</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                name="shareMode"
                checked={shareMode === 'percent'}
                onChange={() => setShareMode('percent')}
              />
              <span>درصدی (٪)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                name="shareMode"
                checked={shareMode === 'unit'}
                onChange={() => setShareMode('unit')}
              />
              <span>نسبتی / سهمی (واحدی)</span>
            </label>
          </div>
        </div>

        {/* جدول شرکا و سهم‌ها */}
        <div className="field full" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="lbl" style={{ margin: 0, fontWeight: 700 }}>
              جدول شرکا، میزان سهم و سرمایه متعهد شده اولیه
            </label>
            <button type="button" className="btn small" onClick={addPartnerRow}>
              <Icon name="plus" size={14} /> افزودن شریک
            </button>
          </div>

          <table className="table" style={{ width: '100%', fontSize: '0.88rem' }}>
            <thead>
              <tr>
                <th>نام شریک</th>
                <th>{shareMode === 'percent' ? 'درصد سهم (٪)' : 'تعداد سهم (واحد)'}</th>
                {shareMode === 'unit' && <th>درصد معادل</th>}
                <th>آورده اولیه متعهد شده (تومان)</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {shares.map((row, idx) => {
                const equivPct = totalSharesValue > 0 && shareMode === 'unit'
                  ? ((num(row.units) / totalSharesValue) * 100).toFixed(1)
                  : num(row.percent).toFixed(1);

                return (
                  <tr key={idx}>
                    <td>
                      <select
                        className="input"
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        value={row.partnerId}
                        onChange={(e) => updateShare(idx, { partnerId: e.target.value })}
                      >
                        {s.partners.map((partner) => (
                          <option key={partner.id} value={partner.id}>
                            {partner.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        style={{ padding: '4px 8px', width: 90, textAlign: 'center' }}
                        value={shareMode === 'percent' ? row.percent : row.units}
                        onChange={(e) =>
                          updateShare(
                            idx,
                            shareMode === 'percent'
                              ? { percent: num(e.target.value) }
                              : { units: num(e.target.value) },
                          )
                        }
                      />
                    </td>
                    {shareMode === 'unit' && (
                      <td style={{ color: 'var(--text-muted)' }}>{n(equivPct)}٪</td>
                    )}
                    <td>
                      <input
                        className="input"
                        type="number"
                        style={{ padding: '4px 8px', width: 140 }}
                        value={row.initialCapital || ''}
                        onChange={(e) => updateShare(idx, { initialCapital: num(e.target.value) })}
                        placeholder="۰ تومان"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost small"
                        style={{ color: 'var(--danger)', padding: 4 }}
                        onClick={() => removeShare(idx)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface-sunken)', fontWeight: 700 }}>
                <td>مجموع سهم‌ها:</td>
                <td>
                  {n(totalSharesValue)} {shareMode === 'percent' ? '٪' : 'سهم'}
                </td>
                {shareMode === 'unit' && <td>۱۰۰٪</td>}
                <td>{money(totalCommittedCapital)} تومان</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="field full">
          <label className="lbl">شرایط، تعهدات و یادداشت‌های قرارداد</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="شرایط برداشت سود، تسهیم تلفات احتمالی، داوری و..."
          />
        </div>
      </div>
    </Modal>
  );
}
