/** لایه دسترسی داده روی Supabase (REST) — همه عملیات با RLS کاربر جاری */
import { supabase } from '../lib/supabase';
import type { AppState, CollectionKey, Settings } from './types';

export const COLLECTIONS: CollectionKey[] = [
  'partners',
  'flocks',
  'daily',
  'expenses',
  'sales',
  'formulas',
  'batches',
  'tasks',
  'vaccines',
  'inventory',
  'contributions',
  'deals',
];

export interface RemoteRecord {
  id: string;
  kind: CollectionKey;
  data: Record<string, unknown>;
}

const TABLE = 'tf_records';
const SETTINGS_TABLE = 'tf_settings';

/** خواندن همه رکوردها و تنظیمات کاربر */
export async function fetchAll(): Promise<{ records: RemoteRecord[]; settings: Settings | null }> {
  const [recordsRes, settingsRes] = await Promise.all([
    supabase.from(TABLE).select('id, kind, data'),
    supabase.from(SETTINGS_TABLE).select('data').maybeSingle(),
  ]);

  if (recordsRes.error) throw new Error(recordsRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);

  return {
    records: (recordsRes.data ?? []) as RemoteRecord[],
    settings: (settingsRes.data?.data as Settings | undefined) ?? null,
  };
}

/** درج یا به‌روزرسانی یک رکورد */
export async function upsertRecord(kind: CollectionKey, data: Record<string, unknown>) {
  const { error } = await supabase.from(TABLE).upsert(
    { id: String(data.id), kind, data },
    { onConflict: 'id' },
  );
  if (error) throw new Error(error.message);
}

/** حذف یک رکورد */
export async function deleteRecord(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** حذف گروهی */
export async function deleteRecords(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from(TABLE).delete().in('id', ids);
  if (error) throw new Error(error.message);
}

/** حذف همه رکوردهای کاربر */
export async function deleteAllRecords(userId: string) {
  const { error } = await supabase.from(TABLE).delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/** درج گروهی (بازیابی پشتیبان / داده نمونه) */
export async function insertRecords(kind: CollectionKey, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const payload = rows.map((r) => ({ id: String(r.id), kind, data: r }));
  const { error } = await supabase.from(TABLE).insert(payload);
  if (error) throw new Error(error.message);
}

/** ذخیره تنظیمات */
export async function saveSettings(userId: string, settings: Settings) {
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ user_id: userId, data: settings }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

/** شمارش رکوردها (برای تشخیص حساب خالی) */
export async function countRecords(): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** تبدیل رکوردهای سرور به ساختار وضعیت برنامه */
export function assemble(
  records: RemoteRecord[],
  settings: Settings | null,
  defaults: Settings,
): Pick<AppState, CollectionKey | 'settings'> {
  const out = {
    settings: { ...defaults, ...(settings ?? {}) },
  } as Pick<AppState, CollectionKey | 'settings'>;

  COLLECTIONS.forEach((col) => {
    (out as Record<string, unknown>)[col] = [];
  });

  records.forEach((r) => {
    if (!COLLECTIONS.includes(r.kind)) return;
    const list = (out as unknown as Record<string, unknown[]>)[r.kind];
    list.push(r.data);
  });

  // تازه‌ترین‌ها اول — مثل رفتار نسخه محلی
  COLLECTIONS.forEach((col) => {
    const list = (out as unknown as Record<string, Array<{ createdAt?: number }>>)[col];
    list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  });

  return out;
}
