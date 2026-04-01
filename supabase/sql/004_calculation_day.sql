-- Добавляем переменную "дата расчёта" в таблицу settings
-- Запуск: Supabase Dashboard → SQL Editor → Run

insert into public.settings (key, value, label, description)
values (
  'calculation_day',
  25,
  'Дата расчёта (число месяца)',
  'Число месяца, с которого начинается новый расчётный период (по умолчанию 25). Период: с этого числа предыдущего месяца по (число − 1) текущего месяца.'
)
on conflict (key) do nothing;
