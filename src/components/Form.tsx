/** فیلدهای فرم و مودال فرم عمومی (اسکیمامحور) */
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, useUI } from './Modal';
import { num } from '../data/store';
import { faDigits, norm, toEn, toFa, today } from '../lib/jalali';

export type FormValues = Record<string, unknown>;

export interface Option {
  value: string;
  label: string;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'money'
  | 'date'
  | 'checkbox'
  | 'select';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  col?: 'half' | 'third' | 'full';
  required?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  step?: string;
  options?: Array<string | Option> | ((values: FormValues) => Array<string | Option>);
  visible?: (values: FormValues) => boolean;
}

const toOptions = (opts: Array<string | Option> = []): Option[] =>
  opts.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

/* ------------------------------ ورودی مبلغ ------------------------------ */
function MoneyInput({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: unknown;
  onChange: (v: number) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [text, setText] = useState(() => {
    const v = num(value);
    return v ? v.toLocaleString('en-US') : '';
  });

  useEffect(() => {
    const v = num(value);
    const current = num(text);
    if (v !== current) setText(v ? v.toLocaleString('en-US') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      className={'input num' + (invalid ? ' err' : '')}
      inputMode="numeric"
      value={text}
      placeholder={placeholder ?? '۰'}
      onChange={(e) => {
        const raw = toEn(e.target.value).replace(/[^\d]/g, '');
        setText(raw);
        onChange(num(raw));
      }}
      onBlur={() => {
        const v = num(text);
        setText(v ? v.toLocaleString('en-US') : '');
      }}
    />
  );
}

/* ------------------------------ ورودی تاریخ ----------------------------- */
function DateInput({
  value,
  onChange,
  invalid,
}: {
  value: unknown;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const initial = String(value ?? '');
  const [text, setText] = useState(() =>
    initial ? (faDigits ? toFa(initial) : initial) : '',
  );

  useEffect(() => {
    const v = String(value ?? '');
    setText(v ? (faDigits ? toFa(v) : v) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="date-wrap">
      <input
        className={'input num' + (invalid ? ' err' : '')}
        inputMode="numeric"
        value={text}
        placeholder="۱۴۰۵/۰۸/۰۲"
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const nv = norm(raw);
          if (nv) onChange(nv);
        }}
        onBlur={() => {
          const nv = norm(text);
          if (nv) {
            setText(faDigits ? toFa(nv) : nv);
            onChange(nv);
          }
        }}
      />
      <button
        type="button"
        className="date-now"
        onClick={() => {
          const t = today();
          setText(faDigits ? toFa(t) : t);
          onChange(t);
        }}
      >
        امروز
      </button>
    </div>
  );
}

/* -------------------------------- فیلد --------------------------------- */
export function Field({
  def,
  values,
  setValue,
  invalid,
}: {
  def: FieldDef;
  values: FormValues;
  setValue: (name: string, v: unknown) => void;
  invalid?: boolean;
}) {
  const col = def.col === 'half' ? 'half' : def.col === 'third' ? 'third' : 'full';
  const value = values[def.name];
  const id = 'fld-' + def.name;

  const label = (
    <label className="lbl" htmlFor={id}>
      {def.label}
      {def.required ? <span className="req"> *</span> : null}
    </label>
  );
  const hint = def.hint ? <div className="hint">{def.hint}</div> : null;

  if (def.type === 'checkbox') {
    return (
      <div className={'field ' + col}>
        <label className="switch-row">
          <input
            type="checkbox"
            id={id}
            checked={!!value}
            onChange={(e) => setValue(def.name, e.target.checked)}
          />
          <span className="switch" />
          <span>{def.label}</span>
        </label>
        {hint}
      </div>
    );
  }

  let input: ReactNode;
  if (def.type === 'select') {
    const raw =
      typeof def.options === 'function' ? def.options(values) : def.options || [];
    const opts = toOptions(raw);
    input = (
      <select
        className={'input' + (invalid ? ' err' : '')}
        id={id}
        value={String(value ?? '')}
        onChange={(e) => setValue(def.name, e.target.value)}
      >
        {def.placeholder ? <option value="">{def.placeholder}</option> : null}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (def.type === 'textarea') {
    input = (
      <textarea
        className={'input' + (invalid ? ' err' : '')}
        id={id}
        rows={2}
        placeholder={def.placeholder || ''}
        value={String(value ?? '')}
        onChange={(e) => setValue(def.name, e.target.value)}
      />
    );
  } else if (def.type === 'money') {
    input = (
      <MoneyInput
        value={value}
        onChange={(v) => setValue(def.name, v)}
        placeholder={def.placeholder}
        invalid={invalid}
      />
    );
  } else if (def.type === 'date') {
    input = (
      <DateInput value={value} onChange={(v) => setValue(def.name, v)} invalid={invalid} />
    );
  } else if (def.type === 'number') {
    input = (
      <input
        className={'input num' + (invalid ? ' err' : '')}
        id={id}
        type="number"
        step={def.step || 'any'}
        placeholder={def.placeholder || ''}
        value={value === '' || value == null ? '' : String(value)}
        onChange={(e) => setValue(def.name, e.target.value === '' ? '' : num(e.target.value))}
      />
    );
  } else {
    input = (
      <input
        className={'input' + (invalid ? ' err' : '')}
        id={id}
        type="text"
        placeholder={def.placeholder || ''}
        value={String(value ?? '')}
        onChange={(e) => setValue(def.name, e.target.value)}
      />
    );
  }

  return (
    <div className={'field ' + col}>
      {label}
      {input}
      {hint}
    </div>
  );
}

/* ------------------------------ مودال فرم ------------------------------ */
export function FormModal({
  title,
  fields,
  initial,
  submitText = 'ذخیره',
  size,
  extra,
  onSubmit,
  onClose,
  onChange,
}: {
  title: string;
  fields: FieldDef[];
  initial: FormValues;
  submitText?: string;
  size?: string;
  extra?: (values: FormValues, setValue: (n: string, v: unknown) => void) => ReactNode;
  onSubmit: (values: FormValues) => boolean | void;
  onClose: () => void;
  /** قلاب تغییر مقدار — می‌تواند patch برگرداند تا فیلدهای وابسته هم‌گام شوند */
  onChange?: (name: string, value: unknown, values: FormValues) => FormValues | void;
}) {
  const { toast } = useUI();
  const [values, setValues] = useState<FormValues>(initial);
  const [invalid, setInvalid] = useState<string | null>(null);

  const setValue = (name: string, v: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      const patch = onChange?.(name, v, next);
      return patch ? { ...next, ...patch } : next;
    });
    if (invalid === name) setInvalid(null);
  };

  const submit = () => {
    for (const f of fields) {
      if (f.visible && !f.visible(values)) continue;
      const v = values[f.name];
      const empty = v === '' || v == null || (f.type === 'money' && !num(v));
      if (f.required && empty) {
        toast(`فیلد «${f.label}» الزامی است`, 'error');
        setInvalid(f.name);
        return;
      }
      if (f.type === 'date' && f.required && !norm(String(v ?? ''))) {
        toast(`تاریخ «${f.label}» معتبر نیست`, 'error');
        setInvalid(f.name);
        return;
      }
    }
    const result = onSubmit(values);
    if (result === false) return;
    onClose();
  };

  return (
    <Modal
      title={title}
      size={size}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={submit}>
            {submitText}
          </button>
        </>
      }
    >
      <form className="form-grid" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        {fields
          .filter((f) => !f.visible || f.visible(values))
          .map((f) => (
            <Field
              key={f.name}
              def={f}
              values={values}
              setValue={setValue}
              invalid={invalid === f.name}
            />
          ))}
      </form>
      {extra ? extra(values, setValue) : null}
    </Modal>
  );
}
