import { supabase } from '../../../shared/api/supabaseClient';

export type ShiftRecord = {
  id: string;
  printer_model: string;
  files: number;
  run: number;
  created_at: string;
};

export type Shift = {
  dateKey: string;
  label: string;
  records: ShiftRecord[];
};

function toLocalDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toShiftLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const todayKey = toLocalDateKey(today.toISOString());
  const yesterdayKey = toLocalDateKey(yesterday.toISOString());

  const shortDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  if (dateKey === todayKey) return `Сегодня · ${shortDate}`;
  if (dateKey === yesterdayKey) return `Вчера · ${shortDate}`;
  return shortDate;
}

/**
 * Возвращает последние N смен (дней) пользователя со всеми их записями.
 */
export async function getRecentShifts(userId: string, limit = 2): Promise<Shift[]> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { data, error } = await supabase
    .from('print_runs')
    .select('id, printer_model, files, run, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const records = (data ?? []) as ShiftRecord[];

  // Группируем по дате (локальный часовой пояс)
  const byDate = new Map<string, ShiftRecord[]>();
  for (const rec of records) {
    const key = toLocalDateKey(rec.created_at);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(rec);
  }

  // Берём последние N уникальных дат
  const sortedDates = [...byDate.keys()].sort((a, b) => b.localeCompare(a)).slice(0, limit);

  return sortedDates.map((dateKey) => ({
    dateKey,
    label: toShiftLabel(dateKey),
    records: byDate.get(dateKey)!.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  }));
}
