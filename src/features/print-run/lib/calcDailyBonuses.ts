import type { PeriodRun } from '../api/getMyPeriodRuns';
import type { AppSettings } from '../../settings';

const BW_PRINTERS = ['8210'];
const COLOR_PRINTERS = ['6100', '7210', '3070'];

function toLocalDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDisplayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export type DayBonus = {
  dateKey: string;
  label: string;
  colorAbove: number;
  bwAbove: number;
  filesAbove: number;
  colorBonus: number;
  bwBonus: number;
  layoutBonus: number;
  total: number;
};

export type MyBonusSummary = {
  totalBonus: number;
  colorBonus: number;
  bwBonus: number;
  layoutBonus: number;
  qualColorRun: number;
  qualBwRun: number;
  qualFiles: number;
  dailyBreakdown: DayBonus[];
};

/**
 * Считает подневную премию одного печатника за период.
 * Каждый день проверяется на минимум; в зачёт — только сверх минимума.
 */
export function calcDailyBonuses(
  runs: PeriodRun[],
  settings: AppSettings,
): MyBonusSummary {
  // dateKey → { colorRun, bwRun, files }
  const byDay = new Map<string, { colorRun: number; bwRun: number; files: number }>();

  for (const run of runs) {
    const key = toLocalDateKey(run.created_at);
    if (!byDay.has(key)) byDay.set(key, { colorRun: 0, bwRun: 0, files: 0 });
    const day = byDay.get(key)!;

    if (BW_PRINTERS.includes(run.printer_model)) {
      day.bwRun += Number(run.run ?? 0);
    } else if (COLOR_PRINTERS.includes(run.printer_model)) {
      day.colorRun += Number(run.run ?? 0);
    }
    day.files += Number(run.files ?? 0);
  }

  const dailyBreakdown: DayBonus[] = [];
  let totalColorBonus = 0;
  let totalBwBonus = 0;
  let totalLayoutBonus = 0;
  let qualColorRun = 0;
  let qualBwRun = 0;
  let qualFiles = 0;

  for (const [dateKey, day] of [...byDay.entries()].sort()) {
    const colorAbove =
      day.colorRun >= settings.min_run_color ? day.colorRun - settings.min_run_color : 0;
    const bwAbove =
      day.bwRun >= settings.min_run_bw ? day.bwRun - settings.min_run_bw : 0;
    const filesAbove =
      day.files >= settings.min_files ? day.files - settings.min_files : 0;

    const colorBonus = colorAbove * settings.price_color;
    const bwBonus = bwAbove * settings.price_bw;
    const layoutBonus = filesAbove * settings.price_layout;

    qualColorRun += colorAbove;
    qualBwRun += bwAbove;
    qualFiles += filesAbove;
    totalColorBonus += colorBonus;
    totalBwBonus += bwBonus;
    totalLayoutBonus += layoutBonus;

    dailyBreakdown.push({
      dateKey,
      label: toDisplayLabel(dateKey),
      colorAbove,
      bwAbove,
      filesAbove,
      colorBonus,
      bwBonus,
      layoutBonus,
      total: colorBonus + bwBonus + layoutBonus,
    });
  }

  return {
    totalBonus: totalColorBonus + totalBwBonus + totalLayoutBonus,
    colorBonus: totalColorBonus,
    bwBonus: totalBwBonus,
    layoutBonus: totalLayoutBonus,
    qualColorRun,
    qualBwRun,
    qualFiles,
    dailyBreakdown,
  };
}
