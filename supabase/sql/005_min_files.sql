-- Добавляем переменную «минимальное количество макетов/файлов в день»
-- Запуск: Supabase Dashboard → SQL Editor → Run

insert into public.settings (key, value, label, description)
values (
  'min_files',
  30,
  'Мин. кол-во макетов в день',
  'Минимальное количество файлов/макетов за день для начисления надбавки за макеты. В зачёт идёт только количество сверх минимума.'
)
on conflict (key) do nothing;
