-- ============================================================
-- 009_inkjet_stats_rpc.sql
-- RPC-функции для дашборда струйной печати.
-- Возвращают АГРЕГАТЫ за смену / период (суммы минут, кол-во работников),
-- но не открывают доступ к чужим записям inkjet_jobs.
--
-- Запуск: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Агрегат за один день: общее время смены, кол-во работников и собственное время
-- day_start / day_end — границы дня в любом часовом поясе (передаются с клиента)
create or replace function public.inkjet_day_stats(day_start timestamptz, day_end timestamptz)
returns table (
  total_minutes int,
  workers_count int,
  own_minutes int,
  involves_me boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce(
      sum(
        coalesce(setup_minutes, 0)
        + coalesce(print_minutes, 0)
        + coalesce(post_print_minutes, 0)
      )::int,
      0
    ),
    coalesce(count(distinct user_id)::int, 0),
    coalesce(
      sum(
        case
          when user_id = auth.uid() then
            coalesce(setup_minutes, 0)
            + coalesce(print_minutes, 0)
            + coalesce(post_print_minutes, 0)
          else 0
        end
      )::int,
      0
    ),
    coalesce(bool_or(user_id = auth.uid()), false)
  from public.inkjet_jobs
  where created_at >= day_start
    and created_at <= day_end;
$$;

grant execute on function public.inkjet_day_stats(timestamptz, timestamptz) to authenticated;


-- Агрегат за период, сгруппированный по локальной дате (МСК)
create or replace function public.inkjet_period_day_stats(from_ts timestamptz, to_ts timestamptz)
returns table (
  day_date date,
  total_minutes int,
  workers_count int,
  own_minutes int,
  involves_me boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    (created_at at time zone 'Europe/Moscow')::date as day_date,
    sum(
      coalesce(setup_minutes, 0)
      + coalesce(print_minutes, 0)
      + coalesce(post_print_minutes, 0)
    )::int,
    count(distinct user_id)::int,
    sum(
      case
        when user_id = auth.uid() then
          coalesce(setup_minutes, 0)
          + coalesce(print_minutes, 0)
          + coalesce(post_print_minutes, 0)
        else 0
      end
    )::int,
    bool_or(user_id = auth.uid())
  from public.inkjet_jobs
  where created_at >= from_ts
    and created_at <= to_ts
  group by day_date
  order by day_date;
$$;

grant execute on function public.inkjet_period_day_stats(timestamptz, timestamptz) to authenticated;
