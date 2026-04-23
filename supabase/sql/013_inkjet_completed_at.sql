-- ============================================================
-- 013_inkjet_completed_at.sql
-- Время завершения: при переходе в «Выполнен» — now();
-- при уходе с «Выполнен» — null; повторный вход — снова now().
-- Запуск: Supabase Dashboard → SQL Editor → Run
-- ============================================================

alter table public.inkjet_jobs
  add column if not exists completed_at timestamptz;

-- Грубая оценка для уже закрытых заданий до появления поля
update public.inkjet_jobs
set completed_at = coalesce(completed_at, updated_at)
where status = 'Выполнен'
  and completed_at is null;

create or replace function public.inkjet_jobs_set_completed_at()
returns trigger
language plpgsql
as $f$
begin
  if tg_op = 'INSERT' then
    if new.status is not distinct from 'Выполнен' then
      new.completed_at := now();
    else
      new.completed_at := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.status is distinct from 'Выполнен' then
    new.completed_at := null;
  elsif old.status is distinct from 'Выполнен' then
    new.completed_at := now();
  else
    new.completed_at := old.completed_at;
  end if;
  return new;
end;
$f$;

drop trigger if exists inkjet_jobs_completed_at_biub on public.inkjet_jobs;

create trigger inkjet_jobs_completed_at_biub
before insert or update on public.inkjet_jobs
for each row
execute function public.inkjet_jobs_set_completed_at();
