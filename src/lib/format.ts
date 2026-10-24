/** قالب‌بندی اعداد، مبالغ و خروجی CSV */
import { faDigits, toFa } from './jalali';
import { num } from '../data/store';

export function n(v: unknown, dec = 0): string {
  const value = typeof v === 'number' ? v : num(v);
  const s = value.toLocaleString('en-US', {
    maximumFractionDigits: dec,
    minimumFractionDigits: 0,
  });
  return faDigits ? toFa(s) : s;
}

export function money(v: unknown, currency = 'تومان'): string {
  return n(v) + ' ' + currency;
}

/** خلاصه خوانا: ۱.۲ میلیارد */
export function short(v: unknown): string {
  const value = typeof v === 'number' ? v : num(v);
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  let out: string;
  if (abs >= 1e9) out = (abs / 1e9).toFixed(1).replace(/\.0$/, '') + ' میلیارد';
  else if (abs >= 1e6) out = (abs / 1e6).toFixed(1).replace(/\.0$/, '') + ' میلیون';
  else if (abs >= 1e3) out = (abs / 1e3).toFixed(0) + ' هزار';
  else out = String(Math.round(abs));
  return sign + (faDigits ? toFa(out) : out);
}

export function pct(v: unknown, dec = 1): string {
  return n(v, dec) + '٪';
}

/** ساخت رشته CSV با escape صحیح */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c == null ? '' : c).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(','),
    )
    .join('\r\n');
}

/** دانلود فایل در مرورگر (با BOM برای اکسل فارسی) */
export function download(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\ufeff' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 400);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
