-- 011_inkjet_options_unique.sql
-- Запрещаем дубликаты значений в справочниках струйной печати.
-- Уникальность — на уровне (category, lower(trim(label))),
-- чтобы "Стенд", "стенд", "СТЕНД " считались одной позицией.

-- 1. Сначала привести существующие значения к единому виду (обрезать пробелы).
update public.inkjet_options
set label = regexp_replace(label, '^\s+|\s+$', '', 'g')
where label <> regexp_replace(label, '^\s+|\s+$', '', 'g');

-- 2. На всякий случай удалить дубликаты, оставив самый старый по created_at.
with ranked as (
  select
    id,
    row_number() over (
      partition by category, lower(label)
      order by created_at asc nulls last, id asc
    ) as rn
  from public.inkjet_options
)
delete from public.inkjet_options o
using ranked r
where o.id = r.id and r.rn > 1;

-- 3. Собственно уникальный индекс.
create unique index if not exists inkjet_options_category_label_uidx
  on public.inkjet_options (category, lower(label));
