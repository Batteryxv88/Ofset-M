import { supabase } from '../../../shared/api/supabaseClient';

export type InkjetDayStat = {
  /** ISO date «2026-03-15» в МСК */
  dateKey: string;
  totalMinutes: number;
  workersCount: number;
  workerIds: string[];
};

/**
 * Агрегаты за каждый день периода, сгруппированные по МСК-дате.
 * Используется и на дашборде работника, и на админке — формула та же.
 */
export async function getInkjetPeriodDayStats(
  from: Date,
  to: Date,
): Promise<InkjetDayStat[]> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { data, error } = await supabase.rpc('inkjet_period_day_stats', {
    from_ts: from.toISOString(),
    to_ts: to.toISOString(),
  });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{
    day_date: string;
    total_minutes: number;
    workers_count: number;
    worker_ids: string[] | null;
  }>).map((r) => ({
    dateKey: r.day_date,
    totalMinutes: Number(r.total_minutes ?? 0),
    workersCount: Number(r.workers_count ?? 0),
    workerIds: (r.worker_ids ?? []) as string[],
  }));
}
