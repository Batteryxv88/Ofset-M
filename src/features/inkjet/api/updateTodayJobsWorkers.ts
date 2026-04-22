import { supabase } from '../../../shared/api/supabaseClient';

/**
 * Массово обновляет worker_ids во всех заданиях за текущий день.
 * Вызывается при изменении состава смены (кнопка «Готово»),
 * чтобы агрегаты inkjet_day_stats пересчитались корректно.
 */
export async function updateTodayJobsWorkers(workerIds: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const { error } = await supabase
    .from('inkjet_jobs')
    .update({ worker_ids: workerIds })
    .gte('created_at', dayStart.toISOString())
    .lte('created_at', dayEnd.toISOString());

  if (error) throw new Error(error.message);
}
