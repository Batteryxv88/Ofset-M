import type { RawInkjetJob } from '../api/getInkjetJobsInPeriod';
import type { UserProfile } from '../api/getPrintRunsInPeriod';
import type { AppSettings } from '../../settings';

/** Дата записи в локальном часовом поясе: «2026-03-15» */
function toLocalDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Детализация одной смены, в которой участвовал печатник */
export type InkjetShiftDetail = {
  dateKey: string;
  /** Человекочитаемая дата «15 мар.» */
  dateLabel: string;
  /** Сумма времени всех работ всех печатников за этот день, мин */
  totalMinutes: number;
  /** Сколько работников было в этот день (уникальные user_id) */
  workersCount: number;
  /** Премия каждому работнику смены за этот день, ₽ */
  perWorkerBonus: number;
};

export type InkjetUserBonusSummary = {
  user: UserProfile;
  /** Количество смен, в которых участвовал */
  shiftsCount: number;
  /** Количество смен с ненулевой премией */
  qualShiftsCount: number;
  /** Сумма отработанного времени самим работником, мин */
  ownMinutes: number;
  /** Итоговая премия, ₽ */
  totalBonus: number;
  /** Разбивка по сменам */
  shifts: InkjetShiftDetail[];
};

/** Детализация дня для визуализации в админке (общая, не по конкретному юзеру) */
export type InkjetDayDetail = InkjetShiftDetail & {
  /** ID работников, которые были в смене */
  workerIds: string[];
};

export type InkjetBonusReport = {
  /** Разбивка по дням (для визуализации) */
  days: InkjetDayDetail[];
  /** Разбивка по сотрудникам */
  users: InkjetUserBonusSummary[];
  /** Общая сумма всех выплат (Σ по всем сменам: perWorkerBonus × workersCount) */
  grandTotal: number;
};

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Рассчитывает премию печатников струйной печати за период.
 *
 * Правила:
 *   1) Работы всех печатников группируются по дню (локальная TZ).
 *   2) Для каждого дня:
 *        R = Σ (setup_minutes + print_minutes + post_print_minutes) по всем работам дня
 *        workers = количество уникальных user_id за день
 *   3) Если R > inkjet_min_total_minutes → премия за день считается, иначе 0.
 *   4) dayBonus = max(0, (R/60 − workers × inkjet_norm_hours_per_worker) × inkjet_rate_per_hour)
 *   5) dayBonus начисляется КАЖДОМУ работнику смены в полном объёме.
 *   6) Итоговая премия работника = Σ dayBonus за все смены, где он участвовал.
 */
export function calcInkjetBonuses(
  jobs: RawInkjetJob[],
  profiles: UserProfile[],
  settings: AppSettings,
): InkjetBonusReport {
  const profileMap = new Map<string, UserProfile>(profiles.map((p) => [p.id, p]));

  // dateKey → { totalMinutes, workerIds:Set, perUser: Map<userId, ownMinutes> }
  const byDay = new Map<
    string,
    { totalMinutes: number; workers: Set<string>; perUser: Map<string, number> }
  >();

  for (const job of jobs) {
    const dateKey = toLocalDateKey(job.created_at);
    if (!byDay.has(dateKey)) {
      byDay.set(dateKey, {
        totalMinutes: 0,
        workers: new Set(),
        perUser: new Map(),
      });
    }
    const bucket = byDay.get(dateKey)!;

    const setup = Number(job.setup_minutes ?? 0);
    const print = Number(job.print_minutes ?? 0);
    const post = Number(job.post_print_minutes ?? 0);
    const own = setup + print + post;

    bucket.totalMinutes += own;
    bucket.workers.add(job.user_id);
    bucket.perUser.set(job.user_id, (bucket.perUser.get(job.user_id) ?? 0) + own);
  }

  const minTotal = settings.inkjet_min_total_minutes;
  const norm = settings.inkjet_norm_hours_per_worker;
  const rate = settings.inkjet_rate_per_hour;

  const days: InkjetDayDetail[] = [];
  // userId → { shiftsCount, qualShiftsCount, ownMinutes, totalBonus, shifts[] }
  const byUser = new Map<
    string,
    {
      shiftsCount: number;
      qualShiftsCount: number;
      ownMinutes: number;
      totalBonus: number;
      shifts: InkjetShiftDetail[];
    }
  >();

  let grandTotal = 0;

  const sortedDays = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  for (const [dateKey, bucket] of sortedDays) {
    const workersCount = bucket.workers.size;
    const R = bucket.totalMinutes;

    const perWorkerBonus =
      R > minTotal
        ? Math.max(0, (R / 60 - workersCount * norm) * rate)
        : 0;

    const dayDetail: InkjetDayDetail = {
      dateKey,
      dateLabel: formatDayLabel(dateKey),
      totalMinutes: R,
      workersCount,
      perWorkerBonus,
      workerIds: [...bucket.workers],
    };
    days.push(dayDetail);
    grandTotal += perWorkerBonus * workersCount;

    for (const userId of bucket.workers) {
      if (!byUser.has(userId)) {
        byUser.set(userId, {
          shiftsCount: 0,
          qualShiftsCount: 0,
          ownMinutes: 0,
          totalBonus: 0,
          shifts: [],
        });
      }
      const u = byUser.get(userId)!;
      u.shiftsCount += 1;
      if (perWorkerBonus > 0) u.qualShiftsCount += 1;
      u.ownMinutes += bucket.perUser.get(userId) ?? 0;
      u.totalBonus += perWorkerBonus;
      u.shifts.push({
        dateKey,
        dateLabel: dayDetail.dateLabel,
        totalMinutes: R,
        workersCount,
        perWorkerBonus,
      });
    }
  }

  const users: InkjetUserBonusSummary[] = [...byUser.entries()].map(([userId, u]) => ({
    user:
      profileMap.get(userId) ?? { id: userId, name: null, email: null, role: null },
    shiftsCount: u.shiftsCount,
    qualShiftsCount: u.qualShiftsCount,
    ownMinutes: u.ownMinutes,
    totalBonus: u.totalBonus,
    shifts: u.shifts,
  }));

  users.sort((a, b) => b.totalBonus - a.totalBonus);

  return { days, users, grandTotal };
}
