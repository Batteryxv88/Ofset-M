import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'inkjet_today_shift_v1';

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type StoredShift = {
  date: string;
  workerIds: string[];
};

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShift;
    if (!parsed || parsed.date !== todayKey()) return [];
    return Array.isArray(parsed.workerIds) ? parsed.workerIds : [];
  } catch {
    return [];
  }
}

function write(workerIds: string[]) {
  try {
    const payload: StoredShift = { date: todayKey(), workerIds };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // silent
  }
}

/**
 * Хранит локально для устройства список печатников, которые сегодня в смене.
 * Сбрасывается автоматически при смене даты (читаем — и видим, что date !== today).
 */
export function useInkjetShift() {
  const [workerIds, setWorkerIds] = useState<string[]>(() => read());

  useEffect(() => {
    // Синхронизируем, если был переход через полночь или смена вкладки
    const onFocus = () => setWorkerIds(read());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const setShift = useCallback((ids: string[]) => {
    const unique = Array.from(new Set(ids));
    write(unique);
    setWorkerIds(unique);
  }, []);

  const toggle = useCallback((id: string) => {
    setWorkerIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setWorkerIds([]);
  }, []);

  return { workerIds, setShift, toggle, clear };
}
