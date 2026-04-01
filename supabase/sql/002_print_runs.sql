-- Таблица для записей тиражей печати
-- Запуск: Supabase Dashboard -> SQL Editor -> Run

create table if not exists public.print_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  printer_model text not null,
  files integer not null,
  run integer not null,
  created_at timestamptz not null default now()
);

-- Валидации
alter table public.print_runs
  drop constraint if exists print_runs_printer_model_check;
alter table public.print_runs
  add constraint print_runs_printer_model_check
  check (printer_model in ('6100', '7210', '3070', '8210'));

alter table public.print_runs
  drop constraint if exists print_runs_files_check;
alter table public.print_runs
  add constraint print_runs_files_check
  check (files > 0);

alter table public.print_runs
  drop constraint if exists print_runs_run_check;
alter table public.print_runs
  add constraint print_runs_run_check
  check (run > 0);

create index if not exists print_runs_user_id_created_at_idx
on public.print_runs (user_id, created_at desc);

alter table public.print_runs enable row level security;

-- Пользователь видит свои записи
drop policy if exists "print_runs: select own" on public.print_runs;
create policy "print_runs: select own"
on public.print_runs
for select
to authenticated
using (user_id = auth.uid());

-- Пользователь может вставлять только от своего user_id
drop policy if exists "print_runs: insert own" on public.print_runs;
create policy "print_runs: insert own"
on public.print_runs
for insert
to authenticated
with check (user_id = auth.uid());

-- Админ видит все записи
drop policy if exists "print_runs: select all for admin" on public.print_runs;
create policy "print_runs: select all for admin"
on public.print_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

