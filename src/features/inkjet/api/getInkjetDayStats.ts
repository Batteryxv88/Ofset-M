import { supabase } from '../../../shared/api/supabaseClient';

export type InkjetDayStats = {
  totalMinutes: number;
  workersCount: number;
  ownMinutes: number;
  involvesMe: boolean;
};

/**
 * Возвращает агрегаты струйной печати за один день.
 * Клиент сам задаёт границы (обычно — локальные 00:00 … 23:59 сегодня).
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
    own_minutes?: number;
    involves_me?: boolean;
  };

  return {
    totalMinutes: Number(row.total_minutes ?? 0),
    workersCount: Number(row.workers_count ?? 0),
    ownMinutes: Number(row.own_minutes ?? 0),
    involvesMe: Boolean(row.involves_me ?? false),
  };
}
