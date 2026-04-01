-- ФИКС: infinite recursion в RLS политике profiles
-- Проблема: политика "profiles: select all for admin" проверяет роль через запрос
-- к той же таблице profiles → бесконечная рекурсия.
-- Решение: вспомогательная функция с SECURITY DEFINER (обходит RLS).

-- 1. Вспомогательная функция проверки роли admin (без рекурсии)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 2. Убираем проблемную политику из 003_settings.sql
drop policy if exists "profiles: select all for admin" on public.profiles;

-- 3. Создаём безопасную политику через функцию (без рекурсии)
create policy "profiles: select all for admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id          -- своя строка (стандартная логика)
  or public.is_admin()     -- или это admin → читает все
);

-- 4. Обновляем политику settings → тоже используем функцию
drop policy if exists "settings: write admin" on public.settings;
create policy "settings: write admin"
on public.settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
