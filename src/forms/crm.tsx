/** فرم‌های اشخاص (CRM)، معاملات و دریافت/پرداخت */
import { useMemo, useState } from 'react';
import { FormModal, Field, type FieldDef, type FormValues } from '../components/Form';
import { Modal, useUI } from '../components/Modal';
import { AddInline } from './index';
import { Icon } from '../components/Icon';
import {
  actions,
  nextCode,
  num,
  flockSharePercents,
  personById,
  personLabel,
  txStockDelta,
  txTotal,
  useApp,
} from '../data/store';
import {
  ACCOUNT_KINDS,
  PAY_MODES,
  PAYMENT_METHODS,
  PERSON_TYPES,
  TX_TYPES,
  TX_TYPE_LABEL,
  UNITS,
  WAREHOUSES,
} from '../data/categories';
import { today } from '../lib/jalali';
import { splitAmount } from '../lib/money';
import { money, n } from '../lib/format';
import type {
  Account,
  PaymentDoc,
  Transfer,
  Person,
  Transaction,
  TxItem,
  TxShare,
} from '../data/types';

/* --------------------------------- اشخاص -------------------------------- */
export function PersonForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.persons.find((p) => p.id === id) : null;

  const initial: FormValues = editing
    ? { ...editing }
    : {
        code: nextCode('P', s.persons.map((p) => p.code)),
        firstName: '',
        lastName: '',
        company: '',
        type: 'customer',
        nationalId: '',
        phone: '',
        address: '',
        note: '',
      };

  const fields: FieldDef[] = [
    { name: 'code', label: 'کد شخص', type: 'text', col: 'third', hint: 'خودکار ساخته می‌شود' },
    {
      name: 'type',
      label: 'نوع شخص',
      type: 'select',
      required: true,
      col: 'third',
      options: PERSON_TYPES,
    },
    { name: 'phone', label: 'شماره تماس', type: 'text', col: 'third' },
    { name: 'firstName', label: 'نام', type: 'text', col: 'half' },
    { name: 'lastName', label: 'نام خانوادگی', type: 'text', col: 'half' },
    {
      name: 'company',
      label: 'نام شرکت (اختیاری)',
      type: 'text',
      col: 'full',
      placeholder: 'اگر شخص حقوقی است، نام شرکت را وارد کنید',
    },
    { name: 'nationalId', label: 'کد ملی / شناسه ملی', type: 'text', col: 'half' },
    { name: 'address', label: 'آدرس', type: 'text', col: 'half' },
    { name: 'note', label: 'توضیحات', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش شخص' : 'شخص جدید'}
      fields={fields}
      initial={initial}
      onClose={onClose}
      onSubmit={(v) => {
        const data: FormValues = { ...v, code: String(v.code || nextCode('P', s.persons.map((p) => p.code))) };
        if (editing) actions.update('persons', editing.id, data as Partial<Person>);
        else actions.add('persons', data as unknown as Person);
        toast('شخص ذخیره شد');
      }}
    />
  );
}

/* -------------------------------- حساب‌ها ------------------------------- */
export function AccountForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.accounts.find((a) => a.id === id) : null;

  const kinds = Array.from(new Set([...ACCOUNT_KINDS, ...(s.settings.accountKinds || [])]));

  const fields: FieldDef[] = [
    { name: 'code', label: 'کد حساب', type: 'text', col: 'third', hint: 'خودکار' },
    { name: 'kind', label: 'نوع حساب', type: 'select', required: true, col: 'third', options: kinds },
    { name: 'active', label: 'حساب فعال است', type: 'checkbox', col: 'third' },
    { name: 'name', label: 'نام حساب', type: 'text', required: true, col: 'half' },
    {
      name: 'partnerId',
      label: 'شریک (برای جیب شریک)',
      type: 'select',
      col: 'half',
      options: [{ value: '', label: '—' }].concat(
        s.partners.map((p) => ({ value: p.id, label: p.name })),
      ),
      hint: (v) =>
        v.kind === 'جیب شریک' ? 'برای جیب شریک، شریک مربوطه را انتخاب کنید' : undefined,
    },
    { name: 'opening', label: 'موجودی اولیه', type: 'money', col: 'half' },
    { name: 'note', label: 'توضیحات', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? 'ویرایش حساب' : 'حساب جدید'}
      fields={fields}
      initial={
        editing
          ? { ...editing }
          : {
              code: nextCode('A', s.accounts.map((a) => a.code)),
              kind: ACCOUNT_KINDS[0],
              name: '',
              opening: 0,
              partnerId: '',
              note: '',
              active: true,
            }
      }
      onClose={onClose}
      extra={(_v, setValue) => (
        <AddInline
          label="نوع حساب جدید"
          placeholder="مثلاً صندوق ارزی"
          onAdd={(val) => {
            actions.setSettings({
              accountKinds: Array.from(new Set([...(s.settings.accountKinds || []), val])),
            });
            setValue('kind', val);
          }}
        />
      )}
      onSubmit={(v) => {
        const data: FormValues = { ...v, opening: num(v.opening), active: v.active !== false };
        if (editing) actions.update('accounts', editing.id, data as unknown as Partial<Account>);
        else actions.add('accounts', data as unknown as Account);
        toast('حساب ذخیره شد');
      }}
    />
  );
}

