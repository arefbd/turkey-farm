/** انتخابگر تاریخ شمسی — مودال تقویم (بدون وابستگی خارجی) */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { MONTHS, daysInMonth, faDigits, pad, parse, toDate, toFa, today } from '../lib/jalali';

const DOW = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

interface Props {
  value: string;
  onPick: (value: string) => void;
  onClose: () => void;
}

export function JalaliDatePicker({ value, onPick, onClose }: Props) {
  const base = parse(value) ?? parse(today())!;
  const [jy, setJy] = useState(base.jy);
  const [jm, setJm] = useState(base.jm);

  // Escape فقط همین مودال را می‌بندد (نه فرمِ زیرش)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const dim = daysInMonth(jy, jm);
  // شنبه ستون اول است؛ getDay(): 6=شنبه
  const offset = (toDate(`${pad(jy)}/${pad(jm)}/01`).getDay() + 1) % 7;
  const todayStr = today();
  const selected = value || '';

  const shift = (delta: number) => {
    let m = jm + delta;
    let y = jy;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    setJm(m);
    setJy(y);
  };

  const cells: Array<number | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const label = (n: number) => (faDigits ? toFa(n) : String(n));

  return createPortal(
    <div
      className="modal-backdrop open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal datepick-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>انتخاب تاریخ</h3>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="بستن">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="datepick-head">
            <button type="button" className="icon-btn sm" onClick={() => shift(-12)} title="سال قبل">
              »
            </button>
            <button type="button" className="icon-btn sm" onClick={() => shift(-1)} title="ماه قبل">
              ›
            </button>
            <b className="datepick-title">
              {MONTHS[jm - 1]} {label(jy)}
            </b>
            <button type="button" className="icon-btn sm" onClick={() => shift(1)} title="ماه بعد">
              ‹
            </button>
            <button type="button" className="icon-btn sm" onClick={() => shift(12)} title="سال بعد">
              «
            </button>
          </div>

          <div className="datepick-dow">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="datepick-grid">
            {cells.map((day, i) => {
              if (day == null) return <span key={'e' + i} className="datepick-cell muted" />;
              const dateStr = `${pad(jy)}/${pad(jm)}/${pad(day)}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selected;
              return (
                <button
                  key={dateStr}
                  type="button"
                  className={
                    'datepick-cell' +
                    (isToday ? ' today' : '') +
                    (isSelected ? ' selected' : '')
                  }
                  onClick={() => {
                    onPick(dateStr);
                    onClose();
                  }}
                >
                  {label(day)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-foot">
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              onPick(today());
              onClose();
            }}
          >
            امروز
          </button>
          <button className="btn primary" type="button" onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
