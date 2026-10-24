-- =============================================================================
--  (اختیاری) ویوهای خوانا — برای دیدن داده‌ها در Table Editor به شکل جدول معمولی
--  این فایل را بعد از schema.sql اجرا کنید. داده‌ها را تغییر نمی‌دهد و
--  با security_invoker احترام RLS را نگه می‌دارد (نیازمند PostgreSQL 15+).
-- =============================================================================

create or replace view public.tf_v_expenses
with (security_invoker = true) as
select
  r.user_id,
  r.id,
  (r.data ->> 'date')::text      as date,
  (r.data ->> 'category')::text  as category,
  (r.data ->> 'sub')::text       as sub,
  (r.data ->> 'title')::text     as title,
  (r.data ->> 'amount')::numeric as amount,
  (r.data ->> 'qty')::numeric    as qty,
  (r.data ->> 'unit')::text      as unit,
  (r.data ->> 'vendor')::text    as vendor,
  (r.data ->> 'paidBy')::text    as paid_by,
  (r.data ->> 'split')::text     as split,
  (r.data ->> 'flockId')::text   as flock_id,
  (r.data ->> 'note')::text      as note,
  r.created_at
from public.tf_records r
where r.kind = 'expenses';

create or replace view public.tf_v_sales
with (security_invoker = true) as
select
  r.user_id,
  r.id,
  (r.data ->> 'date')::text       as date,
  (r.data ->> 'type')::text       as type,
  (r.data ->> 'qtyKg')::numeric   as qty_kg,
  (r.data ->> 'pricePerKg')::numeric as price_per_kg,
  (r.data ->> 'amount')::numeric  as amount,
  (r.data ->> 'buyer')::text      as buyer,
  (r.data ->> 'flockId')::text    as flock_id,
  (r.data ->> 'paidTo')::text     as paid_to,
  r.created_at
from public.tf_records r
where r.kind = 'sales';

create or replace view public.tf_v_flocks
with (security_invoker = true) as
select
  r.user_id,
  r.id,
  (r.data ->> 'name')::text        as name,
  (r.data ->> 'code')::text        as code,
  (r.data ->> 'breed')::text       as breed,
  (r.data ->> 'hall')::text        as hall,
  (r.data ->> 'startDate')::text   as start_date,
  (r.data ->> 'startCount')::numeric as start_count,
  (r.data ->> 'status')::text      as status,
  (r.data ->> 'endDate')::text     as end_date,
  (r.data ->> 'soldCount')::numeric as sold_count,
  r.created_at
from public.tf_records r
where r.kind = 'flocks';

create or replace view public.tf_v_partners
with (security_invoker = true) as
select
  r.user_id,
  r.id,
  (r.data ->> 'name')::text     as name,
  (r.data ->> 'phone')::text    as phone,
  (r.data ->> 'share')::numeric as share,
  (r.data ->> 'role')::text     as role,
  (r.data ->> 'color')::text    as color,
  (r.data ->> 'joined')::text   as joined,
  r.created_at
from public.tf_records r
where r.kind = 'partners';
