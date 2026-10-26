-- =============================================================================
--  مهاجرت نسخه ۳ — دفتر حرکات انبار (کاردکس)
--  در Supabase → SQL Editor اجرا کنید. ایمن و تکرارپذیر است.
-- =============================================================================

alter table public.tf_records drop constraint if exists tf_records_kind_check;

alter table public.tf_records
  add constraint tf_records_kind_check check (kind in (
    -- نسخه ۱
    'partners','flocks','daily','expenses','sales','formulas',
    'batches','tasks','vaccines','inventory','contributions','deals',
    -- نسخه ۲
    'persons','transactions','payments',
    -- نسخه ۳
    'stockMoves'
  ));

-- ---------------------------------------------------------------------------
--  بررسی
-- ---------------------------------------------------------------------------
-- select kind, count(*) from public.tf_records group by kind order by kind;
-- =============================================================================
