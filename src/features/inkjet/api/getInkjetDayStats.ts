import { supabase } from '../../../shared/api/supabaseClient';

export type InkjetDayStats = {
  totalMinutes: number;
  workersCount: number;
  /** ID печатников, которые были в смене сегодня (из inkjet_options category='worker') */
  workerIds: string[];
};

/**
 * Агрегаты струйной печати за один день (локальный TZ).
 * workers_count считается по ⋃ worker_ids всех записей дня.
 */
export async function getInkjetDayStats(day: Date): Promise<InkjetDayStats> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase.rpc('inkjet_day_stats', {
    day_start: dayStart.toISOString(),
    day_end: dayEnd.toISOString(),
  });

  if (error) throw new Error(error.message);

  const row = (data?.[0] ?? {}) as {
    total_minutes?: number;
    workers_count?: number;
    worker_ids?: string[] | null;
  };

  return {
    totalMinutes: Number(row.total_minutes ?? 0),
    workersCount: Number(row.workers_count ?? 0),
    workerIds: (row.worker_ids ?? []) as string[],
  };
}
