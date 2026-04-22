import type { InkjetDayStat } from '../api/getInkjetPeriodDayStats';
import type { InkjetWorker } from '../model/types';
import type { AppSettings } from '../../settings';

/** Разбивка по дням периода с рассчитанной премией на каждого в смене. */
export type InkjetDailyBonus = {
  dateKey: string;
  /** «15 мар.» — для подписи на графике */
  label: string;
  totalMinutes: number;
  workersCount: number;
  workerIds: string[];
  /** Премия в рублях, начисленная КАЖДОМУ работнику смены за этот день */
  dayBonus: number;
};

/** Сводка по одному печатнику за период. */
export type InkjetWorkerBonus = {
  workerId: string;
  workerName: string;
  /** Кол-во смен, в которых участвовал */
  shiftsCount: number;
  /** Из них — смены с ненулевой премией */
  qualShiftsCount: number;
  /** Итог за период, ₽ */
  totalBonus: number;
};

function formatLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Основная формула на один день:
 *   R = totalMinutes
 *   workers = workersCount (из справочника, не по user_id)
 *   perWorkerBonus = R > min_total_minutes
 *                      ? max(0, ((R / 60) − (workers × norm)) × rate)
 *                      : 0
 */
function calcPerWorkerForDay(
  totalMinutes: number,
  workersCount: number,
  settings: AppSettings,
): number {
  const minTotal = settings.inkjet_min_total_minutes;
  const norm = settings.inkjet_norm_hours_per_worker;
  const rate = settings.inkjet_rate_per_hour;

  if (totalMinutes <= minTotal) return 0;
  if (workersCount <= 0) return 0;
  return Math.max(0, ((totalMinutes / 60) - (workersCount * norm)) * rate);
}

/**
 * Превращает массив дневных статов в список разбивок для графика.
 * dayBonus — премия каждому работнику за конкретный день (одинаковая для всех в смене).
 */
export function calcInkjetDailyBonuses(
  stats: InkjetDayStat[],
  settings: AppSettings,
): InkjetDailyBonus[] {
  return stats.map((s) => ({
    dateKey: s.dateKey,
    label: formatLabel(s.dateKey),
    totalMinutes: s.totalMinutes,
    workersCount: s.workersCount,
    workerIds: s.workerIds,
    dayBonus: calcPerWorkerForDay(s.totalMinutes, s.workersCount, settings),
  }));
}

/**
 * Подсчёт премии за период для КАЖДОГО печатника из справочника.
 * В результат включаем только тех, кто хоть раз участвовал в смене за период
 * (так дашборд не перегружен).
 */
export function calcInkjetWorkerBonuses(
  stats: InkjetDayStat[],
  workers: InkjetWorker[],
  settings: AppSettings,
): InkjetWorkerBonus[] {
  const nameById = new Map<string, string>(workers.map((w) => [w.id, w.label]));

  const acc = new Map<
    string,
    { shiftsCount: number; qualShiftsCount: number; totalBonus: number }
  >();

  for (const s of stats) {
    const perWorker = calcPerWorkerForDay(s.totalMinutes, s.workersCount, settings);
    for (const wid of s.workerIds) {
      if (!acc.has(wid)) {
        acc.set(wid, { shiftsCount: 0, qualShiftsCount: 0, totalBonus: 0 });
      }
      const cur = acc.get(wid)!;
      cur.shiftsCount += 1;
      if (perWorker > 0) cur.qualShiftsCount += 1;
      cur.totalBonus += perWorker;
    }
  }

  const result: InkjetWorkerBonus[] = [...acc.entries()].map(([wid, v]) => ({
    workerId: wid,
    workerName: nameById.get(wid) ?? '— удалён —',
    shiftsCount: v.shiftsCount,
    qualShiftsCount: v.qualShiftsCount,
    totalBonus: v.totalBonus,
  }));

  result.sort((a, b) => b.totalBonus - a.totalBonus);
  return result;
}

/**
 * Премия за сегодня — каждому работнику смены (одинаковая для всех).
 */
export function calcInkjetTodayBonus(
  totalMinutes: number,
  workersCount: number,
  settings: AppSettings,
): number {
  return calcPerWorkerForDay(totalMinutes, workersCount, settings);
}
