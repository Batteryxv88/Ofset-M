import { supabase } from '../../../shared/api/supabaseClient';

export type InkjetDayStat = {
  /** ISO date «2026-03-15» */
  dateKey: string;
  totalMinutes: number;
  workersCount: number;
  ownMinutes: number;
  involvesMe: boolean;
};

/**
 * Возвращает агрегаты за каждый день периода, сгруппированные по МСК-дате.
 * Используется для расчёта премии пользователя за расчётный период.
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
    own_minutes: number;
    involves_me: boolean;
  }>).map((r) => ({
    dateKey: r.day_date,
    totalMinutes: Number(r.total_minutes ?? 0),
    workersCount: Number(r.workers_count ?? 0),
    ownMinutes: Number(r.own_minutes ?? 0),
    involvesMe: Boolean(r.involves_me ?? false),
  }));
}
