/**
 * تقویم شمسی — تبدیل و قالب‌بندی بدون هیچ وابستگی خارجی
 * پورت TypeScript از پیاده‌سازی اصلی (الگوریتم jalaali)
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324,
  2394, 2456, 3178,
];

const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;

export const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const WEEKDAYS = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
] as const;

const SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'] as const;

const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

/** نمایش ارقام فارسی — با تنظیمات مزرعه هم‌گام می‌شود */
export let faDigits = true;
export function setFaDigits(v: boolean) {
  faDigits = v;
}

export const pad = (n: number) => (n < 10 ? '0' : '') + n;

export function toFa(s: string | number): string {
  return String(s).replace(/\d/g, (d) => FA[+d]);
}

export function toEn(s: string | number): string {
  return String(s)
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

interface JalCal {
  leap: number;
  gy: number;
  march: number;
}

function jalCal(jy: number, withoutLeap = false): JalCal {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  let leap = 0;

  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (!withoutLeap) {
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
  }
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy, true);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export interface JDate {
  jy: number;
  jm: number;
  jd: number;
}

export function parse(s?: string | null): JDate | null {
  if (!s) return null;
  const clean = toEn(String(s))
    .replace(/[^\d]/g, '-')
    .replace(/-+/g, '-');
  const p = clean.split('-').filter(Boolean);
  if (p.length < 3) return null;
  let jy = +p[0];
  const jm = +p[1];
  const jd = +p[2];
  if (jy < 100) jy += 1400;
  if (!jy || !jm || !jd || jm > 12 || jd > 31) return null;
  return { jy, jm, jd };
}

export function norm(s?: string | null): string {
  const p = parse(s);
  return p ? pad(p.jy) + '/' + pad(p.jm) + '/' + pad(p.jd) : '';
}

export function jdn(s?: string | null): number {
  const p = parse(s);
  return p ? j2d(p.jy, p.jm, p.jd) : 0;
}

export function fromJdn(n: number): string {
  const r = d2j(n);
  return pad(r.jy) + '/' + pad(r.jm) + '/' + pad(r.jd);
}

export function fromDate(d: Date): string {
  const j = d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  return pad(j.jy) + '/' + pad(j.jm) + '/' + pad(j.jd);
}

export function today(): string {
  return fromDate(new Date());
}

export function addDays(s: string, n: number): string {
  const base = jdn(s) || jdn(today());
  return fromJdn(base + n);
}

/** فاصله روزها: b - a */
export function diff(a: string, b: string): number {
  const x = jdn(a);
  const y = jdn(b);
  if (!x || !y) return 0;
  return y - x;
}

export function toDate(s: string): Date {
  const p = parse(s);
  if (!p) return new Date();
  const g = d2g(j2d(p.jy, p.jm, p.jd));
  return new Date(g.gy, g.gm - 1, g.gd);
}

export function weekday(s: string): string {
  return WEEKDAYS[toDate(s).getDay()];
}

export function monthName(m: number): string {
  return MONTHS[(m - 1 + 12) % 12];
}

export function season(m: number): string {
  return SEASONS[Math.floor(((m - 1) % 12) / 3)];
}

export type DateStyle = 'short' | 'long' | 'full' | 'month';

/** short: ۱۴۰۵/۰۸/۰۲ | long: ۲ آبان ۱۴۰۵ | full: شنبه ۲ آبان ۱۴۰۵ */
export function format(s?: string | null, style: DateStyle = 'short'): string {
  const p = parse(s);
  if (!p) return '—';
  let out: string;
  if (style === 'long') out = `${p.jd} ${MONTHS[p.jm - 1]} ${p.jy}`;
  else if (style === 'full')
    out = `${WEEKDAYS[toDate(s!).getDay()]} ${p.jd} ${MONTHS[p.jm - 1]} ${p.jy}`;
  else if (style === 'month') out = `${MONTHS[p.jm - 1]} ${p.jy}`;
  else out = `${pad(p.jy)}/${pad(p.jm)}/${pad(p.jd)}`;
  return faDigits ? toFa(out) : out;
}

export function ago(s: string): string {
  const d = diff(s, today());
  if (d === 0) return 'امروز';
  if (d === 1) return 'دیروز';
  if (d === -1) return 'فردا';
  if (d > 1) return `${toFa(d)} روز پیش`;
  return `تا ${toFa(Math.abs(d))} روز دیگر`;
}

export interface MonthRef {
  key: string;
  label: string;
  year: number;
}

export function lastMonths(n: number): MonthRef[] {
  const t = parse(today());
  if (!t) return [];
  const out: MonthRef[] = [];
  const y = t.jy;
  const m = t.jm;
  for (let i = n - 1; i >= 0; i--) {
    let mm = m - i;
    let yy = y;
    while (mm <= 0) {
      mm += 12;
      yy -= 1;
    }
    out.push({ key: `${pad(yy)}/${pad(mm)}`, label: MONTHS[mm - 1], year: yy });
  }
  return out;
}

export function daysInMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy, false).leap === 0 ? 30 : 29;
}

export const J = {
  MONTHS,
  WEEKDAYS,
  parse,
  norm,
  jdn,
  today,
  addDays,
  diff,
  format,
  ago,
  toFa,
  toEn,
  pad,
  lastMonths,
};
