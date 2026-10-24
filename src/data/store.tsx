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
import { CAT_MAP } from './categories';
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
  Settlement,
  Settings,
  Totals,
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
    startDate: J.norm(f.startDate) || f.startDate,
    endDate: f.endDate ? J.norm(f.endDate) || f.endDate : '',
  }));
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
    state = { ...blank(), ...assembled, version: 2 };
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
    const t = totalShare(s) || 100;
    partners.forEach((p) => {
      out[p.id] = (total * num(p.share)) / t;
    });
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

  const exp = sum(exps, 'amount');
  const rev = sum(sales, 'amount');
  return {
    expenses: exp,
    revenue: rev,
    profit: rev - exp,
    count: exps.length,
    salesCount: sales.length,
    salesKg: sum(sales, 'qtyKg'),
    margin: rev > 0 ? ((rev - exp) / rev) * 100 : 0,
  };
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

  const sold = num(f.soldCount);
  const alive = Math.max(0, num(f.startCount) - mort - culled - sold);
  const end = f.endDate || J.today();
  const age = Math.max(0, J.diff(f.startDate, end));
  const biomass = (alive * lastW) / 1000;
  const gainKg = biomass - num(f.startCount) * 0.06;
  const exp = sum(s.expenses.filter((e) => e.flockId === id), 'amount');
  const rev = sum(s.sales.filter((x) => x.flockId === id), 'amount');

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

  const rows = s.partners.map((p) => {
    let shareExp = 0;
    let paidDirect = 0;
    exps.forEach((e) => {
      shareExp += num(expenseShares(s, e)[p.id]);
      if (e.paidBy === p.id) paidDirect += num(e.amount);
    });
    const capital = sum(
      s.contributions.filter((c) => c.partnerId === p.id),
      'amount',
    );
    return {
      id: p.id,
      name: p.name,
      share: num(p.share),
      color: p.color,
      capital,
      paidDirect,
      shareExp,
      balance: capital + paidDirect - shareExp,
    };
  });

  const surplus = rows.reduce((a, r) => a + r.balance, 0);
  return { rows, totalExp, surplus };
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
