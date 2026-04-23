const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localHm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isLocalMidnight(d: Date): boolean {
  return (
    d.getHours() === 0
    && d.getMinutes() === 0
    && d.getSeconds() === 0
    && d.getMilliseconds() === 0
  );
}

/** Поля формы из значения из БД / API (timestamptz ISO или старый date `YYYY-MM-DD`). */
export function dueValueToForm(raw: string | null | undefined): { date: string; time: string } {
  if (!raw) return { date: '', time: '' };
  const s = raw.trim();
  if (DATE_ONLY.test(s)) return { date: s, time: '' };

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };

  return {
    date: localYmd(parsed),
    time: isLocalMidnight(parsed) ? '' : localHm(parsed),
  };
}

/**
 * ISO для колонки timestamptz: только дата → локальная полночь этого дня;
 * дата + время → локальный момент.
 */
export function dueFormToIso(dateYmd: string, timeHm: string): string | null {
  const d = dateYmd.trim();
  if (!d) return null;
  const t = timeHm.trim();
  const local = t ? `${d}T${t}:00` : `${d}T00:00:00`;
  const ms = new Date(local).getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/** Короткая подпись для списка и карточек. */
export function formatDueShortRu(raw: string | null | undefined): string {
  if (!raw) return '—';
  const s = raw.trim();
  if (DATE_ONLY.test(s)) {
    const [y, mo, day] = s.split('-').map((x) => parseInt(x, 10));
    const cal = new Date(y, mo - 1, day);
    return cal.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return '—';

  if (isLocalMidnight(parsed)) {
    return parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  return parsed.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
