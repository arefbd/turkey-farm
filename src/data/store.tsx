/**
 * استور مرکزی — React 19 + useSyncExternalStore
 * وضعیت تغییرناپذیر (immutable) است؛ هر تغییر یک snapshot تازه می‌سازد
 * و همه کامپوننت‌های مشترک دوباره رندر می‌شوند.
 *
 * ذخیره‌سازی: Supabase (جدول tf_records + tf_settings) با همگام‌سازی تفاضلی —
 * فقط رکوردهای تغییرکرده به سرور می‌روند.
 */
import { useSyncExternalStore } from 'react';
import * as J from '../lib/jalali';
import { setFaDigits } from '../lib/jalali';
import { blank, seed, uid } from './seed';
import { CAT_MAP, GOODS_CATS } from './categories';
import {
  COLLECTIONS,
  assemble,
  deleteAllRecords,
  deleteRecords,
  fetchAll,
  insertRecords,
  saveSettings,
  upsertRecord,
} from './remote';
import type {
  AlertItem,
  AppState,
  Batch,
  CategorySlice,
  CollectionKey,
  DailyRecord,
  Expense,
  ExpenseFilter,
  FlockStats,
  Formula,
  Person,
  Settlement,
  StockMove,
  Settings,
  Totals,
  Transaction,
  TxItem,
  TxSums,
} from './types';

