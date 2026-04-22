-- ============================================================
-- 010_inkjet_workers.sql
-- Новая модель учёта печатников струйной печати:
--   • inkjet_options поддерживает категорию 'worker' — справочник печатников;
--   • inkjet_jobs.worker_ids — массив ID печатников, работавших в смене;
--   • workers_count = |⋃ worker_ids за день| (а не distinct user_id).
-- Запуск: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. Разрешить новую категорию в справочнике ──────────────
alter table public.inkjet_options
  drop constraint if exists inkjet_options_category_check;

alter table public.inkjet_options
  add constraint inkjet_options_category_check
  check (category in ('manager', 'product_type', 'status', 'worker'));

-- ── 2. Колонка worker_ids в заданиях ────────────────────────
alter table public.inkjet_jobs
  add column if not exists worker_ids uuid[] not null default '{}'::uuid[];

create index if not exists inkjet_jobs_worker_ids_idx
  on public.inkjet_jobs using gin (worker_ids);

-- ── 3. Перезаписываем RPC агрегатов ─────────────────────────

drop function if exists public.inkjet_day_stats(timestamptz, timestamptz);

create or replace function public.inkjet_day_stats(
  day_start timestamptz,
  day_end   timestamptz
)
returns table (
  total_minutes int,
  workers_count int,
  worker_ids    uuid[]
)
language sql
security definer
stable
set search_path = public
as $$
  with jobs_in_day as (
    select
      coalesce(setup_minutes, 0)
      + coalesce(print_minutes, 0)
      + coalesce(post_print_minutes, 0) as mins,
      worker_ids
    from public.inkjet_jobs
    where created_at >= day_start
      and created_at <= day_end
  ),
  wids as (
    select distinct unnest(worker_ids) as wid from jobs_in_day
  )
  select
    coalesce((select sum(mins)::int from jobs_in_day), 0) as total_minutes,
    coalesce((select count(*)::int   from wids),        0) as workers_count,
    coalesce((select array_agg(wid)  from wids), '{}'::uuid[]) as worker_ids;
$$;

grant execute on function public.inkjet_day_stats(timestamptz, timestamptz) to authenticated;


drop function if exists public.inkjet_period_day_stats(timestamptz, timestamptz);

create or replace function public.inkjet_period_day_stats(
  from_ts timestamptz,
  to_ts   timestamptz
)
returns table (
  day_date      date,
  total_minutes int,
  workers_count int,
  worker_ids    uuid[]
)
language sql
security definer
stable
set search_path = public
as $$
  with per_day_jobs as (
    select
      (created_at at time zone 'Europe/Moscow')::date as day_date,
      coalesce(setup_minutes, 0)
      + coalesce(print_minutes, 0)
      + coalesce(post_print_minutes, 0) as mins,
      worker_ids
    from public.inkjet_jobs
    where created_at >= from_ts
      and created_at <= to_ts
  ),
  totals as (
    select day_date, sum(mins)::int as total_mins
    from per_day_jobs
    group by day_date
  ),
  per_day_workers as (
    select day_date, array_agg(distinct w) as wids
    from (
      select day_date, unnest(worker_ids) as w
      from per_day_jobs
    ) t
    group by day_date
  )
  select
    t.day_date,
    t.total_mins                           as total_minutes,
    coalesce(cardinality(w.wids), 0)::int  as workers_count,
    coalesce(w.wids, '{}'::uuid[])         as worker_ids
  from totals t
  left join per_day_workers w on w.day_date = t.day_date
  order by t.day_date;
$$;

grant execute on function public.inkjet_period_day_stats(timestamptz, timestamptz) to authenticated;
