/** اجزای مشترک رابط کاربری — هم‌نام با کلاس‌های CSS اصلی */
import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { n, pct } from '../lib/format';
import { num } from '../data/store';
import { toEn } from '../lib/jalali';

export function Stat({
  icon,
  label,
  value,
  unit,
  sub,
  delta,
  tone,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  delta?: number;
  tone?: string;
}) {
  return (
    <div className={'stat ' + (tone || '')}>
      <div className="stat-top">
        <span className="stat-ic">{icon}</span>
        {delta != null && (
          <span className={'stat-delta ' + (delta > 0 ? 'up' : 'down')}>
            {delta > 0 ? '▲' : '▼'} {pct(Math.abs(delta), 1)}
          </span>
        )}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {unit ? <small> {unit}</small> : null}
      </div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export function PageHead({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function SectionHead({
  title,
  sub,
  action,
}: {
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="sec-head">
      <div>
        <h3>{title}</h3>
        {sub ? <span className="sec-sub">{sub}</span> : null}
      </div>
      {action}
    </div>
  );
}

export function Empty({
  title,
  text,
  action,
}: {
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-ic">
        <Icon name="box" size={30} />
      </div>
      <h4>{title}</h4>
      <p>{text}</p>
      {action}
    </div>
  );
}

export interface ChipItem {
  value: string;
  label: ReactNode;
}

export function Chips({
  items,
  active,
  onPick,
}: {
  items: ChipItem[];
  active: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="chips">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          className={'chip' + (String(active) === String(it.value) ? ' active' : '')}
          onClick={() => onPick(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="bar">
      <span
        style={{
          width: Math.max(0, Math.min(100, value)) + '%',
          background: color || 'var(--brand)',
        }}
      />
    </div>
  );
}

export function Avatar({
  name,
  color,
  size = 40,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const ch = (name || '؟').trim().charAt(0);
  return (
    <span
      className="avatar"
      style={{
        background: color || '#7C3AED',
        width: size,
        height: size,
        fontSize: size * 0.42,
      }}
    >
      {ch}
    </span>
  );
}

export function Badge({
  tone = 'gray',
  children,
}: {
  tone?: 'green' | 'red' | 'gray' | 'brand';
  children: ReactNode;
}) {
  return <span className={'badge ' + tone}>{children}</span>;
}

export function Kv({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function ProgressRow({
  label,
  value,
  color,
  right,
}: {
  label?: ReactNode;
  value: number;
  color?: string;
  right?: ReactNode;
}) {
  return (
    <div className="progress-row">
      {label ? <span>{label}</span> : null}
      <Bar value={value} color={color} />
      <b>{right ?? pct(value, 0)}</b>
    </div>
  );
}

/** ردیف آیکن‌دار فهرست‌ها */
export function Row({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  amount,
  amountTone,
  amountSub,
  actions,
  badge,
}: {
  icon?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: ReactNode;
  sub?: ReactNode;
  amount?: ReactNode;
  amountTone?: 'pos' | 'neg' | '';
  amountSub?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="row">
      <span
        className="row-ic"
        style={{ background: iconBg, color: iconColor, border: 0 }}
      >
        {icon}
      </span>
      <div className="row-main">
        <div className="row-title">{title}</div>
        {sub ? <div className="row-sub">{sub}</div> : null}
      </div>
      {amount != null ? (
        <div className="row-side">
          <div className={'row-amt ' + (amountTone || '')}>{amount}</div>
          <div className="row-date">{amountSub ?? 'تومان'}</div>
        </div>
      ) : null}
      {badge}
      {actions ? <div className="row-acts">{actions}</div> : null}
    </div>
  );
}

export function Num({ v, dec = 0 }: { v: number; dec?: number }) {
  return <>{n(v, dec)}</>;
}

/** ورودی عددی هوشمند با پشتیبانی کامل از ارقام فارسی/انگلیسی، اعداد رند و اعشاری بدون پریدن ممیز */
export function DecimalInput({
  id,
  value,
  onChange,
  className = 'input num',
  placeholder = '۰',
  min,
  max,
  style,
  disabled,
}: {
  id?: string;
  value: number | string | undefined | null;
  onChange: (v: number) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const [text, setText] = useState<string>(() => {
    if (value === '' || value == null) return '';
    const n = num(value);
    return Number.isFinite(n) ? String(n) : '';
  });

  useEffect(() => {
    const curVal = text === '' || text === '.' || text === '-' ? 0 : num(text);
    const propVal = value === '' || value == null ? 0 : num(value);
    if (propVal !== curVal && !text.endsWith('.') && !text.endsWith('/') && !text.endsWith('٫')) {
      setText(value === '' || value == null || (value === 0 && text === '') ? '' : String(propVal));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = toEn(e.target.value);
    // حذف هوشمند ویرگول‌های هزارگان
    raw = raw.replace(/,/g, (_, offset, str) => {
      const next3 = str.slice(offset + 1, offset + 4);
      if (/^\d{3}/.test(next3)) return '';
      return '.';
    });
    raw = raw.replace(/[/٫]/g, '.');
    raw = raw.replace(/[^0-9.-]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }

    setText(raw);

    if (raw === '' || raw === '.' || raw === '-') {
      onChange(0);
      return;
    }

    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (text === '' || text === '.' || text === '-') {
      setText('');
      onChange(0);
    } else {
      let parsed = parseFloat(text);
      if (Number.isFinite(parsed)) {
        if (min !== undefined && parsed < min) parsed = min;
        if (max !== undefined && parsed > max) parsed = max;
        setText(String(parsed));
        onChange(parsed);
      }
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      dir="ltr"
      className={className}
      style={{ textAlign: 'center', ...style }}
      placeholder={placeholder}
      value={text}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={(e) => {
        try {
          e.target.select();
        } catch {
          // ignore
        }
      }}
    />
  );
}

/** استپر انتخاب و تنظیم ساعت و دقیقه با دکمه‌های کم و زیاد شدن */
export function TimeStepper({
  value,
  onChange,
  className = '',
}: {
  value?: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const currentVal = value && value.trim() ? value : '';

  const parseTime = (str: string): { h: number; m: number } => {
    const en = toEn(str || '');
    const parts = en.split(':').map((p) => parseInt(p.trim(), 10));
    const now = new Date();
    const h = Number.isFinite(parts[0]) ? parts[0] : now.getHours();
    const m = Number.isFinite(parts[1]) ? parts[1] : now.getMinutes();
    return {
      h: Math.min(23, Math.max(0, h)),
      m: Math.min(59, Math.max(0, m)),
    };
  };

  const step = (hDelta: number, mDelta: number) => {
    const { h, m } = parseTime(currentVal);
    let totalMinutes = h * 60 + m + (hDelta * 60 + mDelta);
    totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    onChange(formatTime(newH, newM));
  };

  const setNow = () => {
    const now = new Date();
    onChange(formatTime(now.getHours(), now.getMinutes()));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = toEn(e.target.value).replace(/[^0-9:]/g, '');
    if (raw.length === 2 && !raw.includes(':') && !currentVal.includes(':')) {
      raw += ':';
    }
    onChange(raw);
  };

  const handleBlur = () => {
    const { h, m } = parseTime(currentVal);
    onChange(formatTime(h, m));
  };

  const displayTime = currentVal || formatTime(new Date().getHours(), new Date().getMinutes());

  return (
    <div className={`time-stepper ${className}`.trim()}>
      <button
        type="button"
        className="time-stepper-btn"
        onClick={() => step(-1, 0)}
        title="یک ساعت قبل (−۱ ساعت)"
      >
        −۱س
      </button>
      <button
        type="button"
        className="time-stepper-btn"
        onClick={() => step(0, -15)}
        title="۱۵ دقیقه قبل (−۱۵ دقیقه)"
      >
        −۱۵د
      </button>
      <input
        type="text"
        inputMode="numeric"
        className="time-stepper-input"
        value={displayTime}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={(e) => {
          try {
            e.target.select();
          } catch {
            // ignore
          }
        }}
        placeholder="۱۴:۳۰"
      />
      <button
        type="button"
        className="time-stepper-btn"
        onClick={() => step(0, 15)}
        title="۱۵ دقیقه بعد (+۱۵ دقیقه)"
      >
        +۱۵د
      </button>
      <button
        type="button"
        className="time-stepper-btn"
        onClick={() => step(1, 0)}
        title="یک ساعت بعد (+۱ ساعت)"
      >
        +۱س
      </button>
      <button
        type="button"
        className="time-stepper-btn now"
        onClick={setNow}
        title="تنظیم خودکار به ساعت فعلی سیستم"
      >
        الان
      </button>
    </div>
  );
}
