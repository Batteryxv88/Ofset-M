/** Форматирует число по правилам русской локали: 4500 → «4 500» */
export function formatNum(n: number): string {
  return n.toLocaleString('ru-RU');
}

/** Форматирует валюту: 1234.5 → «1 234,50 ₽» */
export function formatRub(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
}

/** Возвращает инициалы для аватара */
export function avatarLetters(name?: string | null, email?: string | null): string {
  if (name) return name.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export type BillingPeriod = {
  /** Начало периода (включительно) */
  from: Date;
  /** Конец периода (включительно, 23:59:59) */
  to: Date;
  /** Строка для отображения, напр. «25 фев — 24 мар 2026» */
  label: string;
};

/**
 * Рассчитывает текущий расчётный период.
 *
 * Логика (calcDay = 25):
 *   - Если сегодня < 25: период = [25 пред. месяца, 24 тек. месяца]
 *   - Если сегодня >= 25: период = [25 тек. месяца, 24 след. месяца]
 *
 * "до 24 числа" означает конец дня 24-го (23:59:59).
 */
export function getBillingPeriod(calcDay: number, now: Date = new Date()): BillingPeriod {
  const day = now.getDate();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  let from: Date;
  let to: Date;

  if (day < calcDay) {
    // Ещё не наступил calcDay в этом месяце → период с прошлого месяца
    from = new Date(y, m - 1, calcDay, 0, 0, 0, 0);
    to = new Date(y, m, calcDay - 1, 23, 59, 59, 999);
  } else {
    // calcDay уже прошёл или сегодня → период с этого месяца
    from = new Date(y, m, calcDay, 0, 0, 0, 0);
    to = new Date(y, m + 1, calcDay - 1, 23, 59, 59, 999);
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

  return { from, to, label: `${fmt(from)} — ${fmt(to)}` };
}
