/** همه فرم‌های ثبت/ویرایش — هر کدام یک مودال مستقل */
import { useState } from 'react';
import { FormModal, Field, type FieldDef, type FormValues } from '../components/Form';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Chips } from '../components/ui';
import { actions, nextCode, num, useApp } from '../data/store';
import {
  CHICK_AGE_DEFAULT,
  CHICK_TYPES,
  CATEGORIES,
  GOODS_CATS,
  STOCK_REASONS,
  CAT_MAP,
  INVENTORY_CATS,
  INVENTORY_CAT_TO_EXPENSE,
  MEAT_TYPES,
  PARTNER_COLORS,
  TASK_TYPES,
  UNITS,
} from '../data/categories';
import { today, diff, addDays } from '../lib/jalali';
import { money, n } from '../lib/format';
import type {
  Batch,
  Contribution,
  DailyRecord,
  Deal,
  Expense,
  Flock,
  Formula,
  InventoryItem,
  Partner,
  Sale,
  Task,
  Vaccine,
} from '../data/types';

type NewOf<T> = Omit<T, 'id' | 'createdAt'> & { id?: string };
const asNew = <T,>(o: FormValues) => o as unknown as NewOf<T>;
const asPatch = <T,>(o: FormValues) => o as unknown as Partial<T>;

