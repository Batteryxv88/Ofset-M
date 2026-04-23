-- ============================================================
-- 007_inkjet.sql
-- Таблицы для струйной печати (УФ и широкий формат)
-- Запуск: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Справочник выпадающих списков ───────────────────────────
create table if not exists public.inkjet_options (
  id          uuid        primary key default gen_random_uuid(),
  category    text        not null check (category in ('manager', 'product_type', 'status')),
  label       text        not null,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.inkjet_options enable row level security;

-- Все авторизованные могут читать
create policy "inkjet_options: select all"
on public.inkjet_options for select to authenticated using (true);

-- Только admin может создавать/менять/удалять
create policy "inkjet_options: admin insert"
on public.inkjet_options for insert to authenticated
with check (public.is_admin());

create policy "inkjet_options: admin update"
on public.inkjet_options for update to authenticated
using (public.is_admin());

create policy "inkjet_options: admin delete"
on public.inkjet_options for delete to authenticated
using (public.is_admin());

-- Начальные статусы
insert into public.inkjet_options (category, label, sort_order) values
  ('status', 'В работе',  1),
  ('status', 'Выполнен',  2),
  ('status', 'На паузе',  3),
  ('status', 'Отменён',   4)
on conflict do nothing;


-- ── Задания струйной печати ───────────────────────────────────
create table if not exists public.inkjet_jobs (
  id                  uuid         primary key default gen_random_uuid(),
  user_id             uuid         not null references auth.users,
  print_type          text         not null check (print_type in ('uv', 'wide')),

  order_number        int,
  manager             text,
  product_type        text,
  quantity            int,
  due_date            timestamptz,
  post_print          text,
  setup_minutes       int,          -- приладка, в минутах

  -- Широкий формат (Ширка)
  print_width_m       numeric(7,2), -- ширина печати, м
  linear_meters       numeric(8,2), -- метры погонные

  -- УФ
  table_count         int,          -- количество столов

  -- Общие
  print_minutes       int,          -- время печати, в минутах
  post_print_minutes  int,          -- время постпечати, в минутах
  notes               text,
  status              text          default 'В работе',

  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  completed_at        timestamptz
);

alter table public.inkjet_jobs enable row level security;

create policy "inkjet_jobs: select own"
on public.inkjet_jobs for select to authenticated
using (user_id = auth.uid());

create policy "inkjet_jobs: insert own"
on public.inkjet_jobs for insert to authenticated
with check (user_id = auth.uid());

create policy "inkjet_jobs: update own"
on public.inkjet_jobs for update to authenticated
using  (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "inkjet_jobs: admin select all"
on public.inkjet_jobs for select to authenticated
using (public.is_admin());

-- completed_at: при входе в «Выполнен» — now(), при уходе — null (полная логика в 013 для старых БД)
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
