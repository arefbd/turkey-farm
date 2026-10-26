/**
 * محاسبات پولی — مبالغ به «تومان صحیح» نگهداری می‌شوند.
 *
 * چرا کتابخانه‌ای مثل dinero.js یا decimal.js اضافه نشد؟
 * تمام جمع و تفریق‌ها روی عدد صحیح انجام می‌شود و در محدوده امن IEEE-754
 * (تا ۲^۵۳ ≈ ۹ کوادریلیون) دقیق است. تنها جای اعشار، تقسیم درصدی سهم شرکاست
 * که با «تخصیص باقی‌مانده» (روش largest remainder) دقیق و بدون گم‌شدن یک تومان
 * انجام می‌شود — چیزی که decimal.js هم به‌تنهایی حلش نمی‌کند.
 */

/** گرد کردن نیم‌به‌بالا به تومان صحیح */
export function roundMoney(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? -Math.round(-v) : Math.round(v);
}

/**
 * تقسیم یک مبلغ کل بر اساس درصدها، به‌طوری‌که جمع قطعات دقیقاً برابر کل باشد.
 * مثال: ۱۰۰ تومان با درصدهای [۳۳.۳۳, ۳۳.۳۳, ۳۳.۳۴] → [33, 33, 34]
 */
export function splitAmount(total: number, percents: number[]): number[] {
  const amount = roundMoney(total);
  if (!percents.length) return [];
  const sumPct = percents.reduce((a, p) => a + (Number(p) || 0), 0);
  if (sumPct <= 0) return percents.map(() => 0);

  const raw = percents.map((p) => (amount * (Number(p) || 0)) / sumPct);
  const base = raw.map((v) => Math.floor(v));
  let rest = amount - base.reduce((a, b) => a + b, 0);

  // باقی‌مانده را به بزرگ‌ترین اعشارها بده
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const out = base.slice();
  let k = 0;
  while (rest > 0 && order.length) {
    out[order[k % order.length].i] += 1;
    rest -= 1;
    k += 1;
  }
  while (rest < 0 && order.length) {
    out[order[order.length - 1 - (k % order.length)].i] -= 1;
    rest += 1;
    k += 1;
  }
  return out;
}

/** درصد یک جزء از کل (برای نمایش) */
export function pctOf(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}
