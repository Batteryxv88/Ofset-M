-- Добавляем политику UPDATE для таблицы print_runs (пользователь редактирует свои записи)
-- Запуск: Supabase Dashboard → SQL Editor → Run

drop policy if exists "print_runs: update own" on public.print_runs;

create policy "print_runs: update own"
on public.print_runs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