/* -------------------------------- معامله -------------------------------- */
interface TxRow extends TxItem {
  key: number;
}

export function TransactionForm({
  id,
  presetType,
  onClose,
}: {
  id?: string;
  presetType?: string;
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.transactions.find((t) => t.id === id) : null;

  const units = useMemo(() => Array.from(new Set([...UNITS, ...(s.settings.units || [])])), [s.settings.units]);

  const [code, setCode] = useState(
    editing?.code || nextCode('T', s.transactions.map((t) => t.code)),
  );
  const [date, setDate] = useState(editing?.date || today());
  const [type, setType] = useState(editing?.type || presetType || 'sale');
  const [personId, setPersonId] = useState(editing?.personId || '');
  const [personName, setPersonName] = useState(editing?.personName || '');
  const [payMode, setPayMode] = useState<string>(editing?.payMode || 'cash');
  const [dueDate, setDueDate] = useState(editing?.dueDate || '');
  const [deposit, setDeposit] = useState(num(editing?.deposit));
  const [hall, setHall] = useState(editing?.hall || '');
  const [flockId, setFlockId] = useState(editing?.flockId || '');
  const [warehouse, setWarehouse] = useState(editing?.warehouse || WAREHOUSES[0]);
  const [note, setNote] = useState(editing?.note || '');
  const [discount, setDiscount] = useState(num(editing?.discount));
  const [extraCost, setExtraCost] = useState(num(editing?.extraCost));
  const [rows, setRows] = useState<TxRow[]>(() =>
    (editing?.items?.length ? editing.items : [{ name: '', unit: units[0], qty: 1, price: 0 }]).map(
      (i, k) => ({ ...i, key: k }),
    ),
  );
  const [shares, setShares] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    s.partners.forEach((p) => {
      const found = editing?.shares?.find((x) => x.partnerId === p.id);
      init[p.id] = found ? found.percent : num(p.share);
    });
    return init;
  });

  const total = txTotal(rows, discount, extraCost);
  const shareSum = s.partners.reduce((a, p) => a + num(shares[p.id]), 0);

  const applyFlockShares = (fid: string) => {
    const pct = flockSharePercents(s, fid);
    if (!Object.keys(pct).length) return false;
    const next: Record<string, number> = {};
    s.partners.forEach((p) => {
      next[p.id] = Math.round((pct[p.id] || 0) * 100) / 100;
    });
    setShares(next);
    return true;
  };

  const setRow = (key: number, patch: Partial<TxRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const save = () => {
    if (!rows.some((r) => r.name.trim() && num(r.qty) > 0)) {
      toast('حداقل یک قلم کالا با تعداد لازم است', 'error');
      return;
    }
    const items: TxItem[] = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), unit: r.unit, qty: num(r.qty), price: num(r.price) }));

    const finalTotal = txTotal(items, discount, extraCost);
    // تخصیص دقیق: جمع سهم‌ها همیشه برابر مبلغ کل است
    const amounts = splitAmount(
      finalTotal,
      s.partners.map((p) => num(shares[p.id])),
    );
    const txShares: TxShare[] = s.partners.map((p, i) => ({
      partnerId: p.id,
      percent: num(shares[p.id]),
      amount: amounts[i] || 0,
    }));

    const data = {
      code,
      date,
      type,
      personId,
      personName: personName || personLabel(personById(s, personId)),
      payMode,
      dueDate: payMode === 'cash' ? '' : dueDate,
      deposit: payMode === 'mixed' ? num(deposit) : payMode === 'cash' ? finalTotal : 0,
      hall,
      flockId,
      warehouse,
      items,
      discount: num(discount),
      extraCost: num(extraCost),
      total: finalTotal,
      shares: txShares,
      note,
    };

    // به‌روزرسانی موجودی انبار: ابتدا اثر قبلی برگشت، سپس اثر جدید اعمال می‌شود
    if (editing) {
      const back = txStockDelta(editing, -1);
      const fwd = txStockDelta(data as unknown as Transaction, 1);
      const merged: Record<string, number> = { ...back };
      Object.entries(fwd).forEach(([k, v]) => {
        merged[k] = (merged[k] || 0) + v;
      });
      actions.adjustStock(merged, {
        date,
        reason: TX_TYPE_LABEL[type] || 'معامله',
        refType: 'transaction',
        refId: code,
      });
      actions.update('transactions', editing.id, data as Partial<Transaction>);
    } else {
      actions.adjustStock(txStockDelta(data as unknown as Transaction, 1), {
        date,
        reason: TX_TYPE_LABEL[type] || 'معامله',
        refType: 'transaction',
        refId: code,
      });
      actions.add('transactions', data as Transaction);
    }
    toast(editing ? 'معامله ویرایش شد' : 'معامله ثبت شد');
    onClose();
  };

  const numInput = (
    value: number,
    onChange: (v: number) => void,
    placeholder = '۰',
  ) => (
    <input
      className="input num"
      inputMode="numeric"
      value={value ? String(value) : ''}
      placeholder={placeholder}
      onChange={(e) => onChange(num(e.target.value))}
    />
  );

  return (
    <Modal
      title={editing ? `ویرایش معامله ${code}` : 'معامله جدید'}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            {editing ? 'ذخیره تغییرات' : 'ثبت معامله'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field third">
          <label className="lbl">کد سند</label>
          <input className="input num" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <Field
          def={{ name: 'date', label: 'تاریخ', type: 'date', col: 'third', required: true }}
          values={{ date }}
          setValue={(_n, v) => setDate(String(v))}
        />
        <div className="field third">
          <label className="lbl">نوع سند</label>
          <select
            className="input"
            id="fld-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field half">
          <label className="lbl">طرف حساب (از اشخاص)</label>
          <select
            className="input"
            id="fld-personId"
            value={personId}
            onChange={(e) => {
              setPersonId(e.target.value);
              const p = personById(s, e.target.value);
              if (p) setPersonName(personLabel(p));
            }}
          >
            <option value="">— انتخاب نشده —</option>
            {s.persons.map((p) => (
              <option key={p.id} value={p.id}>
                {personLabel(p)} ({p.code})
              </option>
            ))}
          </select>
        </div>
        <div className="field half">
          <label className="lbl">نام طرف حساب (دستی)</label>
          <input
            className="input"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="اگر در لیست اشخاص نیست"
          />
        </div>

        <div className="field third">
          <label className="lbl">نوع پرداخت</label>
          <select
            className="input"
            id="fld-payMode"
            value={payMode}
            onChange={(e) => setPayMode(e.target.value)}
          >
            {PAY_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {payMode !== 'cash' ? (
          <Field
            def={{ name: 'dueDate', label: 'تاریخ سررسید', type: 'date', col: 'third' }}
            values={{ dueDate }}
            setValue={(_n, v) => setDueDate(String(v))}
          />
        ) : null}
        {payMode === 'mixed' ? (
          <div className="field third">
            <label className="lbl">بیعانه</label>
            {numInput(deposit, setDeposit)}
          </div>
        ) : null}

        <div className="field third">
          <label className="lbl">سالن</label>
          <input className="input" value={hall} onChange={(e) => setHall(e.target.value)} />
        </div>
        <div className="field third">
          <label className="lbl">دوره پرورش (گله)</label>
          <select
            className="input"
            id="fld-flockId"
            value={flockId}
            onChange={(e) => {
              setFlockId(e.target.value);
              if (e.target.value) applyFlockShares(e.target.value);
            }}
          >
            <option value="">عمومی مزرعه</option>
            {s.flocks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field third">
          <label className="lbl">محل ورود به انبار</label>
          <select
            className="input"
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
          >
            {WAREHOUSES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* اقلام فاکتور */}
      <div className="sec-head" style={{ marginTop: 16 }}>
        <div>
          <h3>اقلام فاکتور</h3>
          <span className="sec-sub">{n(rows.length)} قلم</span>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>کالا / شرح</th>
              <th style={{ width: 96 }}>واحد</th>
              <th style={{ width: 78 }}>تعداد</th>
              <th style={{ width: 110 }}>قیمت واحد</th>
              <th style={{ width: 110 }}>جمع</th>
              <th style={{ width: 34 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <input
                    className="input"
                    list="inv-item-names"
                    value={r.name}
                    placeholder="انتخاب از انبار یا تایپ دستی"
                    onChange={(e) => {
                      const name = e.target.value;
                      const hit = s.inventory.find(
                        (x) => x.name.trim() === name.trim() && x.active !== false,
                      );
                      setRow(r.key, {
                        name,
                        ...(hit
                          ? {
                              unit: hit.unit || r.unit,
                              price: num(r.price) || num(hit.pricePerKg),
                            }
                          : {}),
                      });
                    }}
                  />
                </td>
                <td>
                  <select
                    className="input"
                    value={r.unit}
                    onChange={(e) => setRow(r.key, { unit: e.target.value })}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="input num"
                    inputMode="numeric"
                    value={r.qty ? String(r.qty) : ''}
                    onChange={(e) => setRow(r.key, { qty: num(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="input num"
                    inputMode="numeric"
                    value={r.price ? String(r.price) : ''}
                    onChange={(e) => setRow(r.key, { price: num(e.target.value) })}
                  />
                </td>
                <td className="num-cell">{n(num(r.qty) * num(r.price))}</td>
                <td>
                  <button
                    className="icon-btn sm"
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <datalist id="inv-item-names">
        {s.inventory
          .filter((i) => i.active !== false)
          .map((i) => (
            <option key={i.id} value={i.name}>
              {i.code ? i.code + ' — ' : ''}
              {n(i.qty)} {i.unit}
            </option>
          ))}
      </datalist>

      <button
        className="btn sm mt-sm"
        type="button"
        onClick={() =>
          setRows((prev) => [
            ...prev,
            { key: Date.now(), name: '', unit: units[0], qty: 1, price: 0 },
          ])
        }
      >
        <Icon name="plus" size={14} /> افزودن قلم
      </button>

      {/* مبالغ */}
      <div className="form-grid mt">
        <div className="field third">
          <label className="lbl">تخفیف</label>
          {numInput(discount, setDiscount)}
        </div>
        <div className="field third">
          <label className="lbl">هزینه جانبی</label>
          {numInput(extraCost, setExtraCost)}
        </div>
        <div className="field third">
          <label className="lbl">مبلغ کل</label>
          <input className="input num" value={money(total)} readOnly />
        </div>
      </div>

      {/* سهم شرکا */}
      <div className="sec-head" style={{ marginTop: 14 }}>
        <div>
          <h3>سهم شرکا در این معامله</h3>
          <span className="sec-sub">
            جمع: {n(shareSum, 1)}٪ {Math.abs(shareSum - 100) > 0.5 ? '— بهتر است ۱۰۰ باشد' : ''}
          </span>
        </div>
        <button
          className="btn sm"
          type="button"
          onClick={() => {
            if (!flockId) {
              toast('اول دوره پرورش (گله) را انتخاب کنید', 'error');
              return;
            }
            if (applyFlockShares(flockId)) toast('سهم‌ها از گله بازخوانی شد');
            else toast('برای این گله سهمی تعریف نشده است', 'error');
          }}
        >
          <Icon name="users" size={14} /> از گله
        </button>
      </div>
      <div className="form-grid">
        {s.partners.map((p) => (
          <div className="field third" key={p.id}>
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
            <div className="hint">
              {money(
                splitAmount(
                  total,
                  s.partners.map((x) => num(shares[x.id])),
                )[s.partners.indexOf(p)] || 0,
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="field full mt-sm">
        <label className="lbl">توضیحات</label>
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ---------------------------- انتقال بین حساب‌ها --------------------------- */
export function TransferForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.transfers.find((t) => t.id === id) : null;
  const accOpts = s.accounts
    .filter((a) => a.active !== false)
    .map((a) => ({ value: a.id, label: `${a.name} (${a.kind})` }));

  const fields: FieldDef[] = [
    { name: 'code', label: 'کد سند', type: 'text', col: 'third', hint: 'خودکار' },
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'third' },
    { name: 'amount', label: 'مبلغ', type: 'money', required: true, col: 'third' },
    {
      name: 'fromAccountId',
      label: 'از حساب',
      type: 'select',
      required: true,
      col: 'half',
      options: accOpts,
    },
    {
      name: 'toAccountId',
      label: 'به حساب',
      type: 'select',
      required: true,
      col: 'half',
      options: accOpts,
    },
    { name: 'note', label: 'توضیحات', type: 'textarea', col: 'full' },
  ];

  const first = s.accounts[0]?.id || '';
  const second = s.accounts[1]?.id || first;

  return (
    <FormModal
      title={editing ? `ویرایش انتقال ${editing.code}` : 'انتقال بین حساب‌ها'}
      fields={fields}
      initial={
        editing
          ? { ...editing }
          : {
              code: nextCode('TR', s.transfers.map((t) => t.code)),
              date: today(),
              fromAccountId: first,
              toAccountId: second,
              amount: 0,
              note: '',
            }
      }
      onClose={onClose}
      onSubmit={(v) => {
        if (String(v.fromAccountId) === String(v.toAccountId)) {
          toast('حساب مبدأ و مقصد نباید یکی باشند', 'error');
          return false;
        }
        if (num(v.amount) <= 0) {
          toast('مبلغ انتقال را وارد کنید', 'error');
          return false;
        }
        const data: FormValues = { ...v, amount: num(v.amount) };
        if (editing) actions.update('transfers', editing.id, data as unknown as Partial<Transfer>);
        else actions.add('transfers', data as unknown as Transfer);
        toast('انتقال ثبت شد');
      }}
    />
  );
}

/* --------------------------- دریافت و پرداخت --------------------------- */
export function PaymentForm({
  id,
  presetKind,
  onClose,
}: {
  id?: string;
  presetKind?: 'in' | 'out';
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.payments.find((p) => p.id === id) : null;

  const fields: FieldDef[] = [
    { name: 'code', label: 'شماره سند', type: 'text', col: 'third', hint: 'خودکار' },
    { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'third' },
    {
      name: 'kind',
      label: 'نوع',
      type: 'select',
      required: true,
      col: 'third',
      options: [
        { value: 'in', label: 'دریافت' },
        { value: 'out', label: 'پرداخت' },
      ],
    },
    {
      name: 'accountId',
      label: 'حساب',
      type: 'select',
      required: true,
      col: 'half',
      options: s.accounts
        .filter((a) => a.active !== false)
        .map((a) => ({ value: a.id, label: `${a.name} (${a.kind})` })),
      hint: 'حساب‌ها را از منوی «حساب‌ها» مدیریت کنید',
    },
    {
      name: 'payerId',
      label: (v) =>
        v.kind === 'in' ? 'دریافت‌کننده (شریک)' : 'پرداخت‌کننده (شریک)',
      type: 'select',
      col: 'half',
      options: [{ value: '', label: '—' }].concat(
        s.partners.map((p) => ({ value: p.id, label: p.name })),
      ),
    },
    {
      name: 'ownerId',
      label: 'مالک معامله (شریک)',
      type: 'select',
      col: 'half',
      options: [{ value: '', label: '—' }].concat(
        s.partners.map((p) => ({ value: p.id, label: p.name })),
      ),
    },
    {
      name: 'personId',
      label: 'شخص (مشتری / تامین‌کننده)',
      type: 'select',
      col: 'half',
      options: [{ value: '', label: '—' }].concat(
        s.persons.map((p) => ({ value: p.id, label: personLabel(p) })),
      ),
    },
    { name: 'amount', label: 'مبلغ', type: 'money', required: true, col: 'half' },
    {
      name: 'method',
      label: 'روش پرداخت',
      type: 'select',
      col: 'third',
      options: PAYMENT_METHODS,
    },
    {
      name: 'transactionId',
      label: 'معامله مرتبط',
      type: 'select',
      col: 'third',
      options: [{ value: '', label: '—' }].concat(
        s.transactions.map((t) => ({
          value: t.id,
          label: `${t.code} · ${TX_TYPE_LABEL[t.type] || t.type} · ${n(t.total)}`,
        })),
      ),
    },
    { name: 'note', label: 'توضیحات', type: 'textarea', col: 'full' },
  ];

  return (
    <FormModal
      title={editing ? `ویرایش سند ${editing.code}` : 'سند دریافت / پرداخت جدید'}
      fields={fields}
      initial={
        editing
          ? { ...editing }
          : {
              code: nextCode('D', s.payments.map((p) => p.code)),
              date: today(),
              kind: presetKind || 'in',
              accountId: s.accounts.find((a) => a.kind === 'صندوق مشترک')?.id || s.accounts[0]?.id || '',
              accountType: 'fund',
              partnerId: '',
              payerId: '',
              ownerId: '',
              personId: '',
              amount: 0,
              method: 'cash',
              transactionId: '',
              note: '',
            }
      }
      onClose={onClose}
      onSubmit={(v) => {
        const acc = s.accounts.find((a) => a.id === String(v.accountId));
        const isPocket = acc?.kind === 'جیب شریک' && !!acc?.partnerId;
        const data: FormValues = {
          ...v,
          amount: num(v.amount),
          accountType: isPocket ? 'partner' : 'fund',
          partnerId: isPocket ? acc!.partnerId : '',
        };
        if (editing) actions.update('payments', editing.id, data as Partial<PaymentDoc>);
        else actions.add('payments', data as unknown as PaymentDoc);
        toast('سند ثبت شد');
      }}
    />
  );
}