/* --------------------------------- هزینه -------------------------------- */
export function ExpenseForm({
  id,
  preset,
  onClose,
}: {
  id?: string;
  preset?: { category?: string; flockId?: string };
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.expenses.find((e) => e.id === id) : null;

  const [shares, setShares] = useState<Record<string, number>>(() => {
    if (editing?.shares) return { ...editing.shares };
    const init: Record<string, number> = {};
    s.partners.forEach((p) => (init[p.id] = num(p.share)));
    return init;
  });

  const initial: FormValues = editing
    ? { ...editing }
    : {
        date: today(),
        category: preset?.category || 'feed',
        sub: '',
        title: '',
        amount: 0,
        qty: 1,
        unit: 'کیلوگرم',
        vendor: '',
        flockId: preset?.flockId || '',
        paidBy: 'fund',
        split: 'share',
        note: '',
      };

  const fields: FieldDef[] = [
    { name: 'date', label: 'تاریخ (شمسی)', type: 'date', required: true, col: 'half' },
    {
      name: 'category',
      label: 'دسته هزینه',
      type: 'select',
      required: true,
      col: 'half',
      options: CATEGORIES.map((c) => ({ value: c.id, label: `${c.icon}  ${c.label}` })),
      hint: (v) =>
        GOODS_CATS.includes(String(v.category))
          ? 'توجه: خرید کالا بهتر است در «معاملات» ثبت شود؛ ثبت در هر دو جا سود را دو بار کم می‌کند.'
          : undefined,
    },
    {
      name: 'sub',
      label: 'زیر‌دسته',
      type: 'select',
      col: 'half',
      options: (v) => CAT_MAP[String(v.category)]?.subs ?? [],
    },
    {
      name: 'title',
      label: 'عنوان / شرح',
      type: 'text',
      required: true,
      col: 'half',
      placeholder: 'مثلاً خرید ۵۰۰۰ کیلو پیش‌دان',
    },
    { name: 'amount', label: 'مبلغ کل (تومان)', type: 'money', required: true, col: 'half' },
    { name: 'qty', label: 'مقدار', type: 'number', col: 'third' },
    { name: 'unit', label: 'واحد', type: 'select', col: 'third', options: UNITS },
    {
      name: 'flockId',
      label: 'گله مرتبط',
      type: 'select',
      col: 'third',
      options: [
        { value: '', label: 'عمومی مزرعه' },
        ...s.flocks.map((f) => ({ value: f.id, label: f.name })),
      ],
    },
    { name: 'vendor', label: 'فروشنده / طرف حساب', type: 'text', col: 'half', placeholder: 'اختیاری' },
    {
      name: 'paidBy',
      label: 'پرداخت‌کننده',
      type: 'select',
      col: 'half',
      options: [
        { value: 'fund', label: 'صندوق مشترک' },
        ...s.partners.map((p) => ({ value: p.id, label: p.name })),
      ],
    },
    {
      name: 'split',
      label: 'نحوه تقسیم بین شرکا',
      type: 'select',
      col: 'half',
      options: [
        { value: 'share', label: 'بر اساس سهم شرکا' },
        { value: 'equal', label: 'مساوی بین همه' },
        { value: 'custom', label: 'درصد سفارشی' },
        { value: 'single', label: 'فقط پرداخت‌کننده' },
      ],
    },
    { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش هزینه' : 'ثبت هزینه جدید'}
      fields={fields}
      initial={initial}
      submitText={editing ? 'ذخیره تغییرات' : 'ثبت هزینه'}
      onClose={onClose}
      onChange={(name, value) => {
        if (name === 'category') {
          const subs = CAT_MAP[String(value)]?.subs ?? [];
          return { sub: subs[0] ?? '' };
        }
      }}
      extra={(values) =>
        values.split === 'custom' ? (
          <div className="field full" style={{ marginTop: 10 }}>
            <label className="lbl">درصد سهم هر شریک در این هزینه</label>
            <div className="form-grid">
              {s.partners.map((p) => (
                <div className="field" key={p.id}>
                  <label className="lbl">{p.name}</label>
                  <input
                    className="input num"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={shares[p.id] ?? 0}
                    onChange={(e) =>
                      setShares((prev) => ({ ...prev, [p.id]: num(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null
      }
      onSubmit={(v) => {
        const data: FormValues = { ...v, amount: num(v.amount), qty: num(v.qty) };
        if (data.split === 'custom') {
          const tot = s.partners.reduce((a, p) => a + num(shares[p.id]), 0);
          if (Math.abs(tot - 100) > 0.5) {
            toast(`مجموع درصدها باید ۱۰۰ باشد (فعلی: ${tot})`, 'error');
            return false;
          }
          data.shares = shares;
        } else {
          delete data.shares;
        }
        if (editing) {
          actions.update('expenses', editing.id, asPatch<Expense>(data));
          toast('هزینه ویرایش شد');
        } else {
          actions.add('expenses', asNew<Expense>(data));
          toast('هزینه ثبت شد');
        }
      }}
    />
  );
}

/* --------------------------------- فروش --------------------------------- */
export function SaleForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.sales.find((x) => x.id === id) : null;

  const initial: FormValues = editing
    ? { ...editing }
    : {
        date: today(),
        type: 'لاشه کامل',
        qtyKg: 0,
        pricePerKg: 0,
        amount: 0,
        buyer: '',
        flockId: '',
        paidTo: 'fund',
        note: '',
      };

  const fields: FieldDef[] = [
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
    { name: 'type', label: 'نوع محصول', type: 'select', required: true, col: 'half', options: MEAT_TYPES },
    { name: 'qtyKg', label: 'وزن (کیلوگرم)', type: 'number', required: true, col: 'third' },
    { name: 'pricePerKg', label: 'قیمت هر کیلو', type: 'money', required: true, col: 'third' },
    { name: 'amount', label: 'مبلغ کل', type: 'money', col: 'third', hint: 'خودکار محاسبه می‌شود' },
    { name: 'buyer', label: 'خریدار', type: 'text', col: 'half' },
    {
      name: 'flockId',
      label: 'گله',
      type: 'select',
      col: 'half',
      options: [
        { value: '', label: 'عمومی مزرعه' },
        ...s.flocks.map((f) => ({ value: f.id, label: f.name })),
      ],
    },
    {
      name: 'paidTo',
      label: 'واریز به',
      type: 'select',
      col: 'half',
      options: [
        { value: 'fund', label: 'صندوق مشترک' },
        ...s.partners.map((p) => ({ value: p.id, label: p.name })),
      ],
    },
    { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش فروش' : 'ثبت فروش جدید'}
      fields={fields}
      initial={initial}
      submitText={editing ? 'ذخیره' : 'ثبت فروش'}
      onClose={onClose}
      onChange={(name, _v, values) => {
        if (name === 'qtyKg' || name === 'pricePerKg') {
          const amount = num(values.qtyKg) * num(values.pricePerKg);
          return { amount };
        }
      }}
      onSubmit={(v) => {
        const data: FormValues = {
          ...v,
          qtyKg: num(v.qtyKg),
          pricePerKg: num(v.pricePerKg),
          amount: num(v.amount) || num(v.qtyKg) * num(v.pricePerKg),
        };
        if (editing) {
          actions.update('sales', editing.id, asPatch<Sale>(data));
          toast('فروش ویرایش شد');
        } else {
          actions.add('sales', asNew<Sale>(data));
          toast('فروش ثبت شد');
        }
      }}
    />
  );
}

/* ------------------------------- ثبت روزانه ------------------------------ */
export function DailyForm({
  id,
  flockId,
  onClose,
}: {
  id?: string;
  flockId?: string;
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.daily.find((d) => d.id === id) : null;

  const initial: FormValues = editing
    ? { ...editing }
    : {
        date: today(),
        flockId: flockId || s.flocks.find((f) => f.status !== 'closed')?.id || '',
        mortality: 0,
        culled: 0,
        tempC: '',
        feedKg: '',
        waterL: '',
        avgWeightG: '',
        note: '',
      };

  const fields: FieldDef[] = [
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
    {
      name: 'flockId',
      label: 'گله',
      type: 'select',
      required: true,
      col: 'half',
      options: s.flocks.map((f) => ({ value: f.id, label: f.name })),
    },
    { name: 'mortality', label: 'تلفات (قطعه)', type: 'number', col: 'third' },
    { name: 'culled', label: 'حذفی (قطعه)', type: 'number', col: 'third' },
    { name: 'tempC', label: 'دمای سالن (°C)', type: 'number', col: 'third' },
    { name: 'feedKg', label: 'مصرف دان (کیلوگرم)', type: 'number', col: 'half' },
    { name: 'waterL', label: 'مصرف آب (لیتر)', type: 'number', col: 'half' },
    {
      name: 'avgWeightG',
      label: 'وزن میانگین نمونه (گرم)',
      type: 'number',
      col: 'half',
      hint: 'در روزهای توزین ثبت شود',
    },
    { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش ثبت روزانه' : 'ثبت روزانه گله'}
      fields={fields}
      initial={initial}
      submitText={editing ? 'ذخیره' : 'ثبت'}
      onClose={onClose}
      onSubmit={(v) => {
        const flock = s.flocks.find((f) => f.id === v.flockId);
        const data: FormValues = {
          ...v,
          mortality: num(v.mortality),
          culled: num(v.culled),
          feedKg: num(v.feedKg),
          waterL: num(v.waterL),
          avgWeightG: num(v.avgWeightG),
          tempC: num(v.tempC),
          age: flock ? Math.max(0, diff(flock.startDate, String(v.date))) : 0,
        };
        if (editing) {
          actions.update('daily', editing.id, asPatch<DailyRecord>(data));
          toast('رکورد ویرایش شد');
        } else {
          actions.add('daily', asNew<DailyRecord>(data));
          toast('ثبت روزانه ذخیره شد');
        }
      }}
    />
  );
}

/* ------------------------------ واکسیناسیون ------------------------------ */
export function VaccineForm({
  id,
  flockId,
  onClose,
}: {
  id?: string;
  flockId?: string;
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.vaccines.find((v) => v.id === id) : null;

  const initial: FormValues = editing
    ? { ...editing }
    : {
        date: today(),
        flockId: flockId || s.flocks.find((f) => f.status !== 'closed')?.id || '',
        name: '',
        method: 'آب آشامیدنی',
        count: '',
        cost: '',
        vet: '',
        note: '',
      };

  const fields: FieldDef[] = [
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
    {
      name: 'flockId',
      label: 'گله',
      type: 'select',
      required: true,
      col: 'half',
      options: s.flocks.map((f) => ({ value: f.id, label: f.name })),
    },
    { name: 'name', label: 'نام واکسن', type: 'text', required: true, col: 'half', placeholder: 'نیوکاسل، گامبورو ...' },
    {
      name: 'method',
      label: 'روش مصرف',
      type: 'select',
      col: 'half',
      options: ['قطره چشمی', 'آب آشامیدنی', 'اسپری', 'تزریق'],
    },
    { name: 'count', label: 'تعداد (قطعه)', type: 'number', col: 'third' },
    { name: 'cost', label: 'هزینه', type: 'money', col: 'third' },
    { name: 'vet', label: 'دامپزشک', type: 'text', col: 'third' },
    { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش واکسیناسیون' : 'ثبت واکسیناسیون'}
      fields={fields}
      initial={initial}
      onClose={onClose}
      onSubmit={(v) => {
        const data: FormValues = {
          ...v,
          count: num(v.count),
          cost: num(v.cost),
        };
        if (editing) {
          actions.update('vaccines', editing.id, asPatch<Vaccine>(data));
        } else {
          actions.add('vaccines', asNew<Vaccine>(data));
          if (num(v.cost) > 0) {
            actions.add('expenses', {
              date: String(v.date),
              category: 'vaccine',
              sub: String(v.name),
              title: 'واکسن ' + String(v.name),
              amount: num(v.cost),
              qty: num(v.count) || 1,
              unit: 'قطعه',
              vendor: '',
              paidBy: 'fund',
              split: 'share',
              flockId: String(v.flockId),
              note: 'ثبت خودکار از بخش واکسیناسیون',
            });
          }
        }
        toast('واکسیناسیون ثبت شد');
      }}
    />
  );
}

/* --------------------------------- کارها -------------------------------- */
export function TaskForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.tasks.find((t) => t.id === id) : null;

  const initial: FormValues = editing
    ? { ...editing }
    : { date: today(), type: 'عمومی', title: '', flockId: '', done: false, note: '' };

  const fields: FieldDef[] = [
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
    { name: 'type', label: 'نوع', type: 'select', col: 'half', options: TASK_TYPES },
    { name: 'title', label: 'عنوان کار', type: 'text', required: true, col: 'full' },
    {
      name: 'flockId',
      label: 'گله',
      type: 'select',
      col: 'half',
      options: [
        { value: '', label: 'عمومی مزرعه' },
        ...s.flocks.map((f) => ({ value: f.id, label: f.name })),
      ],
    },
    { name: 'done', label: 'انجام شده', type: 'checkbox', col: 'half' },
    { name: 'note', label: 'توضیح', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش کار' : 'کار / یادآور جدید'}
      fields={fields}
      initial={initial}
      onClose={onClose}
      onSubmit={(v) => {
        if (editing) actions.update('tasks', editing.id, asPatch<Task>(v));
        else actions.add('tasks', asNew<Task>(v));
        toast('ذخیره شد');
      }}
    />
  );
}

/* --------------------------------- شرکا --------------------------------- */
export function PartnerForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.partners.find((p) => p.id === id) : null;

  const initial: FormValues = editing
    ? { ...editing }
    : { name: '', phone: '', share: '', role: '', color: '#7C3AED', joined: today() };

  const fields: FieldDef[] = [
    { name: 'name', label: 'نام و نام خانوادگی', type: 'text', required: true, col: 'half' },
    { name: 'phone', label: 'موبایل', type: 'text', col: 'half' },
    {
      name: 'share',
      label: 'سهم (درصد)',
      type: 'number',
      required: true,
      col: 'third',
      hint: 'جمع سهم همه شرکا باید ۱۰۰ باشد',
    },
    { name: 'role', label: 'نقش', type: 'text', col: 'third', placeholder: 'مدیر مالی، فنی ...' },
    { name: 'color', label: 'رنگ', type: 'select', col: 'third', options: PARTNER_COLORS },
    { name: 'joined', label: 'تاریخ عضویت', type: 'date', col: 'half' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش شریک' : 'افزودن شریک'}
      fields={fields}
      initial={initial}
      onClose={onClose}
      onSubmit={(v) => {
        const others = s.partners.filter((p) => !editing || p.id !== editing.id);
        const tot = others.reduce((a, p) => a + num(p.share), 0) + num(v.share);
        if (tot > 100.5) {
          toast(`جمع سهم‌ها ${tot}٪ می‌شود؛ حداکثر ۱۰۰ مجاز است`, 'error');
          return false;
        }
        const data: FormValues = { ...v, share: num(v.share) };
        if (editing) actions.update('partners', editing.id, asPatch<Partner>(data));
        else actions.add('partners', asNew<Partner>(data));
        toast('شریک ذخیره شد');
      }}
    />
  );
}

/* ----------------------------- آورده / برداشت ---------------------------- */
export function ContributionForm({
  partnerId,
  onClose,
}: {
  partnerId?: string;
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();

  const fields: FieldDef[] = [
    {
      name: 'partnerId',
      label: 'شریک',
      type: 'select',
      required: true,
      col: 'half',
      options: s.partners.map((p) => ({ value: p.id, label: p.name })),
    },
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
    { name: 'amount', label: 'مبلغ', type: 'money', required: true, col: 'half' },
    {
      name: 'kind',
      label: 'نوع',
      type: 'select',
      col: 'half',
      options: [
        { value: 'in', label: 'آورده (واریز)' },
        { value: 'out', label: 'برداشت' },
      ],
    },
    { name: 'note', label: 'توضیح', type: 'text', col: 'full' },
  ];

  return (
    <FormModal
      title="ثبت آورده / برداشت شریک"
      fields={fields}
      initial={{ partnerId: partnerId || s.partners[0]?.id || '', date: today(), kind: 'in', amount: 0, note: '' }}
      onClose={onClose}
      onSubmit={(v) => {
        const amt = v.kind === 'out' ? -Math.abs(num(v.amount)) : Math.abs(num(v.amount));
        actions.add('contributions', {
          partnerId: String(v.partnerId),
          date: String(v.date),
          amount: amt,
          note: String(v.note ?? ''),
        } as Contribution);
        toast('ثبت شد');
      }}
    />
  );
}

/* --------------------------------- گله ---------------------------------- */
export function FlockForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.flocks.find((f) => f.id === id) : null;

  const [name, setName] = useState(editing?.name || '');
  const [code, setCode] = useState(editing?.code || 'F-' + (s.flocks.length + 1));
  const [breed, setBreed] = useState(editing?.breed || 'B.U.T 6');
  const [hall, setHall] = useState(editing?.hall || 'سالن ۱');
  const [startDate, setStartDate] = useState(editing?.startDate || today());
  const [startCount, setStartCount] = useState(num(editing?.startCount));
  const [chickType, setChickType] = useState(editing?.chickType || CHICK_TYPES[0]);
  const [chickAge, setChickAge] = useState(
    num(editing?.chickAge) || CHICK_AGE_DEFAULT[CHICK_TYPES[0]],
  );
  const [status, setStatus] = useState(editing?.status || 'active');
  const [endDate, setEndDate] = useState(editing?.endDate || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [shareMode, setShareMode] = useState<'unit' | 'percent'>(editing?.shareMode || 'unit');
  const [rows, setRows] = useState<Array<{ partnerId: string; value: number }>>(() => {
    if (editing?.shares?.length) {
      return editing.shares.map((x) => ({
        partnerId: x.partnerId,
        value: editing.shareMode === 'percent' ? num(x.percent) : num(x.units),
      }));
    }
    return s.partners.map((p) => ({ partnerId: p.id, value: 0 }));
  });

  const total = rows.reduce((a, r) => a + num(r.value), 0);
  const pctOf = (v: number) => (total > 0 ? (num(v) / total) * 100 : 0);

  const recallPartners = () => {
    const existing = new Map(rows.map((r) => [r.partnerId, r.value]));
    setRows(s.partners.map((p) => ({ partnerId: p.id, value: existing.get(p.id) ?? 0 })));
    toast('شرکا از بخش «شرکا و تسویه» بازخوانی شد');
  };

  const save = () => {
    if (!name.trim()) {
      toast('نام گله را وارد کنید', 'error');
      return;
    }
    const shares = rows
      .filter((r) => num(r.value) > 0)
      .map((r) => ({
        partnerId: r.partnerId,
        units: shareMode === 'unit' ? num(r.value) : pctOf(r.value),
        percent: pctOf(r.value),
      }));

    const data = {
      name: name.trim(),
      code,
      breed,
      hall,
      startDate,
      startCount: num(startCount),
      chickType,
      chickAge: num(chickAge),
      status,
      endDate: status === 'closed' ? endDate : '',
      notes,
      shares,
      shareMode,
    };

    if (editing) actions.update('flocks', editing.id, data as Partial<Flock>);
    else actions.add('flocks', { ...data, soldCount: 0 } as unknown as Flock);
    toast('گله ذخیره شد');
    onClose();
  };

  return (
    <Modal
      title={editing ? 'ویرایش گله' : 'ایجاد گله جدید'}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            {editing ? 'ذخیره تغییرات' : 'ثبت گله'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label className="lbl">نام گله / دوره</label>
          <input
            className="input"
            id="fld-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="گله ۳ — زمستان ۱۴۰۵"
          />
        </div>
        <div className="field third">
          <label className="lbl">کد</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="field third">
          <label className="lbl">نژاد</label>
          <input className="input" value={breed} onChange={(e) => setBreed(e.target.value)} />
        </div>
        <div className="field third">
          <label className="lbl">سالن</label>
          <input className="input" value={hall} onChange={(e) => setHall(e.target.value)} />
        </div>

        <Field
          def={{
            name: 'startDate',
            label: 'تاریخ ورود به سالن',
            type: 'date',
            col: 'half',
            required: true,
          }}
          values={{ startDate }}
          setValue={(_n, v) => setStartDate(String(v))}
        />
        <div className="field half">
          <label className="lbl">تعداد اولیه</label>
          <input
            className="input num"
            inputMode="numeric"
            id="fld-startCount"
            value={startCount ? String(startCount) : ''}
            onChange={(e) => setStartCount(num(e.target.value))}
          />
        </div>

        <div className="field half">
          <label className="lbl">نوع جوجه</label>
          <select
            className="input"
            id="fld-chickType"
            value={chickType}
            onChange={(e) => {
              setChickType(e.target.value);
              setChickAge(CHICK_AGE_DEFAULT[e.target.value] ?? 1);
            }}
          >
            {CHICK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field half">
          <label className="lbl">سن جوجه هنگام ورود (روز)</label>
          <input
            className="input num"
            inputMode="numeric"
            id="fld-chickAge"
            value={chickAge ? String(chickAge) : ''}
            onChange={(e) => setChickAge(num(e.target.value))}
          />
        </div>

        <div className="field half">
          <label className="lbl">وضعیت</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'closed')}
          >
            <option value="active">در حال پرورش</option>
            <option value="closed">بسته شده</option>
          </select>
        </div>
        {status === 'closed' ? (
          <Field
            def={{ name: 'endDate', label: 'تاریخ پایان', type: 'date', col: 'half' }}
            values={{ endDate }}
            setValue={(_n, v) => setEndDate(String(v))}
          />
        ) : null}

        <div className="field full">
          <label className="lbl">توضیحات</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="sec-head" style={{ marginTop: 16 }}>
        <div>
          <h3>سهم شرکا در این دوره</h3>
          <span className="sec-sub">
            جمع: {n(total, 0)} {shareMode === 'unit' ? 'سهم' : '٪'}
            {total > 0 ? ' — سهم هر نفر بر همین نسبت‌ها محاسبه می‌شود' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chips
            items={[
              { value: 'unit', label: 'سهمی (۳ از ۹)' },
              { value: 'percent', label: 'درصدی (٪)' },
            ]}
            active={shareMode}
            onPick={(v) => setShareMode(v as 'unit' | 'percent')}
          />
        </div>
      </div>

      <div className="form-grid">
        {rows.map((r, i) => {
          const p = s.partners.find((x) => x.id === r.partnerId);
          return (
            <div className="field third" key={r.partnerId}>
              <label className="lbl">
                {p?.name || 'شریک'} {shareMode === 'unit' ? '— سهم' : '— درصد'}
              </label>
              <input
                className="input num"
                inputMode="numeric"
                value={r.value ? String(r.value) : ''}
                placeholder="۰"
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x, k) => (k === i ? { ...x, value: num(e.target.value) } : x)),
                  )
                }
              />
              <div className="hint">
                {shareMode === 'unit'
                  ? `${n(pctOf(r.value), 1)}٪ از کل`
                  : `${n(pctOf(r.value), 1)}٪ از ${n(total, 0)}`}
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn sm mt-sm" type="button" onClick={recallPartners}>
        <Icon name="users" size={14} /> بازخوانی شرکا از «شرکا و تسویه»
      </button>
    </Modal>
  );
}

export function InventoryItemForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.inventory.find((i) => i.id === id) : null;

  const initial: FormValues = editing
    ? { ...editing }
    : {
        code: nextCode('K', s.inventory.map((i) => i.code)),
        name: '',
        cat: INVENTORY_CATS[0],
        unit: UNITS[0],
        qty: 0,
        min: 0,
        pricePerKg: 0,
        active: true,
        note: '',
        expiry: '',
      };

  const cats = Array.from(new Set([...INVENTORY_CATS, ...(s.settings.itemCats || [])]));
  const units = Array.from(new Set([...UNITS, ...(s.settings.units || [])]));

  const fields: FieldDef[] = [
    { name: 'code', label: 'کد کالا', type: 'text', col: 'third', hint: 'خودکار' },
    { name: 'name', label: 'نام کالا', type: 'text', required: true, col: 'half' },
    { name: 'active', label: 'کالا فعال است', type: 'checkbox', col: 'third' },
    { name: 'cat', label: 'دسته', type: 'select', col: 'half', options: cats },
    { name: 'unit', label: 'واحد', type: 'select', col: 'half', options: units },
    { name: 'qty', label: 'موجودی فعلی', type: 'number', col: 'third' },
    { name: 'min', label: 'حد هشدار', type: 'number', col: 'third' },
    { name: 'pricePerKg', label: 'قیمت واحد (تومان)', type: 'money', col: 'third' },
    {
      name: 'expiry',
      label: 'تاریخ انقضا',
      type: 'date',
      col: 'half',
      hint: 'برای دارو و واکسن — اختیاری',
    },
    { name: 'note', label: 'توضیحات', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش کالا' : 'افزودن کالای جدید'}
      fields={fields}
      initial={initial}
      onClose={onClose}
      extra={(_v, setValue) => (
        <div className="grid grid-2" style={{ gap: 8, marginTop: 10 }}>
          <AddInline
            label="دسته جدید"
            placeholder="مثلاً بسته‌بندی"
            onAdd={(val) => {
              actions.setSettings({ itemCats: Array.from(new Set([...(s.settings.itemCats || []), val])) });
              setValue('cat', val);
            }}
          />
          <AddInline
            label="واحد جدید"
            placeholder="مثلاً کارتن"
            onAdd={(val) => {
              actions.setSettings({ units: Array.from(new Set([...(s.settings.units || []), val])) });
              setValue('unit', val);
            }}
          />
        </div>
      )}
      onSubmit={(v) => {
        const data: FormValues = {
          ...v,
          qty: num(v.qty),
          min: num(v.min),
          pricePerKg: num(v.pricePerKg),
          active: v.active !== false,
        };
        if (editing) actions.update('inventory', editing.id, asPatch<InventoryItem>(data));
        else actions.add('inventory', asNew<InventoryItem>(data));
        toast('کالا ذخیره شد');
      }}
    />
  );
}

/** ورودی کوچک «افزودن مورد جدید» (دسته/واحد/نوع حساب) */
export function AddInline({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [val, setVal] = useState('');
  return (
    <div className="field full">
      <label className="lbl">{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="input"
          value={val}
          placeholder={placeholder}
          onChange={(e) => setVal(e.target.value)}
        />
        <button
          className="btn sm"
          type="button"
          onClick={() => {
            const v = val.trim();
            if (!v) return;
            onAdd(v);
            setVal('');
          }}
        >
          <Icon name="plus" size={14} /> افزودن
        </button>
      </div>
    </div>
  );
}

export function InventoryMoveForm({
  itemId,
  onClose,
}: {
  itemId?: string;
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();

  const fields: FieldDef[] = [
    {
      name: 'itemId',
      label: 'کالا',
      type: 'select',
      required: true,
      col: 'half',
      options: s.inventory.map((i) => ({ value: i.id, label: i.name })),
    },
    {
      name: 'kind',
      label: 'نوع تراکنش',
      type: 'select',
      col: 'half',
      options: [
        { value: 'in', label: 'ورود به انبار' },
        { value: 'out', label: 'خروج از انبار' },
      ],
    },
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
    { name: 'qty', label: 'مقدار', type: 'number', required: true, col: 'half' },
    {
      name: 'cost',
      label: 'مبلغ کل (اختیاری)',
      type: 'money',
      col: 'half',
      hint: 'در صورت ورود، به عنوان هزینه ثبت می‌شود',
    },
    {
      name: 'reason',
      label: 'دلیل حرکت',
      type: 'select',
      required: true,
      col: 'half',
      options: STOCK_REASONS,
    },
    {
      name: 'flockId',
      label: 'گله',
      type: 'select',
      col: 'half',
      options: [
        { value: '', label: 'عمومی مزرعه' },
        ...s.flocks.map((f) => ({ value: f.id, label: f.name })),
      ],
    },
    { name: 'note', label: 'توضیح', type: 'text', col: 'full' },
  ];

  return (
    <FormModal
      title="ورود / خروج انبار"
      fields={fields}
      initial={{
        itemId: itemId || s.inventory[0]?.id || '',
        kind: 'in',
        date: today(),
        qty: 0,
        cost: 0,
        reason: STOCK_REASONS[0],
        flockId: '',
        note: '',
      }}
      onClose={onClose}
      onSubmit={(v) => {
        const item = s.inventory.find((i) => i.id === v.itemId);
        if (!item) return false;
        const q = num(v.qty);
        if (v.kind === 'out' && q > num(item.qty)) {
          toast(`موجودی کافی نیست (موجودی: ${n(item.qty)})`, 'error');
          return false;
        }
        actions.adjustStock(
          { [String(item.name).trim()]: v.kind === 'in' ? q : -q },
          {
            date: String(v.date),
            reason: String(v.reason || 'سایر'),
            refType: 'manual',
            note: String(v.note ?? ''),
          },
        );
        if (v.kind === 'in' && num(v.cost) > 0) {
          actions.add('expenses', {
            date: String(v.date),
            category: INVENTORY_CAT_TO_EXPENSE[item.cat] || 'other',
            sub: item.name,
            title: `خرید ${n(q)} ${item.unit} ${item.name}`,
            amount: num(v.cost),
            qty: q,
            unit: item.unit,
            vendor: '',
            paidBy: 'fund',
            split: 'share',
            flockId: String(v.flockId || ''),
            note: 'ثبت خودکار از انبار',
          });
        }
        toast('تراکنش انبار ثبت شد');
      }}
    />
  );
}

/* ------------------------------ معامله دلالی ----------------------------- */
export function DealForm({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();

  const fields: FieldDef[] = [
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
    {
      name: 'partnerId',
      label: 'شریک انجام‌دهنده',
      type: 'select',
      required: true,
      col: 'half',
      options: s.partners.map((p) => ({ value: p.id, label: p.name })),
    },
    { name: 'item', label: 'کالا / موضوع', type: 'text', required: true, col: 'full', placeholder: 'مثلاً ۵ تن ذرت' },
    { name: 'qty', label: 'مقدار', type: 'number', col: 'third' },
    { name: 'unit', label: 'واحد', type: 'select', col: 'third', options: UNITS },
    { name: 'commission', label: 'کمیسیون', type: 'money', col: 'third' },
    { name: 'buyPrice', label: 'قیمت خرید (واحد)', type: 'money', col: 'half' },
    { name: 'sellPrice', label: 'قیمت فروش (واحد)', type: 'money', col: 'half' },
    { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title="ثبت معامله / دلالی"
      fields={fields}
      initial={{
        date: today(),
        partnerId: s.partners[0]?.id || '',
        item: '',
        qty: 0,
        unit: 'کیلوگرم',
        commission: 0,
        buyPrice: 0,
        sellPrice: 0,
        note: '',
      }}
      onClose={onClose}
      extra={(v) => {
        const profit = (num(v.sellPrice) - num(v.buyPrice)) * num(v.qty) + num(v.commission);
        return (
          <div className="hint" style={{ marginTop: 8 }}>
            سود تخمینی این معامله:{' '}
            <b style={{ color: profit >= 0 ? '#059669' : '#DC2626' }}>{money(profit)}</b>
          </div>
        );
      }}
      onSubmit={(v) => {
        actions.add('deals', {
          date: String(v.date),
          partnerId: String(v.partnerId),
          item: String(v.item),
          qty: num(v.qty),
          unit: String(v.unit),
          buyPrice: num(v.buyPrice),
          sellPrice: num(v.sellPrice),
          commission: num(v.commission),
          note: String(v.note ?? ''),
        } as Deal);
        toast('معامله ثبت شد');
      }}
    />
  );
}

/* -------------------------------- بچ خوراک ------------------------------- */
export function BatchForm({
  formulaId,
  onClose,
}: {
  formulaId?: string;
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();

  const fields: FieldDef[] = [
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
    {
      name: 'formulaId',
      label: 'فرمول',
      type: 'select',
      required: true,
      col: 'half',
      options: s.formulas.map((f) => ({ value: f.id, label: f.name })),
    },
    { name: 'qtyKg', label: 'مقدار تولید (کیلوگرم)', type: 'number', required: true, col: 'half' },
    {
      name: 'flockId',
      label: 'گله مصرف‌کننده',
      type: 'select',
      col: 'half',
      options: [
        { value: '', label: 'عمومی مزرعه' },
        ...s.flocks.map((f) => ({ value: f.id, label: f.name })),
      ],
    },
    { name: 'note', label: 'توضیح', type: 'text', col: 'full' },
    { name: 'expensed', label: 'به عنوان هزینه در دفتر ثبت شود', type: 'checkbox', col: 'full' },
  ];

  const cost = (formulaId: string, qty: number) => {
    const fm = s.formulas.find((f) => f.id === formulaId);
    if (!fm) return 0;
    const perKg = fm.items.reduce((a, it) => a + (num(it.percent) / 100) * num(it.pricePerKg), 0);
    return perKg * qty;
  };

  return (
    <FormModal
      title="ثبت بچ تولید خوراک"
      fields={fields}
      initial={{
        date: today(),
        formulaId: formulaId || s.formulas[0]?.id || '',
        qtyKg: 0,
        flockId: '',
        note: '',
        expensed: false,
      }}
      onClose={onClose}
      extra={(v) => (
        <div className="hint" style={{ marginTop: 8 }}>
          هزینه تخمینی: <b>{money(cost(String(v.formulaId), num(v.qtyKg)))}</b>
        </div>
      )}
      onSubmit={(v) => {
        const total = cost(String(v.formulaId), num(v.qtyKg));
        const fm = s.formulas.find((f) => f.id === v.formulaId);
        actions.add('batches', {
          date: String(v.date),
          formulaId: String(v.formulaId),
          qtyKg: num(v.qtyKg),
          flockId: String(v.flockId || ''),
          note: String(v.note ?? ''),
          expensed: !!v.expensed,
        } as Batch);
        if (v.expensed && total > 0) {
          actions.add('expenses', {
            date: String(v.date),
            category: 'mix',
            sub: fm ? fm.name : 'خوراک ساختگی',
            title: `تولید ${n(num(v.qtyKg))} کیلو ${fm ? fm.name : 'خوراک'}`,
            amount: Math.round(total),
            qty: num(v.qtyKg),
            unit: 'کیلوگرم',
            vendor: '',
            paidBy: 'fund',
            split: 'share',
            flockId: String(v.flockId || ''),
            note: 'ثبت خودکار از بچ خوراک',
          });
        }
        toast('بچ تولید ثبت شد');
      }}
    />
  );
}

/* ------------------------------ فرمول خوراک ------------------------------ */
interface ItemRow {
  name: string;
  percent: number;
  pricePerKg: number;
  protein: number;
}

export function FormulaForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.formulas.find((f) => f.id === id) : null;

  const [name, setName] = useState(editing?.name ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [items, setItems] = useState<ItemRow[]>(() => {
    const src = editing?.items;
    if (src && src.length) return src.map((i) => ({ ...i }));
    return [{ name: 'ذرت', percent: 0, pricePerKg: 0, protein: 0 }];
  });

  const totals = items.reduce(
    (acc, it) => {
      acc.pct += num(it.percent);
      acc.cost += (num(it.percent) / 100) * num(it.pricePerKg);
      acc.protein += (num(it.percent) / 100) * num(it.protein);
      return acc;
    },
    { pct: 0, cost: 0, protein: 0 },
  );

  const save = () => {
    if (!name.trim()) {
      toast('نام فرمول را وارد کنید', 'error');
      return;
    }
    const clean = items.filter((i) => i.name.trim());
    if (!clean.length) {
      toast('حداقل یک ماده اولیه لازم است', 'error');
      return;
    }
    const data = { name: name.trim(), note: note.trim(), items: clean };
    if (editing) actions.update('formulas', editing.id, data as Partial<Formula>);
    else actions.add('formulas', data as Formula);
    toast('فرمول ذخیره شد');
    onClose();
  };

  return (
    <Modal
      title={editing ? 'ویرایش فرمول خوراک' : 'فرمول خوراک جدید'}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            ذخیره فرمول
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label className="lbl">نام فرمول</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="فرمول رشد — دوره دوم"
          />
        </div>
        <div className="field full">
          <label className="lbl">توضیح</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="اختیاری"
          />
        </div>
      </div>

      <div
        className="formula-head"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 70px 90px 90px 34px',
          gap: 6,
          margin: '12px 0 6px',
        }}
      >
        <span>ماده اولیه</span>
        <span>درصد</span>
        <span>قیمت هر کیلو</span>
        <span>پروتئین٪</span>
        <span />
      </div>

      {items.map((it, i) => (
        <div
          key={i}
          className="formula-item formula-row"
          style={{ marginBottom: 6 }}
        >
          <input
            className="input"
            value={it.name}
            placeholder="نام ماده"
            onChange={(e) =>
              setItems((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
            }
          />
          <input
            className="input num"
            type="number"
            step={0.1}
            value={it.percent || ''}
            onChange={(e) =>
              setItems((prev) =>
                prev.map((x, j) => (j === i ? { ...x, percent: num(e.target.value) } : x)),
              )
            }
          />
          <input
            className="input num"
            type="number"
            step={100}
            value={it.pricePerKg || ''}
            onChange={(e) =>
              setItems((prev) =>
                prev.map((x, j) => (j === i ? { ...x, pricePerKg: num(e.target.value) } : x)),
              )
            }
          />
          <input
            className="input num"
            type="number"
            step={0.1}
            value={it.protein || ''}
            onChange={(e) =>
              setItems((prev) =>
                prev.map((x, j) => (j === i ? { ...x, protein: num(e.target.value) } : x)),
              )
            }
          />
          <button
            className="icon-btn sm"
            type="button"
            onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}

      <button
        className="btn sm mt-sm"
        type="button"
        onClick={() => setItems((prev) => [...prev, { name: '', percent: 0, pricePerKg: 0, protein: 0 }])}
      >
        <Icon name="plus" size={14} /> افزودن ماده اولیه
      </button>

      <div className="card mt" style={{ boxShadow: 'none', background: '#FAF8FE', border: '1px solid var(--line)' }}>
        <div className="kv">
          <span>جمع درصدها</span>
          <b style={{ color: Math.abs(totals.pct - 100) > 0.5 ? '#DC2626' : '#059669' }}>
            {n(totals.pct, 1)}٪
          </b>
        </div>
        <div className="kv">
          <span>هزینه هر کیلو خوراک</span>
          <b>{money(totals.cost)}</b>
        </div>
        <div className="kv">
          <span>پروتئین تخمینی</span>
          <b>{n(totals.protein, 1)}٪</b>
        </div>
      </div>
    </Modal>
  );
}

/** تاریخ پیش‌فرض برای فرم‌های وابسته به گله */
export const defaultFlockDate = (startDate: string, days: number) => addDays(startDate, days);
