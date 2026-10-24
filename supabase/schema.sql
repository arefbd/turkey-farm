-- =============================================================================
--  مزرعه بوقلمون — اسکیمای Supabase
--  در Supabase → SQL Editor اجرا کنید (یک‌بار).
--  هر رکورد یک ردیف با داده JSONB + امنیت RLS بر اساس کاربر
-- =============================================================================

-- ۱) جدول رکوردها: گله، هزینه، فروش، شرکا، ...
create table if not exists public.tf_records (
  id          text        primary key,
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,
  kind        text        not null check (kind in (
                'partners','flocks','daily','expenses','sales','formulas',
                'batches','tasks','vaccines','inventory','contributions','deals')),
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tf_records_user_kind_idx on public.tf_records (user_id, kind);

-- ۲) تنظیمات مزرعه (یک ردیف برای هر کاربر)
create table if not exists public.tf_settings (
  user_id     uuid        primary key default auth.uid()
                          references auth.users (id) on delete cascade,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ۳) به‌روزرسانی خودکار updated_at
create or replace function public.tf_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tf_records_touch on public.tf_records;
create trigger tf_records_touch before update on public.tf_records
  for each row execute function public.tf_touch_updated_at();

drop trigger if exists tf_settings_touch on public.tf_settings;
create trigger tf_settings_touch before update on public.tf_settings
  for each row execute function public.tf_touch_updated_at();

-- ۴) امنیت سطح ردیف: هر کاربر فقط داده خودش را می‌بیند
alter table public.tf_records  enable row level security;
alter table public.tf_settings enable row level security;

drop policy if exists tf_records_own on public.tf_records;
create policy tf_records_own on public.tf_records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists tf_settings_own on public.tf_settings;
create policy tf_settings_own on public.tf_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ۵) مجوز سطح جدول (فیلتر واقعی همان RLS است)
grant select, insert, update, delete
  on public.tf_records, public.tf_settings
  to authenticated;
