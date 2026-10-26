-- =============================================================================
--  مهاجرت نسخه ۲ — افزودن «اشخاص»، «معاملات» و «دریافت/پرداخت»
--  در Supabase → SQL Editor اجرا کنید. ایمن و تکرارپذیر است.
--
--  چون داده‌ها در ستون JSONB نگهداری می‌شوند، فقط باید لیست مجاز ستون kind
--  به‌روز شود؛ هیچ جدول یا ستون جدیدی لازم نیست.
-- =============================================================================

alter table public.tf_records drop constraint if exists tf_records_kind_check;

alter table public.tf_records
  add constraint tf_records_kind_check check (kind in (
    -- نسخه ۱
    'partners','flocks','daily','expenses','sales','formulas',
    'batches','tasks','vaccines','inventory','contributions','deals',
    -- نسخه ۲ (جدید)
    'persons','transactions','payments'
  ));

-- ---------------------------------------------------------------------------
--  بررسی
-- ---------------------------------------------------------------------------
-- select kind, count(*) from public.tf_records group by kind order by kind;
--
-- اگر خطای «constraint already exists» گرفتید، یعنی قبلاً اجرا شده است.
-- =============================================================================
