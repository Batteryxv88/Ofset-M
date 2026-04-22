import type { InkjetDayStat } from '../api/getInkjetPeriodDayStats';
import type { AppSettings } from '../../settings';

export type InkjetDailyBonus = {
  dateKey: string;
  /** «15 мар.» — для подписи на графике */
  label: string;
  totalMinutes: number;
  workersCount: number;
  ownMinutes: number;
  involvesMe: boolean;
  /** Премия в рублях, начисленная этому пользователю за этот день */
  dayBonus: number;
};

export type InkjetMyBonusSummary = {
  /** Общая премия пользователя за период, ₽ */
  totalBonus: number;
  /** Всего смен пользователя */
  shiftsCount: number;
  /** Смен с ненулевой премией */
  qualShiftsCount: number;
  /** Суммарное собственное время работы за период, мин */
  ownMinutes: number;
  /** Разбивка по дням (только те, где пользователь работал) */
  dailyBreakdown: InkjetDailyBonus[];
};

function formatLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Считает премию пользователя за период на основе дневных агрегатов.
 *
 * Формула (для каждого дня):
 *   R = totalMinutes
 *   workers = workersCount
 *   perWorkerBonus = R > min_total_minutes
 *                      ? max(0, (R/60 − workers × norm) × rate)
 *                      : 0
 *   dayBonus(user) = involvesMe ? perWorkerBonus : 0
 *
 * Итог = Σ dayBonus по всем дням, где пользователь участвовал.
 */
export function calcInkjetDailyBonuses(
  stats: InkjetDayStat[],
  settings: AppSettings,
): InkjetMyBonusSummary {
  const minTotal = settings.inkjet_min_total_minutes;
  const norm = settings.inkjet_norm_hours_per_worker;
  const rate = settings.inkjet_rate_per_hour;

  const breakdown: InkjetDailyBonus[] = [];
  let totalBonus = 0;
  let shiftsCount = 0;
  let qualShiftsCount = 0;
  let ownMinutes = 0;

  for (const s of stats) {
    if (!s.involvesMe) continue;

    const perWorker =
      s.totalMinutes > minTotal
        ? Math.max(0, (s.totalMinutes / 60 - s.workersCount * norm) * rate)
        : 0;

    breakdown.push({
      dateKey: s.dateKey,
      label: formatLabel(s.dateKey),
      totalMinutes: s.totalMinutes,
      workersCount: s.workersCount,
      ownMinutes: s.ownMinutes,
      involvesMe: s.involvesMe,
      dayBonus: perWorker,
    });

    totalBonus += perWorker;
    shiftsCount += 1;
    if (perWorker > 0) qualShiftsCount += 1;
    ownMinutes += s.ownMinutes;
  }

  return { totalBonus, shiftsCount, qualShiftsCount, ownMinutes, dailyBreakdown: breakdown };
}

/**
 * Вычисляет премию за один сегодняшний день по тем же правилам.
 * Возвращает, сколько получит КАЖДЫЙ работник смены сегодня.
 */
export function calcInkjetTodayBonus(
  totalMinutes: number,
  workersCount: number,
  settings: AppSettings,
): number {
  const minTotal = settings.inkjet_min_total_minutes;
  const norm = settings.inkjet_norm_hours_per_worker;
  const rate = settings.inkjet_rate_per_hour;

  if (totalMinutes <= minTotal) return 0;
  return Math.max(0, (totalMinutes / 60 - workersCount * norm) * rate);
}
