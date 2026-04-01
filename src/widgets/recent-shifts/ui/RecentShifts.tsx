import { useCallback, useEffect, useState } from 'react';
import { CircularProgress, Divider, Paper, Typography } from '@mui/material';
import { getRecentShifts, updatePrintRun } from '../../../features/print-run';
import type { Shift, ShiftRecord } from '../../../features/print-run';
import { formatNum } from '../../../shared/lib';
import './RecentShifts.scss';

const BW_PRINTERS = ['8210'];

type EditState = {
  id: string;
  files: string;
  run: string;
};

type Props = {
  userId: string;
  onUpdated?: () => void;
};

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ShiftColumn = ({
  shift,
  onUpdated,
}: {
  shift: Shift;
  onUpdated?: () => void;
}) => {
  const [records, setRecords] = useState<ShiftRecord[]>(shift.records);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const startEdit = (rec: ShiftRecord) => {
    setEdit({ id: rec.id, files: String(rec.files), run: String(rec.run) });
    setError(null);
  };

  const cancelEdit = () => {
    setEdit(null);
    setError(null);
  };

  const saveEdit = async () => {
    if (!edit) return;
    const files = parseInt(edit.files, 10);
    const run = parseInt(edit.run, 10);
    if (isNaN(files) || files < 1 || isNaN(run) || run < 1) {
      setError('Значения должны быть больше 0');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePrintRun(edit.id, { files, run });
      setRecords((prev) =>
        prev.map((r) => (r.id === edit.id ? { ...r, files, run } : r)),
      );
      setSavedId(edit.id);
      setTimeout(() => setSavedId(null), 2000);
      setEdit(null);
      onUpdated?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rs-shift">
      <div className="rs-shift__head">
        <Typography variant="body2" className="rs-shift__date">
          {shift.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {records.length}&nbsp;
          {records.length === 1 ? 'запись' : records.length < 5 ? 'записи' : 'записей'}
        </Typography>
      </div>

      {error && (
        <Typography variant="caption" color="error" className="rs-shift__error">
          {error}
        </Typography>
      )}

      <table className="rs-table">
        <thead>
          <tr>
            <th>Принтер</th>
            <th>Время</th>
            <th className="num">Файлы</th>
            <th className="num">Тираж</th>
            <th className="act" />
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => {
            const isEditing = edit?.id === rec.id;
            const isSaved = savedId === rec.id;
            const isBW = BW_PRINTERS.includes(rec.printer_model);

            return (
              <tr key={rec.id} className={isEditing ? 'rs-table__row--editing' : ''}>
                <td>
                  <span className={`rs-badge ${isBW ? 'rs-badge--bw' : 'rs-badge--color'}`}>
                    {rec.printer_model}
                  </span>
                </td>
                <td className="rs-table__time">{formatTime(rec.created_at)}</td>
                <td className="num">
                  {isEditing ? (
                    <input
                      className="rs-input"
                      type="number"
                      min={1}
                      value={edit.files}
                      onChange={(e) =>
                        setEdit((prev) => prev && { ...prev, files: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      autoFocus
                    />
                  ) : (
                    <span className={isSaved ? 'rs-table__val--saved' : ''}>
                      {formatNum(rec.files)}
                    </span>
                  )}
                </td>
                <td className="num">
                  {isEditing ? (
                    <input
                      className="rs-input"
                      type="number"
                      min={1}
                      value={edit.run}
                      onChange={(e) =>
                        setEdit((prev) => prev && { ...prev, run: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    />
                  ) : (
                    <span className={isSaved ? 'rs-table__val--saved' : ''}>
                      {formatNum(rec.run)}
                    </span>
                  )}
                </td>
                <td className="act">
                  {isEditing ? (
                    <div className="rs-actions">
                      <button
                        className="rs-btn rs-btn--save"
                        onClick={saveEdit}
                        disabled={saving}
                        title="Сохранить (Enter)"
                      >
                        {saving ? (
                          <CircularProgress size={11} color="inherit" />
                        ) : (
                          '✓'
                        )}
                      </button>
                      <button
                        className="rs-btn rs-btn--cancel"
                        onClick={cancelEdit}
                        disabled={saving}
                        title="Отмена"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="rs-btn rs-btn--edit"
                      onClick={() => startEdit(rec)}
                      title="Редактировать"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5zM9.5 2.5L11 1l2 2-1.5 1.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const RecentShifts = ({ userId, onUpdated }: Props) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getRecentShifts(userId, 2);
      setShifts(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Paper className="recent-shifts" elevation={0}>
      <div className="recent-shifts__header">
        <div>
          <Typography variant="subtitle2" className="recent-shifts__title">
            Последние смены
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Нажмите ✎ в строке, чтобы исправить значение
          </Typography>
        </div>
      </div>

      <Divider className="recent-shifts__divider" />

      {loading && (
        <div className="recent-shifts__loader">
          <CircularProgress size={20} />
        </div>
      )}

      {error && (
        <Typography variant="caption" color="error" className="recent-shifts__error">
          {error}
        </Typography>
      )}

      {!loading && !error && shifts.length === 0 && (
        <div className="recent-shifts__empty">
          <Typography variant="body2" color="text.secondary">
            Записей пока нет
          </Typography>
        </div>
      )}

      {!loading && shifts.length > 0 && (
        <div className="recent-shifts__body">
          {shifts.map((shift, idx) => (
            <>
              {idx > 0 && (
                <div key={`sep-${shift.dateKey}`} className="recent-shifts__vsep" />
              )}
              <ShiftColumn
                key={shift.dateKey}
                shift={shift}
                onUpdated={onUpdated}
              />
            </>
          ))}
        </div>
      )}
    </Paper>
  );
};

export default RecentShifts;
