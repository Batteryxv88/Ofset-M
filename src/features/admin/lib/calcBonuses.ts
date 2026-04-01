import type { RawPrintRun, UserProfile } from '../api/getPrintRunsInPeriod';
import type { AppSettings } from '../../settings';

const BW_PRINTERS = ['8210'];
const COLOR_PRINTERS = ['6100', '7210', '3070'];

/** Дата записи в локальном часовом поясе: «2026-03-15» */
function toLocalDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type DayData = {
  colorRun: number;
  bwRun: number;
  files: number;
};

export type UserBonusSummary = {
  user: UserProfile;

  /** Тираж сверх минимума (квалифицирующиеся дни) */
  qualColorRun: number;
  qualBwRun: number;
  /** Файлы сверх минимума (квалифицирующиеся дни) */
  qualFiles: number;

  /** Количество дней с ненулевым тиражом / прошедших минимум */
  colorDaysTotal: number;
  colorDaysQual: number;
  bwDaysTotal: number;
  bwDaysQual: number;
  filesDaysTotal: number;
  filesDaysQual: number;

  colorBonus: number;
  bwBonus: number;
  layoutBonus: number;
  totalBonus: number;
};

/**
 * Рассчитывает премию каждого сотрудника за расчётный период.
 *
 * Правило (проверяется КАЖДЫЙ ДЕНЬ отдельно):
 *   - color_run >= min_run_color → в зачёт: (color_run − min_run_color)
 *   - color_run <  min_run_color → 0
 *   - bw_run    >= min_run_bw   → в зачёт: (bw_run − min_run_bw)
 *   - bw_run    <  min_run_bw   → 0
 *   - files     >= min_files    → в зачёт: (files − min_files)
 *   - files     <  min_files    → 0
 *
 * Итоговая премия = Σ (по дням) [ color_above × price_color
 *                                + bw_above    × price_bw
 *                                + files_above × price_layout ]
 */
export function calcBonuses(
  runs: RawPrintRun[],
  profiles: UserProfile[],
  settings: AppSettings,
): UserBonusSummary[] {
  const profileMap = new Map<string, UserProfile>(profiles.map((p) => [p.id, p]));

  // user_id → date_key → DayData
  const byUserDay = new Map<string, Map<string, DayData>>();

  for (const run of runs) {
    if (!byUserDay.has(run.user_id)) {
      byUserDay.set(run.user_id, new Map());
    }
    const byDay = byUserDay.get(run.user_id)!;
    const dateKey = toLocalDateKey(run.created_at);

    if (!byDay.has(dateKey)) {
      byDay.set(dateKey, { colorRun: 0, bwRun: 0, files: 0 });
    }
    const day = byDay.get(dateKey)!;

    if (BW_PRINTERS.includes(run.printer_model)) {
      day.bwRun += Number(run.run ?? 0);
    } else if (COLOR_PRINTERS.includes(run.printer_model)) {
      day.colorRun += Number(run.run ?? 0);
    }
    // Файлы суммируются по всем принтерам за день
    day.files += Number(run.files ?? 0);
  }

  const result: UserBonusSummary[] = [];

  for (const [userId, byDay] of byUserDay) {
    let qualColorRun = 0;
    let qualBwRun = 0;
    let qualFiles = 0;
    let colorDaysTotal = 0;
    let colorDaysQual = 0;
    let bwDaysTotal = 0;
    let bwDaysQual = 0;
    let filesDaysTotal = 0;
    let filesDaysQual = 0;

    for (const day of byDay.values()) {
      // Цветная печать
      if (day.colorRun > 0) {
        colorDaysTotal++;
        if (day.colorRun >= settings.min_run_color) {
          qualColorRun += day.colorRun - settings.min_run_color;
          colorDaysQual++;
        }
      }

      // Ч/Б печать
      if (day.bwRun > 0) {
        bwDaysTotal++;
        if (day.bwRun >= settings.min_run_bw) {
          qualBwRun += day.bwRun - settings.min_run_bw;
          bwDaysQual++;
        }
      }

      // Файлы/макеты (суммируются по всем принтерам за день)
      if (day.files > 0) {
        filesDaysTotal++;
        if (day.files >= settings.min_files) {
          qualFiles += day.files - settings.min_files;
          filesDaysQual++;
        }
      }
    }

    const colorBonus = qualColorRun * settings.price_color;
    const bwBonus = qualBwRun * settings.price_bw;
    const layoutBonus = qualFiles * settings.price_layout;

    result.push({
      user: profileMap.get(userId) ?? { id: userId, name: null, email: null, role: null },
      qualColorRun,
      qualBwRun,
      qualFiles,
      colorDaysTotal,
      colorDaysQual,
      bwDaysTotal,
      bwDaysQual,
      filesDaysTotal,
      filesDaysQual,
      colorBonus,
      bwBonus,
      layoutBonus,
      totalBonus: colorBonus + bwBonus + layoutBonus,
    });
  }

  result.sort((a, b) => b.totalBonus - a.totalBonus);
  return result;
}
