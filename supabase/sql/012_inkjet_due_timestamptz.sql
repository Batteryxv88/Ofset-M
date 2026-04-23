-- ============================================================
-- 012_inkjet_due_timestamptz.sql
-- Срок сдачи: date → timestamptz (опционально время в приложении).
-- Календарный день из старых строк трактуем как полночь по Москве.
-- Идемпотентно: если тип уже timestamptz, ничего не делаем.
-- Запуск: Supabase Dashboard → SQL Editor → Run
-- ============================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inkjet_jobs'
      and column_name = 'due_date'
      and udt_name = 'date'
  ) then
    alter table public.inkjet_jobs
      alter column due_date type timestamptz
      using (
        case
          when due_date is null then null
          else ((due_date::text || ' 00:00:00')::timestamp at time zone 'Europe/Moscow')
        end
      );
  end if;
end $$;
