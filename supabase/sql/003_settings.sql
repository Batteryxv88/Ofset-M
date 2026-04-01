-- Таблица переменных системы (тарифы, пороги для расчёта премии)
-- Запуск: Supabase Dashboard → SQL Editor → Run

create table if not exists public.settings (
  key text primary key,
  value numeric not null,
  label text not null,
  description text,
  updated_at timestamptz not null default now()
);

-- Триггер обновления updated_at (функция уже есть из 001_profiles.sql)
drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

-- RLS
alter table public.settings enable row level security;

-- Все авторизованные могут читать настройки (нужно для расчёта плана на дашборде)
drop policy if exists "settings: read" on public.settings;
create policy "settings: read"
on public.settings
for select
to authenticated
using (true);

-- Вспомогательная функция проверки роли admin (SECURITY DEFINER обходит RLS без рекурсии)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Изменять могут только администраторы
drop policy if exists "settings: write admin" on public.settings;
create policy "settings: write admin"
on public.settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Значения по умолчанию
insert into public.settings (key, value, label, description) values
  ('min_run_color', 4500, 'Мин. тираж — цвет',    'Минимальный тираж листов в смену для начисления надбавки (цветная печать)'),
  ('min_run_bw',    4500, 'Мин. тираж — Ч/Б',     'Минимальный тираж листов в смену для начисления надбавки (ч/б печать)'),
  ('price_color',   0.20, 'Цена листа — цвет',    'Стоимость печати одного листа на цветном принтере (руб.)'),
  ('price_bw',      0.12, 'Цена листа — Ч/Б',     'Стоимость печати одного листа на ч/б принтере (руб.)'),
  ('price_layout',  12,   'Цена макета (файла)',   'Стоимость обработки одного файла/макета (руб.)')
on conflict (key) do nothing;

-- Дополнительная политика: admin может читать все профили
-- Используем is_admin() чтобы избежать рекурсии (функция с SECURITY DEFINER)
drop policy if exists "profiles: select all for admin" on public.profiles;
create policy "profiles: select all for admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_admin()
);
