/** اجزای مشترک رابط کاربری — هم‌نام با کلاس‌های CSS اصلی */
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { n, pct } from '../lib/format';

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