/* ------------------------------ ابزار عددی ------------------------------ */
export function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let raw = String(v == null ? 0 : v);
  raw = J.toEn(raw);
  const n = parseFloat(raw.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const sum = <T,>(arr: T[], key?: keyof T): number =>
  arr.reduce((a, o) => a + (key ? num(o[key]) : num(o)), 0);

/* ------------------------------ نرمال‌سازی ------------------------------ */
function normalize(s: AppState): AppState {
  const cols: CollectionKey[] = [
    'expenses',
    'sales',
    'daily',
    'tasks',
    'vaccines',
    'batches',
    'contributions',
    'transactions',
    'payments',
    'stockMoves',
  ];
  const next = { ...s };
  for (const col of cols) {
    const list = ((next[col] ?? []) as unknown) as Array<Record<string, unknown>>;
    next[col] = list.map((o) => {
      if (typeof o.date === 'string' && o.date) {
        const n = J.norm(o.date);
        if (n) return { ...o, date: n };
      }
      return o;
    }) as never;
  }
  next.flocks = (next.flocks || []).map((f) => ({
    ...f,
    chickAge: num(f.chickAge),
    startDate: J.norm(f.startDate) || f.startDate,
    endDate: f.endDate ? J.norm(f.endDate) || f.endDate : '',
  }));
  next.inventory = (next.inventory || []).map((i) => ({
    ...i,
    code: i.code || '',
    active: i.active !== false,
    note: i.note || '',
    expiry: i.expiry || '',
  }));
  next.transactions = (next.transactions || []).map((t) => ({ ...t, locked: !!t.locked }));
  next.payments = (next.payments || []).map((p) => ({ ...p, locked: !!p.locked }));
  next.accounts = (next.accounts || []).map((a) => ({
    ...a,
    kind: a.kind || 'صندوق مشترک',
    opening: num(a.opening),
    partnerId: a.partnerId || '',
    note: a.note || '',
    active: a.active !== false,
  }));
  next.transfers = next.transfers || [];
  next.flocks = (next.flocks || []).map((f) => ({
    ...f,
    shareMode: f.shareMode === 'percent' ? 'percent' : 'unit',
    shares: (f.shares || []).map((x) => ({
      partnerId: x.partnerId,
      units: num(x.units),
      percent: num(x.percent),
    })),
  }));
  next.persons = next.persons || [];
  next.transactions = next.transactions || [];
  next.payments = next.payments || [];
  next.stockMoves = next.stockMoves || [];
  next.settings = { ...blank().settings, ...(next.settings || {}) };
  return next;
}

/* ------------------------------ هسته استور ------------------------------ */
export type SyncStatus = 'loading' | 'ready' | 'error';

export interface SyncInfo {
  status: SyncStatus;
  error: string;
  userId: string | null;
  pending: number;
}

let state: AppState = blank();
let userId: string | null = null;
let synced: AppState = state;
let pending = 0;
let syncInfo: SyncInfo = { status: 'loading', error: '', userId: null, pending: 0 };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setSync(patch: Partial<SyncInfo>) {
  syncInfo = { ...syncInfo, ...patch };
  emit();
}

function fail(e: unknown) {
  setSync({ status: 'error', error: e instanceof Error ? e.message : String(e) });
}

function commit(next: AppState) {
  state = next;
  setFaDigits(next.settings.persianDigits !== false);
  emit();
  persist();
}

/** همگام‌سازی تفاضلی — فقط رکوردهای تغییرکرده به سرور می‌روند */
async function syncDiff(prev: AppState, next: AppState) {
  const jobs: Array<Promise<unknown>> = [];

  for (const col of COLLECTIONS) {
    const prevList = prev[col] as unknown as Array<Record<string, unknown>>;
    const nextList = next[col] as unknown as Array<Record<string, unknown>>;
    const prevMap = new Map(prevList.map((o) => [String(o.id), o]));
    const nextIds = new Set(nextList.map((o) => String(o.id)));

    // مقایسه مرجع: آبجکت‌های تغییرنکرده همان مرجع قبلی را دارند
    const changed = nextList.filter((o) => prevMap.get(String(o.id)) !== o);
    const removed = [...prevMap.keys()].filter((id) => !nextIds.has(id));

    if (changed.length) {
      jobs.push(Promise.all(changed.map((o) => upsertRecord(col, o))));
    }
    if (removed.length) jobs.push(deleteRecords(removed));
  }

  if (prev.settings !== next.settings && userId) {
    jobs.push(saveSettings(userId, next.settings));
  }

  await Promise.all(jobs);
}

function persist() {
  const prev = synced;
  synced = state;
  if (!userId) return;

  pending += 1;
  setSync({ pending });

  void syncDiff(prev, state)
    .then(() => {
      pending = Math.max(0, pending - 1);
      setSync({ pending, status: pending ? syncInfo.status : 'ready', error: '' });
    })
    .catch((e) => {
      pending = Math.max(0, pending - 1);
      fail(e);
    });
}

/** بارگذاری داده‌های کاربر از Supabase */
export async function hydrate(uid: string) {
  userId = uid;
  setSync({ userId: uid, status: 'loading', error: '' });
  try {
    const { records, settings } = await fetchAll();
    const assembled = assemble(records, settings, blank().settings);
    // normalize: رکوردهای قدیمیِ بدون فیلدهای جدید (expiry، locked، shares، accountId)
    // را با مقادیر پیش‌فرض سالم می‌کند
    state = normalize({ ...blank(), ...assembled, version: 2 });
    synced = state;
    setFaDigits(state.settings.persianDigits !== false);
    setSync({ status: 'ready', error: '' });
  } catch (e) {
    fail(e);
  }
}

/** خروج — پاک کردن وضعیت از حافظه */
export function detach() {
  userId = null;
  state = blank();
  synced = state;
  pending = 0;
  setSync({ userId: null, status: 'loading', error: '', pending: 0 });
}

/** بازفرست کامل وضعیت به سرور (برای بازیابی پس از خطا) */
export async function resync() {
  if (!userId) return;
  setSync({ status: 'loading', error: '' });
  try {
    await deleteAllRecords(userId);
    for (const col of COLLECTIONS) {
      const rows = state[col] as unknown as Array<Record<string, unknown>>;
      if (rows.length) await insertRecords(col, rows);
    }
    await saveSettings(userId, state.settings);
    synced = state;
    setSync({ status: 'ready', error: '' });
  } catch (e) {
    fail(e);
  }
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getSnapshot = () => state;
const getSyncSnapshot = () => syncInfo;

/** خواندن وضعیت در کامپوننت — با هر تغییر دوباره رندر می‌شود */
export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** وضعیت همگام‌سازی با Supabase */
export function useSyncInfo(): SyncInfo {
  return useSyncExternalStore(subscribe, getSyncSnapshot, getSyncSnapshot);
}

export function getState(): AppState {
  return state;
}

/* -------------------------------- اکشن‌ها -------------------------------- */
export const actions = {
  add<K extends CollectionKey>(col: K, obj: Omit<AppState[K][number], 'id' | 'createdAt'> & { id?: string }): void {
    const record = {
      ...obj,
      id: obj.id || uid(),
      createdAt: Date.now(),
    };
    commit({ ...state, [col]: [record, ...(state[col] as unknown[])] } as AppState);
  },

  addMany<K extends CollectionKey>(col: K, objs: AppState[K]): void {
    commit({ ...state, [col]: [...objs, ...(state[col] as unknown[])] } as AppState);
  },

  update<K extends CollectionKey>(col: K, id: string, patch: Partial<AppState[K][number]>): void {
    const list = state[col] as Array<{ id: string }>;
    commit({
      ...state,
      [col]: list.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    } as AppState);
  },

  remove<K extends CollectionKey>(col: K, id: string): void {
    const list = state[col] as Array<{ id: string }>;
    commit({ ...state, [col]: list.filter((o) => o.id !== id) } as AppState);
  },

  /** حذف گله همراه با رکوردهای روزانه‌اش */
  removeFlock(id: string): void {
    commit({
      ...state,
      flocks: state.flocks.filter((f) => f.id !== id),
      daily: state.daily.filter((d) => d.flockId !== id),
    });
  },

  /**
   * تغییر موجودی انبار بر اساس نام کالا (مثبت = ورود، منفی = خروج)
   * هر تغییر یک سطر در دفتر حرکات انبار (کاردکس) ثبت می‌کند.
   */
  adjustStock(
    delta: Record<string, number>,
    meta?: {
      date?: string;
      reason?: string;
      refType?: 'manual' | 'transaction' | 'adjust';
      refId?: string;
      note?: string;
    },
  ): void {
    const entries = Object.entries(delta).filter(([, v]) => Math.abs(v) > 0.0001);
    if (!entries.length) return;

    const moves: StockMove[] = [];
    const inventory = state.inventory.map((item) => {
      const hit = entries.find(([name]) => name === String(item.name || '').trim());
      if (!hit) return item;
      const before = num(item.qty);
      const after = Math.max(0, before + hit[1]);
      if (after === before) return item;
      moves.push({
        id: uid(),
        createdAt: Date.now(),
        date: meta?.date || J.today(),
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        kind: hit[1] >= 0 ? 'in' : 'out',
        qty: Math.abs(hit[1]),
        before,
        after,
        reason: meta?.reason || 'اصلاح شمارش',
        refType: meta?.refType || 'manual',
        refId: meta?.refId || '',
        note: meta?.note || '',
      });
      return { ...item, qty: after };
    });

    if (!moves.length) return;
    commit({ ...state, inventory, stockMoves: [...moves, ...state.stockMoves] });
  },

  setSettings(patch: Partial<Settings>): void {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },

  reset(withSeed: boolean): void {
    const next = withSeed ? seed() : blank();
    commit(next);
  },

  importJSON(json: string): void {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    if (!parsed || !parsed.partners) throw new Error('ساختار فایل معتبر نیست');
    commit(normalize(parsed as AppState));
  },

  exportJSON(): string {
    return JSON.stringify(state, null, 2);
  },
};

/* -------------------------------- سلکتورها -------------------------------- */
const byDateAsc = (a: { date: string }, b: { date: string }) => J.jdn(a.date) - J.jdn(b.date);
const byDateDesc = (a: { date: string }, b: { date: string }) => J.jdn(b.date) - J.jdn(a.date);

export function flockById(s: AppState, id: string) {
  return s.flocks.find((f) => f.id === id) ?? null;
}

export function partnerById(s: AppState, id: string) {
  return s.partners.find((p) => p.id === id) ?? null;
}

export function partnerName(s: AppState, id: string): string {
  if (!id || id === 'fund') return 'صندوق مشترک';
  return partnerById(s, id)?.name ?? '—';
}

export function flockLabel(s: AppState, id: string): string {
  return flockById(s, id)?.name ?? 'عمومی مزرعه';
}

export function activeFlocks(s: AppState) {
  return s.flocks.filter((f) => f.status !== 'closed');
}

export function totalShare(s: AppState): number {
  return sum(s.partners, 'share');
}

/** سهم هر شریک از یک هزینه */
export function expenseShares(s: AppState, exp: Expense): Record<string, number> {
  const partners = s.partners;
  const total = num(exp.amount);
  const out: Record<string, number> = {};
  if (!partners.length) return out;

  if (exp.split === 'custom' && exp.shares) {
    partners.forEach((p) => {
      out[p.id] = (total * num(exp.shares?.[p.id])) / 100;
    });
  } else if (exp.split === 'equal') {
    partners.forEach((p) => {
      out[p.id] = total / partners.length;
    });
  } else if (exp.split === 'single') {
    partners.forEach((p) => {
      out[p.id] = p.id === exp.paidBy ? total : 0;
    });
  } else {
    const t = totalShare(s);
    if (t <= 0) {
      partners.forEach((p) => {
        out[p.id] = total / partners.length;
      });
    } else {
      partners.forEach((p) => {
        out[p.id] = (total * num(p.share)) / t;
      });
    }
  }
  return out;
}

export function filterExpenses(s: AppState, f: ExpenseFilter = {}): Expense[] {
  let list = s.expenses.slice();
  if (f.cat) list = list.filter((e) => e.category === f.cat);
  if (f.flockId) list = list.filter((e) => e.flockId === f.flockId);
  if (f.partnerId) list = list.filter((e) => e.paidBy === f.partnerId);
  if (f.from) list = list.filter((e) => J.jdn(e.date) >= J.jdn(f.from));
  if (f.to) list = list.filter((e) => J.jdn(e.date) <= J.jdn(f.to));
  if (f.q) {
    const q = f.q.trim();
    list = list.filter(
      (e) =>
        (e.title || '').includes(q) ||
        (e.sub || '').includes(q) ||
        (e.note || '').includes(q),
    );
  }
  return list.sort(byDateDesc);
}

export function totals(s: AppState, filter: ExpenseFilter = {}): Totals {
  const exps = filterExpenses(s, filter);
  let sales = s.sales.slice();
  if (filter.flockId) sales = sales.filter((x) => x.flockId === filter.flockId);
  if (filter.from) sales = sales.filter((x) => J.jdn(x.date) >= J.jdn(filter.from!));
  if (filter.to) sales = sales.filter((x) => J.jdn(x.date) <= J.jdn(filter.to!));

  let txs = s.transactions.slice();
  if (filter.flockId) txs = txs.filter((t) => t.flockId === filter.flockId);
  if (filter.from) txs = txs.filter((t) => J.jdn(t.date) >= J.jdn(filter.from!));
  if (filter.to) txs = txs.filter((t) => J.jdn(t.date) <= J.jdn(filter.to!));

  const exp = sum(exps, 'amount');
  const legacyRev = sum(sales, 'amount');
  const tx = sumTransactions(txs);
  const rev = legacyRev + tx.revenue;
  const profit = rev - exp - tx.purchase;

  return {
    expenses: exp,
    purchase: tx.purchase,
    revenue: rev,
    profit,
    count: exps.length + txs.length,
    salesCount: sales.length + tx.saleCount,
    salesKg: sum(sales, 'qtyKg'),
    margin: rev > 0 ? (profit / rev) * 100 : 0,
  };
}

/** جمع معاملات: فروش خالص و بهای خرید خالص */
export function sumTransactions(list: Transaction[]): TxSums {
  let revenue = 0;
  let purchase = 0;
  let saleReturn = 0;
  let purchaseReturn = 0;
  let saleCount = 0;
  let purchaseCount = 0;

  list.forEach((t) => {
    const total = num(t.total);
    if (t.type === 'sale') {
      revenue += total;
      saleCount += 1;
    } else if (t.type === 'sale_return') {
      revenue -= total;
      saleReturn += total;
    } else if (t.type === 'purchase') {
      purchase += total;
      purchaseCount += 1;
    } else if (t.type === 'purchase_return') {
      purchase -= total;
      purchaseReturn += total;
    }
  });

  return {
    revenue,
    purchase,
    saleReturn,
    purchaseReturn,
    count: list.length,
    saleCount,
    purchaseCount,
  };
}

/** تعداد فروش‌رفته یک گله — محاسبه خودکار از معاملات فروش */
export function soldCountForFlock(s: AppState, flockId: string): number {
  let n = 0;
  s.transactions.forEach((t) => {
    if (t.flockId !== flockId) return;
    const qty = (t.items || []).reduce((a, i) => a + num(i.qty), 0);
    if (t.type === 'sale') n += qty;
    else if (t.type === 'sale_return') n -= qty;
  });
  return Math.max(0, Math.round(n));
}

/* ---------------------- جریان نقدی و مطالبات ---------------------- */

export interface OpenItem {
  txId: string;
  code: string;
  date: string;
  type: string;
  personId: string;
  personName: string;
  total: number;
  paid: number;
  remaining: number;
  dueDate: string;
  overdueDays: number;
}

/** فاکتورهای باز: مبلغ فاکتور منهای دریافت/پرداخت‌های مرتبط */
export function openItems(s: AppState): OpenItem[] {
  const paidByTx: Record<string, number> = {};
  s.payments.forEach((p) => {
    if (!p.transactionId) return;
    paidByTx[p.transactionId] = (paidByTx[p.transactionId] || 0) + num(p.amount);
  });

  return s.transactions
    .filter((t) => t.type === 'sale' || t.type === 'purchase')
    .map((t) => {
      const total = num(t.total);
      // فاکتور نقدی همان لحظه تسویه شده؛ نقد و نسیه فقط به اندازه بیعانه
      const baseline =
        t.payMode === 'cash' ? total : t.payMode === 'mixed' ? num(t.deposit) : 0;
      const paid = Math.min(total, Math.max(paidByTx[t.id] || 0, baseline));
      const remaining = Math.max(0, total - paid);
      const due = t.dueDate || '';
      const overdueDays = remaining > 0 && due ? Math.max(0, J.diff(due, J.today())) : 0;
      return {
        txId: t.id,
        code: t.code,
        date: t.date,
        type: t.type,
        personId: t.personId,
        personName: t.personName || personName(s, t.personId),
        total: num(t.total),
        paid,
        remaining,
        dueDate: due,
        overdueDays,
      };
    })
    .sort((a, b) => b.overdueDays - a.overdueDays || b.date.localeCompare(a.date));
}

export interface ReceivableSummary {
  items: OpenItem[];
  receivable: number;
  payable: number;
  net: number;
  overdue: number;
  unlinkedPayments: number;
  collected: number;
  billed: number;
}

export function receivables(s: AppState): ReceivableSummary {
  const items = openItems(s);
  const receivable = items
    .filter((i) => i.type === 'sale')
    .reduce((a, i) => a + i.remaining, 0);
  const payable = items
    .filter((i) => i.type === 'purchase')
    .reduce((a, i) => a + i.remaining, 0);
  const overdue = items
    .filter((i) => i.overdueDays > 0)
    .reduce((a, i) => a + i.remaining, 0);
  const billed = items.reduce((a, i) => a + i.total, 0);
  const collected = items.reduce((a, i) => a + i.paid, 0);

  return {
    items,
    receivable,
    payable,
    net: receivable - payable,
    overdue,
    unlinkedPayments: s.payments.filter((p) => !p.transactionId).length,
    collected,
    billed,
  };
}

/** جریان نقدی ماهانه بر اساس اسناد دریافت/پرداخت */
export function cashSeries(s: AppState, n = 6) {
  return J.lastMonths(n).map((m) => {
    const list = s.payments.filter((p) => p.date.slice(0, 7) === m.key);
    return {
      key: m.key,
      label: m.label,
      income: list.filter((p) => p.kind === 'in').reduce((a, p) => a + num(p.amount), 0),
      expense: list.filter((p) => p.kind === 'out').reduce((a, p) => a + num(p.amount), 0),
    };
  });
}

/* ------------------------------ حساب‌ها ------------------------------ */

/** موجودی یک حساب: اولیه + دریافت‌ها − پرداخت‌ها ± انتقال‌ها */
export function accountBalance(s: AppState, accountId: string): number {
  const acc = s.accounts.find((a) => a.id === accountId);
  if (!acc) return 0;
  let bal = num(acc.opening);
  s.payments.forEach((p) => {
    if (p.accountId !== accountId) return;
    bal += p.kind === 'in' ? num(p.amount) : -num(p.amount);
  });
  s.transfers.forEach((t) => {
    if (t.toAccountId === accountId) bal += num(t.amount);
    if (t.fromAccountId === accountId) bal -= num(t.amount);
  });
  return bal;
}

export function accountById(s: AppState, id: string) {
  return s.accounts.find((a) => a.id === id) ?? null;
}

/** درصد سهم هر شریک در یک گله (از واحد یا درصد ذخیره‌شده) */
export function flockSharePercents(s: AppState, flockId: string): Record<string, number> {
  const f = s.flocks.find((x) => x.id === flockId);
  if (!f || !f.shares?.length) return {};
  const totalUnits = f.shares.reduce((a, x) => a + num(x.units), 0);
  const totalPct = f.shares.reduce((a, x) => a + num(x.percent), 0);
  const out: Record<string, number> = {};
  f.shares.forEach((x) => {
    if (f.shareMode === 'percent') {
      out[x.partnerId] = totalPct > 0 ? (num(x.percent) / totalPct) * 100 : 0;
    } else {
      out[x.partnerId] = totalUnits > 0 ? (num(x.units) / totalUnits) * 100 : 0;
    }
  });
  return out;
}

/** حرکات یک کالا، جدیدترین اول */
export function stockMovesFor(s: AppState, itemId: string): StockMove[] {
  return s.stockMoves
    .filter((m) => m.itemId === itemId)
    .sort((a, b) => J.jdn(b.date) - J.jdn(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function personById(s: AppState, id: string) {
  return s.persons.find((p) => p.id === id) ?? null;
}

export function personLabel(p: Person | null | undefined): string {
  if (!p) return '—';
  if (p.company) return p.company;
  return `${p.firstName} ${p.lastName}`.trim() || p.code;
}

export function personName(s: AppState, id: string): string {
  if (!id) return '—';
  return personLabel(personById(s, id));
}

/** تولید کد یکتا با پیشوند (P-1001، S-1001 ...) */
export function nextCode(prefix: string, existing: string[]): string {
  let max = 1000;
  existing.forEach((c) => {
    const m = String(c || '').match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `${prefix}-${max + 1}`;
}

/** تغییر موجودی انبار ناشی از یک معامله (dir = 1 اعمال، -1 برگشت) */
export function txStockDelta(tx: Transaction, dir: 1 | -1): Record<string, number> {
  const out: Record<string, number> = {};
  const sign =
    tx.type === 'purchase' || tx.type === 'sale_return'
      ? 1
      : tx.type === 'sale' || tx.type === 'purchase_return'
        ? -1
        : 0;
  if (!sign) return out;
  (tx.items || []).forEach((i) => {
    const name = String(i.name || '').trim();
    if (!name) return;
    out[name] = (out[name] || 0) + sign * dir * num(i.qty);
  });
  return out;
}

/** مبلغ کل یک معامله با احتساب تخفیف و هزینه جانبی */
export function txTotal(items: TxItem[], discount = 0, extraCost = 0): number {
  const base = (items || []).reduce((a, i) => a + num(i.qty) * num(i.price), 0);
  return Math.max(0, base - num(discount) + num(extraCost));
}

export function byCategory(s: AppState, filter: ExpenseFilter = {}): CategorySlice[] {
  const map: Record<string, number> = {};
  filterExpenses(s, filter).forEach((e) => {
    map[e.category] = (map[e.category] || 0) + num(e.amount);
  });
  return Object.keys(map)
    .map((k) => {
      const c = CAT_MAP[k] ?? { label: k, color: '#94A3B8', icon: '📦' };
      return { id: k, label: c.label, color: c.color, icon: c.icon, value: map[k] };
    })
    .sort((a, b) => b.value - a.value);
}

export function monthlySeries(s: AppState, n = 6) {
  return J.lastMonths(n).map((m) => {
    const e = s.expenses.filter((x) => x.date.slice(0, 7) === m.key);
    const sa = s.sales.filter((x) => x.date.slice(0, 7) === m.key);
    return {
      key: m.key,
      label: m.label,
      expense: sum(e, 'amount'),
      income: sum(sa, 'amount'),
    };
  });
}

export interface RecentItem {
  kind: 'expense' | 'sale';
  date: string;
  title: string;
  sub: string;
  amount: number;
  icon: string;
  color: string;
}

export function recent(s: AppState, n = 6): RecentItem[] {
  const items: RecentItem[] = [];
  s.expenses.slice(0, 40).forEach((e) => {
    items.push({
      kind: 'expense',
      date: e.date,
      title: e.title,
      sub: CAT_MAP[e.category]?.label ?? '',
      amount: -num(e.amount),
      icon: '💸',
      color: '#EF4444',
    });
  });
  s.sales.slice(0, 40).forEach((x) => {
    items.push({
      kind: 'sale',
      date: x.date,
      title: 'فروش ' + x.type,
      sub: num(x.qtyKg) + ' کیلو',
      amount: num(x.amount),
      icon: '🍗',
      color: '#10B981',
    });
  });
  return items.sort((a, b) => J.jdn(b.date) - J.jdn(a.date)).slice(0, n);
}

export function flockStats(s: AppState, id: string): FlockStats | null {
  const f = flockById(s, id);
  if (!f) return null;
  const recs = s.daily.filter((d) => d.flockId === id).sort(byDateAsc);

  let mort = 0;
  let culled = 0;
  let feed = 0;
  let water = 0;
  let lastW = 0;
  let lastRec: DailyRecord | null = null;

  recs.forEach((r) => {
    mort += num(r.mortality);
    culled += num(r.culled);
    feed += num(r.feedKg);
    water += num(r.waterL);
    if (num(r.avgWeightG) > 0) {
      lastW = num(r.avgWeightG);
      lastRec = r;
    }
  });

  const sold = num(f.soldCount) + soldCountForFlock(s, id);
  const alive = Math.max(0, num(f.startCount) - mort - culled - sold);
  const end = f.endDate || J.today();
  const age = Math.max(0, J.diff(f.startDate, end)) + num(f.chickAge);
  const biomass = (alive * lastW) / 1000;
  const gainKg = biomass - num(f.startCount) * 0.06;
  const tx = sumTransactions(s.transactions.filter((t) => t.flockId === id));
  const exp = sum(s.expenses.filter((e) => e.flockId === id), 'amount') + tx.purchase;
  const rev = sum(s.sales.filter((x) => x.flockId === id), 'amount') + tx.revenue;

  return {
    flock: f,
    age,
    records: recs.length,
    mortality: mort,
    culled,
    alive,
    sold,
    mortalityPct: num(f.startCount) ? ((mort + culled) / num(f.startCount)) * 100 : 0,
    survivalPct: num(f.startCount) ? (alive / num(f.startCount)) * 100 : 0,
    feedKg: feed,
    waterL: water,
    avgWeightG: lastW,
    weightDate: lastRec ? (lastRec as DailyRecord).date : null,
    biomass,
    fcr: gainKg > 0 ? feed / gainKg : 0,
    expenses: exp,
    revenue: rev,
    profit: rev - exp,
    costPerKg: biomass > 0 ? exp / biomass : 0,
    feedPerBird: alive ? feed / alive : 0,
  };
}

export function settlement(s: AppState, filter: ExpenseFilter = {}): Settlement {
  const exps = filterExpenses(s, filter);
  const totalExp = sum(exps, 'amount');

  // معاملات در همان بازه فیلتر
  let txs = s.transactions.slice();
  if (filter.flockId) txs = txs.filter((t) => t.flockId === filter.flockId);
  if (filter.from) txs = txs.filter((t) => J.jdn(t.date) >= J.jdn(filter.from!));
  if (filter.to) txs = txs.filter((t) => J.jdn(t.date) <= J.jdn(filter.to!));

  const payments = s.payments.filter((p) => {
    if (filter.from && J.jdn(p.date) < J.jdn(filter.from)) return false;
    if (filter.to && J.jdn(p.date) > J.jdn(filter.to)) return false;
    return true;
  });
  const cashIn = payments.filter((p) => p.kind === 'in').reduce((a, p) => a + num(p.amount), 0);
  const cashOut = payments.filter((p) => p.kind === 'out').reduce((a, p) => a + num(p.amount), 0);

  const rows = s.partners.map((p) => {
    let shareExp = 0;
    let paidDirect = 0;
    exps.forEach((e) => {
      shareExp += num(expenseShares(s, e)[p.id]);
      if (e.paidBy === p.id) paidDirect += num(e.amount);
    });

    // سهم شریک از خرید و فروش هر معامله
    let shareBuy = 0;
    let shareSell = 0;
    txs.forEach((t) => {
      const sh = (t.shares || []).find((x) => x.partnerId === p.id);
      if (!sh) return;
      const amt = num(sh.amount);
      if (t.type === 'purchase') shareBuy += amt;
      else if (t.type === 'purchase_return') shareBuy -= amt;
      else if (t.type === 'sale') shareSell += amt;
      else if (t.type === 'sale_return') shareSell -= amt;
    });

    const capital = sum(
      s.contributions.filter((c) => c.partnerId === p.id),
      'amount',
    );
    const shareTx = shareSell - shareBuy;

    // اثر اسناد دریافت/پرداخت: پولی که شریک از جیب داده یا به دست گرفته
    let paidOut = 0;
    let received = 0;
    payments.forEach((pay) => {
      if (pay.kind === 'out' && pay.payerId === p.id) paidOut += num(pay.amount);
      if (pay.kind === 'in' && pay.accountType === 'partner' && pay.partnerId === p.id) {
        received += num(pay.amount);
      }
    });

    // اثر انتقال بین حساب‌ها: پول از جیب شریک خارج یا به آن وارد شود
    s.transfers.forEach((t) => {
      const from = accountById(s, t.fromAccountId);
      const to = accountById(s, t.toAccountId);
      if (from?.kind === 'جیب شریک' && from.partnerId === p.id) paidOut += num(t.amount);
      if (to?.kind === 'جیب شریک' && to.partnerId === p.id) received += num(t.amount);
    });

    return {
      id: p.id,
      name: p.name,
      share: num(p.share),
      color: p.color,
      capital,
      paidDirect,
      shareExp,
      shareBuy,
      shareSell,
      shareTx,
      paidOut,
      received,
      balance: capital + paidDirect + paidOut - received - shareExp + shareTx,
    };
  });

  const surplus = rows.reduce((a, r) => a + r.balance, 0);
  const txNet = rows.reduce((a, r) => a + r.shareTx, 0);
  return { rows, totalExp, surplus, txNet, cashIn, cashOut, cashBalance: cashIn - cashOut };
}

export function alerts(s: AppState): AlertItem[] {
  const out: AlertItem[] = [];

  activeFlocks(s).forEach((f) => {
    const st = flockStats(s, f.id);
    if (!st) return;
    const recs = s.daily
      .filter((d) => d.flockId === f.id)
      .sort(byDateAsc)
      .slice(-7);
    const m7 = sum(recs, 'mortality');

    if (st.alive && m7 / st.alive > 0.012) {
      out.push({
        level: 'danger',
        icon: '⚠️',
        title: 'تلفات بالای گله ' + f.name,
        text: `در ۷ روز گذشته ${m7} قطعه تلف شده است.`,
      });
    }
    if (recs.length === 0) {
      out.push({
        level: 'warn',
        icon: '📝',
        title: 'ثبت روزانه انجام نشده',
        text: `برای گله ${f.name} هیچ رکورد روزانه‌ای ثبت نشده است.`,
      });
    } else {
      const last = recs[recs.length - 1];
      const gap = J.diff(last.date, J.today());
      if (gap > 2) {
        out.push({
          level: 'warn',
          icon: '⏰',
          title: 'ثبت روزانه عقب افتاده',
          text: `${f.name} — آخرین ثبت ${J.ago(last.date)}`,
        });
      }
    }
    if (st.avgWeightG && st.age > 28 && st.avgWeightG < st.age * 60) {
      out.push({
        level: 'warn',
        icon: '⚖️',
        title: 'وزن گله عقب‌تر از انتظار',
        text: `${f.name} — وزن میانگین ${st.avgWeightG} گرم در روز ${st.age}`,
      });
    }
  });

  s.tasks
    .filter((t) => !t.done && J.diff(t.date, J.today()) >= 0)
    .slice(0, 3)
    .forEach((t) => {
      out.push({
        level: 'info',
        icon: '🔔',
        title: t.title,
        text: 'موعد: ' + J.format(t.date, 'long'),
      });
    });

  s.inventory.forEach((i) => {
    if (!i.expiry || i.active === false) return;
    const left = J.diff(J.today(), i.expiry);
    if (left < 0) {
      out.push({
        level: 'danger',
        icon: '⏳',
        title: `${i.name} منقضی شده است`,
        text: `تاریخ انقضا: ${J.format(i.expiry, 'long')}`,
      });
    } else if (left <= 30) {
      out.push({
        level: 'warn',
        icon: '⏳',
        title: `${i.name} نزدیک انقضا`,
        text: `${left} روز تا انقضا — ${J.format(i.expiry, 'long')}`,
      });
    }
  });

  const goodsExpenses = s.expenses.filter((e) => GOODS_CATS.includes(e.category));
  if (goodsExpenses.length && s.transactions.some((t) => t.type === 'purchase')) {
    out.push({
      level: 'warn',
      icon: '⚖️',
      title: 'احتمال دوباره‌شماری خرید',
      text: `${goodsExpenses.length} هزینه از دسته‌های کالایی (دان، جوجه، گوشت، واکسن) ثبت شده — اگر همان خرید در «معاملات» هم هست، سود دو بار کم می‌شود.`,
    });
  }

  const rec = receivables(s);
  if (rec.overdue > 0) {
    out.push({
      level: 'danger',
      icon: '⏳',
      title: 'مطالبات سررسیدگذشته',
      text:
        Math.round(rec.overdue).toLocaleString('en-US') +
        ' تومان از فاکتورهای فروش از سررسید گذشته است.',
    });
  }

  settlement(s).rows.forEach((r) => {
    if (r.balance < -1000000) {
      out.push({
        level: 'info',
        icon: '🧾',
        title: 'بدهی ' + r.name,
        text: 'مانده حساب منفی: ' + Math.round(Math.abs(r.balance)).toLocaleString('en-US') + ' تومان',
      });
    }
  });

  if (!out.length) {
    out.push({
      level: 'ok',
      icon: '✅',
      title: 'همه چیز مرتب است',
      text: 'هشدار فعالی وجود ندارد.',
    });
  }
  return out.slice(0, 5);
}

/* --------------------------- محاسبات خوراک --------------------------- */
export function formulaCost(fm: Formula) {
  let cost = 0;
  let protein = 0;
  let pct = 0;
  (fm.items || []).forEach((it) => {
    const p = num(it.percent);
    pct += p;
    cost += (p / 100) * num(it.pricePerKg);
    protein += (p / 100) * num(it.protein);
  });
  return { cost, protein, pct };
}

export function batchCost(s: AppState, b: Batch): number {
  const fm = s.formulas.find((f) => f.id === b.formulaId);
  return fm ? formulaCost(fm).cost * num(b.qtyKg) : 0;
}

/* --------------------------- تسویه پیشنهادی --------------------------- */
export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export function suggestTransfers(rows: Settlement['rows'], surplus = 0): Transfer[] {
  const bal = rows
    .map((r) => ({ name: r.name, v: r.balance - (surplus * num(r.share)) / 100 }))
    .filter((r) => Math.abs(r.v) > 1000);

  const debtors = bal.filter((r) => r.v < 0).sort((a, b) => a.v - b.v);
  const creditors = bal.filter((r) => r.v > 0).sort((a, b) => b.v - a.v);

  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  let guard = 0;
  while (i < debtors.length && j < creditors.length && guard++ < 50) {
    const amt = Math.min(-debtors[i].v, creditors[j].v);
    if (amt > 1000) out.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(amt) });
    debtors[i].v += amt;
    creditors[j].v -= amt;
    if (Math.abs(debtors[i].v) < 1000) i++;
    if (Math.abs(creditors[j].v) < 1000) j++;
  }
  return out;
}
