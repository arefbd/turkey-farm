-- =============================================================================
--  مزرعه بوقلمون — اسکیمای Supabase
--  این فایل را در Supabase → SQL Editor اجرا کنید (یک‌بار).
--  ساختار: هر رکورد یک ردیف با داده JSONB + RLS بر اساس کاربر
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ۱) جدول رکوردها (گله، هزینه، فروش، شرکا، ...)
-- ---------------------------------------------------------------------------
create table if not exists public.tf_records (
  id          text        primary key,
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,
  kind        text        not null
                          check (kind in (
                            'partners','flocks','daily','expenses','sales','formulas',
                            'batches','tasks','vaccines','inventory','contributions','deals'
                          )),
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.tf_records      is 'همه رکوردهای مزرعه — نوع در ستون kind';
comment on column public.tf_records.data is 'بدنه رکورد به شکل JSON (هم‌ساختار با مدل کلاینت)';

create index if not exists tf_records_user_kind_idx on public.tf_records (user_id, kind);
create index if not exists tf_records_updated_idx   on public.tf_records (updated_at desc);

-- ---------------------------------------------------------------------------
-- ۲) تنظیمات مزرعه (یک ردیف برای هر کاربر)
-- ---------------------------------------------------------------------------
create table if not exists public.tf_settings (
  user_id     uuid        primary key default auth.uid()
                          references auth.users (id) on delete cascade,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

comment on table public.tf_settings is 'تنظیمات مزرعه برای هر کاربر';

-- ---------------------------------------------------------------------------
-- ۳) به‌روزرسانی خودکار updated_at
-- ---------------------------------------------------------------------------
create or replace function public.tf_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tf_records_touch on public.tf_records;
create trigger tf_records_touch
  before update on public.tf_records
  for each row execute function public.tf_touch_updated_at();

drop trigger if exists tf_settings_touch on public.tf_settings;
create trigger tf_settings_touch
  before update on public.tf_settings
  for each row execute function public.tf_touch_updated_at();

-- ---------------------------------------------------------------------------
-- ۴) امنیت سطح ردیف (RLS) — هر کاربر فقط داده خودش را می‌بیند
-- ---------------------------------------------------------------------------
alter table public.tf_records  enable row level security;
alter table public.tf_settings enable row level security;

-- tf_records
drop policy if exists "tf_records_select_own" on public.tf_records;
create policy "tf_records_select_own" on public.tf_records
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "tf_records_insert_own" on public.tf_records;
create policy "tf_records_insert_own" on public.tf_records
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tf_records_update_own" on public.tf_records;
create policy "tf_records_update_own" on public.tf_records
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tf_records_delete_own" on public.tf_records;
create policy "tf_records_delete_own" on public.tf_records
  for delete to authenticated
  using (user_id = auth.uid());

-- tf_settings
drop policy if exists "tf_settings_select_own" on public.tf_settings;
create policy "tf_settings_select_own" on public.tf_settings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "tf_settings_insert_own" on public.tf_settings;
create policy "tf_settings_insert_own" on public.tf_settings
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tf_settings_update_own" on public.tf_settings;
create policy "tf_settings_update_own" on public.tf_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tf_settings_delete_own" on public.tf_settings;
create policy "tf_settings_delete_own" on public.tf_settings
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ۵) دسترسی نقش‌ها (RLS خودش فیلتر می‌کند، این‌ها فقط مجوز سطح جدول‌اند)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.tf_records  to authenticated;
grant select, insert, update, delete on public.tf_settings to authenticated;

-- =============================================================================
--  تمام. حالا در Table Editor دو جدول tf_records و tf_settings را می‌بینید.
--  داده‌ها فقط پس از ورود کاربر (احراز هویت) قابل خواندن/نوشتن هستند.
-- =============================================================================
