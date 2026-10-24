-- =============================================================================
--  قفل کردن سامانه روی «یک مدیر»
--  این فایل را بعد از schema.sql در SQL Editor اجرا کنید.
--
--  نتیجه: اولین کاربری که در پروژه ساخته شود، مدیر می‌شود و از آن به بعد
--  هیچ ثبت‌نام/کاربر جدیدی پذیرفته نمی‌شود (حتی از داشبورد Supabase).
-- =============================================================================

-- ۱) جدول مدیر
create table if not exists public.tf_admin (
  id         uuid        primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.tf_admin enable row level security;

drop policy if exists tf_admin_read_own on public.tf_admin;
create policy tf_admin_read_own on public.tf_admin
  for select to authenticated
  using (id = auth.uid());

-- ۲) اگر همین حالا کاربری وجود دارد، همان مدیر سامانه می‌شود
insert into public.tf_admin (id)
select id from auth.users order by created_at limit 1
on conflict do nothing;

-- ۳) نگهبان: بعد از وجود مدیر، هیچ کاربر جدیدی ساخته نمی‌شود
create or replace function public.tf_single_admin_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.tf_admin) then
    raise exception 'SIGNUP_DISABLED — این سامانه فقط یک مدیر دارد و ثبت‌نام بسته است.'
      using errcode = 'check_violation';
  end if;
  insert into public.tf_admin (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists tf_single_admin_guard on auth.users;
create trigger tf_single_admin_guard
  before insert on auth.users
  for each row execute function public.tf_single_admin_guard();

-- =============================================================================
--  بررسی وضعیت
-- =============================================================================
-- select * from public.tf_admin;          -- مدیر فعلی
-- select id, email, created_at from auth.users;  -- کاربران پروژه (باید یکی باشد)
--
-- برای تغییر مدیر (مثلاً فراموشی رمز یا حساب جدید):
--   delete from public.tf_admin;                  -- قفل باز می‌شود
--   -- کاربر جدید را از Authentication → Users بسازید
--   insert into public.tf_admin (id)
--     select id from auth.users order by created_at desc limit 1;
-- =============================================================================
