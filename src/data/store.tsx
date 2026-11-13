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
import { blank, DEFAULT_PRODUCTS, seed, uid } from './seed';
import { CAT_MAP, GOODS_CATS } from './categories';
import {
  COLLECTIONS,
  assemble,
  deleteRecords,
  fetchAll,
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
  Product,
  Settlement,
  SettlementRow,
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
  raw = raw.replace(/[/٫]/g, '.');
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
  next.daily = (next.daily || []).map((d) => ({
    ...d,
    mortality: num(d.mortality),
    culled: num(d.culled),
    feedKg: num(d.feedKg),
    waterL: num(d.waterL),
    avgWeightG: num(d.avgWeightG),
    tempC: num(d.tempC),
    tempMinC: d.tempMinC != null ? num(d.tempMinC) : undefined,
    tempMaxC: d.tempMaxC != null ? num(d.tempMaxC) : undefined,
    humidityPct: d.humidityPct != null ? num(d.humidityPct) : undefined,
    lightHours: d.lightHours != null ? num(d.lightHours) : undefined,
    feedItemId: d.feedItemId || '',
    feedItemName: d.feedItemName || '',
    feedWarehouseId: d.feedWarehouseId || '',
    feedDeducted: !!d.feedDeducted,
    treatment: d.treatment || '',
    note: d.note || '',
  }));
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
  next.products = (next.products || []).map((p) => ({
    ...p,
    code: p.code || '',
    name: String(p.name || '').trim(),
    category: String(p.category || 'عمومی').trim(),
    unit: String(p.unit || 'کیلوگرم').trim(),
    defaultPrice: num(p.defaultPrice),
    active: p.active !== false,
  }));
  next.halls = (next.halls || []).map((h) => ({
    ...h,
    code: h.code || '',
    name: String(h.name || '').trim(),
    farmName: String(h.farmName || '').trim(),
    lengthM: num(h.lengthM),
    widthM: num(h.widthM),
    areaM2: num(h.areaM2) || num(h.lengthM) * num(h.widthM),
    capacity: num(h.capacity),
    ventilationType: h.ventilationType || '',
    heatingType: h.heatingType || '',
    coolingType: h.coolingType || '',
    status: h.status || 'empty',
    lastDisinfectionDate: J.norm(h.lastDisinfectionDate) || h.lastDisinfectionDate || '',
    readyDate: J.norm(h.readyDate) || h.readyDate || '',
    notes: h.notes || '',
  }));
  next.warehouses = (next.warehouses || []).map((w) => ({
    ...w,
    code: w.code || '',
    name: String(w.name || '').trim(),
    type: w.type || 'raw_feed',
    hallId: w.hallId || '',
    manager: String(w.manager || '').trim(),
    temperature: w.temperature != null ? num(w.temperature) : undefined,
    active: w.active !== false,
    notes: w.notes || '',
  }));
  next.partnershipUnits = (next.partnershipUnits || []).map((u) => ({
    ...u,
    code: u.code || '',
    title: String(u.title || '').trim(),
    scope: u.scope || 'flock',
    targetId: u.targetId || '',
    startDate: J.norm(u.startDate) || u.startDate || '',
    endDate: u.endDate ? J.norm(u.endDate) || u.endDate : '',
    shareMode: u.shareMode === 'percent' ? 'percent' : 'unit',
    status: u.status || 'active',
    shares: (u.shares || []).map((x) => ({
      partnerId: x.partnerId,
      percent: num(x.percent),
      units: num(x.units),
      initialCapital: num(x.initialCapital),
    })),
    notes: u.notes || '',
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
export async function hydrate(targetUserId: string) {
  userId = targetUserId;
  setSync({ userId: targetUserId, status: 'loading', error: '' });
  try {
    const { records, settings } = await fetchAll();
    const assembled = assemble(records, settings, blank().settings);
    const initialProds = (!assembled.products || (assembled.products as unknown[]).length === 0)
      ? DEFAULT_PRODUCTS.map((p) => ({ ...p, id: uid(), createdAt: Date.now() }))
      : [];
    // normalize: رکوردهای قدیمیِ بدون فیلدهای جدید (expiry، locked، shares، accountId)
    // را با مقادیر پیش‌فرض سالم می‌کند
    state = normalize({
      ...blank(),
      ...assembled,
      products: ((assembled.products as unknown[])?.length ? assembled.products : initialProds) as Product[],
      version: 2,
    });
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

/** بازفرست وضعیت به سرور به صورت ایمن (بدون حذف داده‌های سرور) */
export async function resync() {
  if (!userId) return;
  setSync({ status: 'loading', error: '' });
  try {
    for (const col of COLLECTIONS) {
      const rows = state[col] as unknown as Array<Record<string, unknown>>;
      if (rows.length) {
        await Promise.all(rows.map((r) => upsertRecord(col, r)));
      }
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

  deleteStockMove(moveId: string): void {
    const move = state.stockMoves.find((m) => m.id === moveId);
    if (!move) return;

    const reverseDelta = move.kind === 'in' ? -num(move.qty) : num(move.qty);
    const inventory = state.inventory.map((it) => {
      if (it.id === move.itemId || it.name.trim() === move.itemName.trim()) {
        const newQty = Math.max(0, num(it.qty) + reverseDelta);
        return { ...it, qty: newQty };
      }
      return it;
    });

    const stockMoves = state.stockMoves.filter((m) => m.id !== moveId);
    commit({ ...state, inventory, stockMoves });
  },

  updateStockMove(
    moveId: string,
    patch: {
      date?: string;
      qty?: number;
      kind?: 'in' | 'out';
      reason?: string;
      note?: string;
    },
  ): void {
    const move = state.stockMoves.find((m) => m.id === moveId);
    if (!move) return;

    const oldEffective = move.kind === 'in' ? num(move.qty) : -num(move.qty);
    const newQty = patch.qty !== undefined ? num(patch.qty) : num(move.qty);
    const newKind = patch.kind !== undefined ? patch.kind : move.kind;
    const newEffective = newKind === 'in' ? newQty : -newQty;
    const netDelta = newEffective - oldEffective;

    const inventory = state.inventory.map((it) => {
      if (it.id === move.itemId || it.name.trim() === move.itemName.trim()) {
        const updatedQty = Math.max(0, num(it.qty) + netDelta);
        return { ...it, qty: updatedQty };
      }
      return it;
    });

    const stockMoves = state.stockMoves.map((m) => {
      if (m.id !== moveId) return m;
      return {
        ...m,
        date: patch.date ?? m.date,
        qty: newQty,
        kind: newKind,
        reason: patch.reason ?? m.reason,
        note: patch.note ?? m.note,
        after: Math.max(0, num(m.before) + newEffective),
      };
    });

    commit({ ...state, inventory, stockMoves });
  },

  addInitialStockMove(item: { id?: string; name: string; unit: string; qty: number; code?: string }, date: string, note?: string): void {
    if (num(item.qty) <= 0) return;
    const move: StockMove = {
      id: uid(),
      createdAt: Date.now(),
      date: date || J.today(),
      itemId: item.id || uid(),
      itemName: item.name,
      unit: item.unit,
      kind: 'in',
      qty: num(item.qty),
      before: 0,
      after: num(item.qty),
      reason: 'موجودی اولیه کالا',
      refType: 'manual',
      refId: item.code || '',
      note: note || 'ثبت همزمان با تعریف اولیه کالا در انبار',
    };
    commit({ ...state, stockMoves: [move, ...state.stockMoves] });
  },

  /** ثبت یا ویرایش گزارش روزانه همراه با مدیریت کسر خودکار دان از انبار */
  saveDailyRecord(record: Omit<DailyRecord, 'id' | 'createdAt'> & { id?: string }): void {
    const existing = record.id ? state.daily.find((d) => d.id === record.id) : null;
    const flock = flockById(state, record.flockId);
    const flockName = flock ? flock.name : 'گله';
    const recId = record.id || uid();

    // ۱. اگر رکورد قبلی دان از انبار کسر کرده بود، مقدار قبلی را برمی‌گردانیم
    if (existing && existing.feedDeducted && existing.feedItemId && num(existing.feedKg) > 0) {
      const prevItem = state.inventory.find((i) => i.id === existing.feedItemId);
      if (prevItem) {
        actions.adjustStock({ [prevItem.name]: num(existing.feedKg) }, {
          date: record.date,
          reason: `اصلاح ثبت روزانه ${flockName} (برگشت دان قبلی)`,
          refType: 'manual',
          refId: existing.id,
        });
      }
    }

    // ۲. اگر کسر جدید فعال است، مقدار جدید را از انبار کسر می‌کنیم
    if (record.feedDeducted && record.feedItemId && num(record.feedKg) > 0) {
      const curItem = state.inventory.find((i) => i.id === record.feedItemId);
      if (curItem) {
        actions.adjustStock({ [curItem.name]: -num(record.feedKg) }, {
          date: record.date,
          reason: `مصرف روزانه دان ${flockName} (سن ${record.age} روزگی)`,
          refType: 'manual',
          refId: recId,
        });
      }
    }

    // ۳. ذخیره خود رکورد روزانه
    if (existing) {
      actions.update('daily', existing.id, record);
    } else {
      actions.add('daily', { ...record, id: recId });
    }
  },

  /** حذف گزارش روزانه همراه با برگشت دان به انبار در صورت کسر قبلی */
  removeDailyRecord(id: string): void {
    const existing = state.daily.find((d) => d.id === id);
    if (existing && existing.feedDeducted && existing.feedItemId && num(existing.feedKg) > 0) {
      const item = state.inventory.find((i) => i.id === existing.feedItemId);
      if (item) {
        actions.adjustStock({ [item.name]: num(existing.feedKg) }, {
          date: existing.date,
          reason: `حذف ثبت روزانه گله (برگشت دان به انبار)`,
          refType: 'manual',
          refId: existing.id,
        });
      }
    }
    actions.remove('daily', id);
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

/* --------------------------- کالاها و محصولات --------------------------- */
export function productById(s: AppState, id: string): Product | null {
  return s.products.find((p) => p.id === id) ?? null;
}

export function activeProducts(s: AppState): Product[] {
  return s.products.filter((p) => p.active !== false);
}

export function productCategories(s: AppState): string[] {
  const cats = new Set<string>();
  const defaults =
    s.settings.productCategories && s.settings.productCategories.length
      ? s.settings.productCategories
      : ['جوجه', 'گوشت', 'دان و خوراک', 'دارو و واکسن', 'لوازم و تجهیزات', 'بسته‌بندی'];
  defaults.forEach((c) => {
    if (c) cats.add(c.trim());
  });
  s.products.forEach((p) => {
    if (p.category) cats.add(p.category.trim());
  });
  return Array.from(cats);
}

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

/** سهم هر شریک از یک هزینه (پشتیبانی از درصدی و نسبتی/سهمی) */
export function expenseShares(s: AppState, exp: Expense): Record<string, number> {
  const partners = s.partners;
  const total = num(exp.amount);
  const out: Record<string, number> = {};
  if (!partners.length) return out;

  if (exp.split === 'custom' && exp.shares) {
    if (exp.shareMode === 'unit') {
      const sumUnits = partners.reduce((a, p) => a + num(exp.shares?.[p.id]), 0);
      partners.forEach((p) => {
        out[p.id] = sumUnits > 0 ? (total * num(exp.shares?.[p.id])) / sumUnits : 0;
      });
    } else {
      const sumPct = partners.reduce((a, p) => a + num(exp.shares?.[p.id]), 0);
      partners.forEach((p) => {
        out[p.id] = sumPct > 0 ? (total * num(exp.shares?.[p.id])) / sumPct : 0;
      });
    }
  } else if (exp.split === 'equal') {
    partners.forEach((p) => {
      out[p.id] = total / partners.length;
    });
  } else if (exp.split === 'single') {
    partners.forEach((p) => {
      out[p.id] = p.id === exp.paidBy ? total : 0;
    });
  } else {
    // تقسیم بر اساس سهم شراکت: اگر هزینه متعلق به گله خاصی است، از درصد سهام همان گله استفاده می‌شود
    if (exp.flockId) {
      const fShares = flockSharePercents(s, exp.flockId);
      if (Object.keys(fShares).length) {
        partners.forEach((p) => {
          out[p.id] = (total * (fShares[p.id] || 0)) / 100;
        });
        return out;
      }
    }
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
  if (f.flockIds && f.flockIds.length) list = list.filter((e) => e.flockId && f.flockIds!.includes(e.flockId));
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
  if (filter.flockIds && filter.flockIds.length) sales = sales.filter((x) => x.flockId && filter.flockIds!.includes(x.flockId));
  if (filter.from) sales = sales.filter((x) => J.jdn(x.date) >= J.jdn(filter.from!));
  if (filter.to) sales = sales.filter((x) => J.jdn(x.date) <= J.jdn(filter.to!));

  let txs = s.transactions.slice();
  if (filter.flockId) txs = txs.filter((t) => t.flockId === filter.flockId);
  if (filter.flockIds && filter.flockIds.length) txs = txs.filter((t) => t.flockId && filter.flockIds!.includes(t.flockId));
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

/** تعداد فروش‌رفته و وزن فروخته‌شده یک گله — محاسبه دقیق از معاملات و فروش‌ها */
export function soldForFlock(
  s: AppState,
  flockId: string,
  flockAvgWeightG = 0,
): { count: number; weightKg: number } {
  let count = 0;
  let weightKg = 0;
  const avgW =
    flockAvgWeightG > 0
      ? flockAvgWeightG
      : num(s.settings.targetWeightG) > 0
        ? num(s.settings.targetWeightG)
        : 8000;

  // ۱. بررسی معاملات ثبت‌شده برای این گله
  s.transactions.forEach((t) => {
    if (t.flockId !== flockId) return;
    const sign = t.type === 'sale' ? 1 : t.type === 'sale_return' ? -1 : 0;
    if (!sign) return;

    (t.items || []).forEach((i) => {
      const q = num(i.qty);
      if (q <= 0) return;
      const u = (i.unit || '').trim();
      const name = (i.name || '').trim();

      // تشخیص اینکه آیا این ردیف مربوط به پرنده/جوجه/گوشت است یا اقلام غیرپرنده‌ای (مثل دان، دارو، تجهیزات)
      const isCount = u === 'قطعه' || u === 'عدد' || u === 'رأس' || u === 'راس';
      const isTon = u === 'تن';
      const isWeight = u === 'کیلوگرم' || u === 'کیلو' || isTon;

      // جستجوی کالا در کاتالوگ برای تشخیص دقیق دسته
      const catalogItem = s.products.find((p) => p.name.trim() === name);
      const isFeedOrSupply =
        catalogItem?.category === 'دان و خوراک' ||
        catalogItem?.category === 'دارو و واکسن' ||
        catalogItem?.category === 'لوازم و تجهیزات' ||
        name.includes('دان') ||
        name.includes('خوراک') ||
        name.includes('ذرت') ||
        name.includes('سویا') ||
        name.includes('کود') ||
        name.includes('واکسن') ||
        name.includes('دارو');

      if (isFeedOrSupply && !isCount) {
        // اقلام خوراک و لوازم نباید از جمعیت پرنده کم شوند
        return;
      }

      if (isCount) {
        // فروش تعدادی (جوجه یک‌روزه، چند روزه، نیمچه، قطعه)
        count += sign * q;
        weightKg += sign * (q * avgW) / 1000;
      } else if (isWeight) {
        // فروش وزنی (لاشه، گوشت، بوقلمون زنده بر اساس کیلوگرم)
        const itemKg = isTon ? q * 1000 : q;
        weightKg += sign * itemKg;
        count += sign * Math.round((itemKg * 1000) / avgW);
      }
    });
  });

  // ۲. بررسی فروش‌های ثبت‌شده در جدول sales برای این گله (سازگاری کامل با فروش‌های مستقیم)
  s.sales.forEach((sale) => {
    if (sale.flockId !== flockId) return;
    const q = num(sale.qtyKg);
    if (q <= 0) return;
    const prod = s.products.find((p) => p.name === sale.type);
    if (prod && prod.category === 'جوجه') {
      count += q;
      weightKg += (q * avgW) / 1000;
    } else {
      weightKg += q;
      count += Math.round((q * 1000) / avgW);
    }
  });

  return {
    count: Math.max(0, Math.round(count)),
    weightKg: Math.max(0, weightKg),
  };
}

/** تعداد فروش‌رفته یک گله — سازگاری با توابع قبلی */
export function soldCountForFlock(s: AppState, flockId: string): number {
  return soldForFlock(s, flockId).count;
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
export function openItems(s: AppState, filter: ExpenseFilter = {}): OpenItem[] {
  const targetFlockIds: string[] = [];
  if (filter.flockId) targetFlockIds.push(filter.flockId);
  if (filter.flockIds?.length) {
    filter.flockIds.forEach((id) => {
      if (!targetFlockIds.includes(id)) targetFlockIds.push(id);
    });
  }

  const paidByTx: Record<string, number> = {};
  s.payments.forEach((p) => {
    if (!p.transactionId) return;
    paidByTx[p.transactionId] = (paidByTx[p.transactionId] || 0) + num(p.amount);
  });

  let txList = s.transactions.filter((t) => t.type === 'sale' || t.type === 'purchase');
  if (targetFlockIds.length) {
    txList = txList.filter((t) => t.flockId && targetFlockIds.includes(t.flockId));
  }
  if (filter.from) txList = txList.filter((t) => J.jdn(t.date) >= J.jdn(filter.from!));
  if (filter.to) txList = txList.filter((t) => J.jdn(t.date) <= J.jdn(filter.to!));

  return txList
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

export function receivables(s: AppState, filter: ExpenseFilter = {}): ReceivableSummary {
  const items = openItems(s, filter);
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
export function cashSeries(s: AppState, n = 6, filter: ExpenseFilter = {}) {
  const targetFlockIds: string[] = [];
  if (filter.flockId) targetFlockIds.push(filter.flockId);
  if (filter.flockIds?.length) {
    filter.flockIds.forEach((id) => {
      if (!targetFlockIds.includes(id)) targetFlockIds.push(id);
    });
  }
  const txIds = targetFlockIds.length
    ? new Set(s.transactions.filter((t) => t.flockId && targetFlockIds.includes(t.flockId)).map((t) => t.id))
    : null;

  return J.lastMonths(n).map((m) => {
    let list = s.payments.filter((p) => p.date.slice(0, 7) === m.key);
    if (txIds) {
      list = list.filter((p) => p.transactionId && txIds.has(p.transactionId));
    }
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

export function monthlySeries(s: AppState, n = 6, filter: ExpenseFilter = {}) {
  const targetFlockIds: string[] = [];
  if (filter.flockId) targetFlockIds.push(filter.flockId);
  if (filter.flockIds?.length) {
    filter.flockIds.forEach((id) => {
      if (!targetFlockIds.includes(id)) targetFlockIds.push(id);
    });
  }

  return J.lastMonths(n).map((m) => {
    let e = s.expenses.filter((x) => x.date.slice(0, 7) === m.key);
    let sa = s.sales.filter((x) => x.date.slice(0, 7) === m.key);
    let txs = s.transactions.filter((t) => t.date.slice(0, 7) === m.key);

    if (targetFlockIds.length) {
      e = e.filter((x) => x.flockId && targetFlockIds.includes(x.flockId));
      sa = sa.filter((x) => x.flockId && targetFlockIds.includes(x.flockId));
      txs = txs.filter((t) => t.flockId && targetFlockIds.includes(t.flockId));
    }

    const tx = sumTransactions(txs);
    return {
      key: m.key,
      label: m.label,
      expense: sum(e, 'amount') + tx.purchase,
      income: sum(sa, 'amount') + tx.revenue,
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

  const soldInfo = soldForFlock(s, id, lastW);
  const sold = num(f.soldCount) + soldInfo.count;
  const alive = Math.max(0, num(f.startCount) - mort - culled - sold);
  const end = f.endDate || J.today();
  const age = Math.max(0, J.diff(f.startDate, end)) + num(f.chickAge);

  // بیومس پرندگان زنده فعلی در سالن
  const biomass = (alive * lastW) / 1000;
  // وزن پرندگان فروخته شده (از معاملات و فروش‌ها)
  const soldBiomass = soldInfo.weightKg;
  // کل زیست‌توده تولید شده دوره (پرندگان موجود + پرندگان فروخته شده)
  const totalProducedKg = biomass + soldBiomass;

  // وزن اولیه جوجه‌های ورودی به سالن با استفاده از تنظیمات مزرعه
  const chickWeightKg = (num(s.settings.chickWeightG) || 60) / 1000;
  const initialBiomass = num(f.startCount) * chickWeightKg;
  const gainKg = Math.max(0, totalProducedKg - initialBiomass);

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
    costPerKg: totalProducedKg > 0 ? exp / totalProducedKg : biomass > 0 ? exp / biomass : 0,
    feedPerBird: alive ? feed / alive : 0,
    epef: (age > 0 && gainKg > 0 && feed > 0)
      ? ((num(f.startCount) ? (alive / num(f.startCount)) * 100 : 0) * (lastW / 1000) * 100) / (age * (feed / gainKg))
      : 0,
    waterFeedRatio: feed > 0 ? water / feed : 0,
    adgG: (age > 0 && lastW > ((num(s.settings.chickWeightG) || 60)))
      ? (lastW - (num(s.settings.chickWeightG) || 60)) / age
      : 0,
    feedPerBirdDailyG: (alive > 0 && age > 0) ? (feed * 1000) / (alive * age) : 0,
  };
}

export function settlement(s: AppState, filter: ExpenseFilter = {}): Settlement {
  const targetFlockIds: string[] = [];
  if (filter.flockId) targetFlockIds.push(filter.flockId);
  if (filter.flockIds?.length) {
    filter.flockIds.forEach((id) => {
      if (!targetFlockIds.includes(id)) targetFlockIds.push(id);
    });
  }

  const exps = filterExpenses(s, filter);
  const totalExp = sum(exps, 'amount');

  // معاملات در همان بازه فیلتر و گله‌ها
  let txs = s.transactions.slice();
  if (targetFlockIds.length) {
    txs = txs.filter((t) => t.flockId && targetFlockIds.includes(t.flockId));
  }
  if (filter.from) txs = txs.filter((t) => J.jdn(t.date) >= J.jdn(filter.from!));
  if (filter.to) txs = txs.filter((t) => J.jdn(t.date) <= J.jdn(filter.to!));

  // فروش‌های مستقیم
  let sales = s.sales.slice();
  if (targetFlockIds.length) {
    sales = sales.filter((x) => x.flockId && targetFlockIds.includes(x.flockId));
  }
  if (filter.from) sales = sales.filter((x) => J.jdn(x.date) >= J.jdn(filter.from!));
  if (filter.to) sales = sales.filter((x) => J.jdn(x.date) <= J.jdn(filter.to!));

  const txIds = targetFlockIds.length ? new Set(txs.map((t) => t.id)) : null;

  const payments = s.payments.filter((p) => {
    if (filter.from && J.jdn(p.date) < J.jdn(filter.from)) return false;
    if (filter.to && J.jdn(p.date) > J.jdn(filter.to)) return false;
    if (txIds && p.transactionId && !txIds.has(p.transactionId)) return false;
    return true;
  });
  const cashIn = payments.filter((p) => p.kind === 'in').reduce((a, p) => a + num(p.amount), 0);
  const cashOut = payments.filter((p) => p.kind === 'out').reduce((a, p) => a + num(p.amount), 0);

  const txTotals = sumTransactions(txs);
  const totalSalesRevenue = sum(sales, 'amount') + txTotals.revenue;

  const rows: SettlementRow[] = s.partners.map((p) => {
    let shareExp = 0;
    let paidDirect = 0;
    exps.forEach((e) => {
      shareExp += num(expenseShares(s, e)[p.id]);
      if (e.paidBy === p.id) paidDirect += num(e.amount);
    });

    // سهم از فروش‌های مستقیم s.sales
    let shareSalesRevenue = 0;
    sales.forEach((sa) => {
      if (sa.flockId) {
        const fPct = flockSharePercents(s, sa.flockId)[p.id] || 0;
        shareSalesRevenue += (num(sa.amount) * fPct) / 100;
      } else {
        const tShare = totalShare(s);
        const pPct = tShare > 0 ? (num(p.share) / tShare) * 100 : 100 / (s.partners.length || 1);
        shareSalesRevenue += (num(sa.amount) * pPct) / 100;
      }
    });

    // سهم شریک از خرید و فروش هر معامله
    let shareBuy = 0;
    let shareSell = 0;
    txs.forEach((t) => {
      const sh = (t.shares || []).find((x) => x.partnerId === p.id);
      let amt = 0;
      if (sh) {
        amt = num(sh.amount);
      } else if (t.flockId) {
        const fPct = flockSharePercents(s, t.flockId)[p.id] || 0;
        amt = (num(t.total) * fPct) / 100;
      } else {
        const tShare = totalShare(s);
        const pPct = tShare > 0 ? (num(p.share) / tShare) * 100 : 100 / (s.partners.length || 1);
        amt = (num(t.total) * pPct) / 100;
      }

      if (t.type === 'purchase') shareBuy += amt;
      else if (t.type === 'purchase_return') shareBuy -= amt;
      else if (t.type === 'sale') shareSell += amt;
      else if (t.type === 'sale_return') shareSell -= amt;
    });

    const shareRevenue = shareSell + shareSalesRevenue;
    const shareExpenseTotal = shareExp + shareBuy;
    const shareProfit = shareRevenue - shareExpenseTotal;

    // درصد سهم نمایشی بر اساس گله یا میانگین
    let effectiveShare = 0;
    if (targetFlockIds.length === 1) {
      const fShares = flockSharePercents(s, targetFlockIds[0]);
      effectiveShare = fShares[p.id] ?? num(p.share);
    } else if (targetFlockIds.length > 1) {
      if (totalSalesRevenue > 0) {
        effectiveShare = (shareRevenue / totalSalesRevenue) * 100;
      } else {
        let sumP = 0;
        targetFlockIds.forEach((fid) => {
          sumP += flockSharePercents(s, fid)[p.id] || 0;
        });
        effectiveShare = sumP / targetFlockIds.length;
      }
    } else {
      if (totalSalesRevenue > 0) {
        effectiveShare = (shareRevenue / totalSalesRevenue) * 100;
      } else {
        const actives = activeFlocks(s);
        if (actives.length > 0) {
          let sumP = 0;
          actives.forEach((f) => {
            sumP += flockSharePercents(s, f.id)[p.id] || 0;
          });
          effectiveShare = sumP / actives.length;
        } else {
          effectiveShare = num(p.share);
        }
      }
    }

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
      share: effectiveShare,
      color: p.color,
      capital,
      paidDirect,
      shareExp,
      shareBuy,
      shareSell,
      shareTx,
      paidOut,
      received,
      shareRevenue,
      shareExpenseTotal,
      shareProfit,
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
