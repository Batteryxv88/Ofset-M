import { useCallback, useEffect, useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Paper, Typography,
} from '@mui/material';
import { getMyInkjetJobs, getInkjetOptions, updateInkjetJob } from '../../../features/inkjet';
import type { InkjetJob, InkjetOption, PrintType } from '../../../features/inkjet';
import './InkjetJobs.scss';

type DurUnit = 'min' | 'hour' | 'day';
const DUR_UNITS: { value: DurUnit; label: string; factor: number }[] = [
  { value: 'min',  label: 'мин', factor: 1 },
  { value: 'hour', label: 'ч',   factor: 60 },
  { value: 'day',  label: 'дн',  factor: 480 },
];

function minutesToDur(min: number | null): { val: string; unit: DurUnit } {
  if (!min) return { val: '', unit: 'min' };
  if (min % 480 === 0) return { val: String(min / 480), unit: 'day' };
  if (min % 60 === 0)  return { val: String(min / 60),  unit: 'hour' };
  return { val: String(min), unit: 'min' };
}

function durToMinutes(val: string, unit: DurUnit): number | null {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n <= 0) return null;
  return Math.round(n * DUR_UNITS.find((u) => u.value === unit)!.factor);
}

function formatDur(min: number | null): string {
  if (!min) return '—';
  const d = minutesToDur(min);
  return `${d.val} ${DUR_UNITS.find((u) => u.value === d.unit)!.label}`;
}

const STATUS_COLORS: Record<string, string> = {
  'В работе': 'var(--ij-status-active)',
  'Выполнен': 'var(--ij-status-done)',
  'На паузе': 'var(--ij-status-pause)',
  'Отменён':  'var(--ij-status-cancel)',
};

// ── Edit Dialog ────────────────────────────────────────────────
type EditState = {
  manager: string; product_type: string; quantity: string;
  due_date: string; post_print: string;
  setup_val: string; setup_unit: DurUnit;
  print_width_m: string; linear_meters: string; table_count: string;
  print_val: string; print_unit: DurUnit;
  post_print_val: string; post_print_unit: DurUnit;
  notes: string; status: string;
};

function jobToEdit(job: InkjetJob): EditState {
  const setupDur  = minutesToDur(job.setup_minutes);
  const printDur  = minutesToDur(job.print_minutes);
  const postDur   = minutesToDur(job.post_print_minutes);
  return {
    manager:       job.manager       ?? '',
    product_type:  job.product_type  ?? '',
    quantity:      job.quantity != null ? String(job.quantity) : '',
    due_date:      job.due_date      ?? '',
    post_print:    job.post_print    ?? '',
    setup_val:  setupDur.val,  setup_unit:  setupDur.unit,
    print_width_m: job.print_width_m  != null ? String(job.print_width_m)  : '',
    linear_meters: job.linear_meters  != null ? String(job.linear_meters)  : '',
    table_count:   job.table_count    != null ? String(job.table_count)    : '',
    print_val:  printDur.val,  print_unit:  printDur.unit,
    post_print_val: postDur.val, post_print_unit: postDur.unit,
    notes:  job.notes  ?? '',
    status: job.status ?? '',
  };
}

const DurField = ({ label, val, unit, onVal, onUnit }: {
  label: string; val: string; unit: DurUnit;
  onVal: (v: string) => void; onUnit: (u: DurUnit) => void;
}) => (
  <div className="ij-edit__field">
    <label className="ij-edit__label">{label}</label>
    <div className="ij-edit__dur-wrap">
      <input type="number" min={0} className="ij-edit__input ij-edit__input--dur"
        value={val} onChange={(e) => onVal(e.target.value)} />
      <select className="ij-edit__select ij-edit__select--unit" value={unit}
        onChange={(e) => onUnit(e.target.value as DurUnit)}>
        {DUR_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
      </select>
    </div>
  </div>
);

const EditDialog = ({
  job, options, onClose, onSaved,
}: {
  job: InkjetJob; options: InkjetOption[];
  onClose: () => void; onSaved: () => void;
}) => {
  const [form, setForm] = useState<EditState>(() => jobToEdit(job));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opt = (cat: InkjetOption['category']) =>
    options.filter((o) => o.category === cat);

  const set = <K extends keyof EditState>(k: K, v: EditState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateInkjetJob(job.id, {
        manager:       form.manager      || null,
        product_type:  form.product_type || null,
        quantity:      form.quantity     ? parseInt(form.quantity, 10)      : null,
        due_date:      form.due_date     || null,
        post_print:    form.post_print   || null,
        setup_minutes: durToMinutes(form.setup_val, form.setup_unit),
        print_width_m: form.print_width_m ? parseFloat(form.print_width_m) : null,
        linear_meters: form.linear_meters ? parseFloat(form.linear_meters) : null,
        table_count:   form.table_count   ? parseInt(form.table_count, 10) : null,
        print_minutes:      durToMinutes(form.print_val,      form.print_unit),
        post_print_minutes: durToMinutes(form.post_print_val, form.post_print_unit),
        notes:  form.notes  || null,
        status: form.status || null,
      });
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  const isWide = job.print_type === 'wide';

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ className: 'ij-dialog' }}>
      <DialogTitle className="ij-dialog__title">
        <span>Заказ #{job.order_number}</span>
        <span className={`ij-badge ij-badge--${job.print_type}`}>
          {isWide ? 'Ширка' : 'УФ'}
        </span>
      </DialogTitle>
      <DialogContent className="ij-dialog__body">
        {error && (
          <Typography variant="caption" color="error" className="ij-dialog__error">
            {error}
          </Typography>
        )}

        <div className="ij-edit__row ij-edit__row--2">
          <div className="ij-edit__field">
            <label className="ij-edit__label">Менеджер</label>
            <select className="ij-edit__select" value={form.manager}
              onChange={(e) => set('manager', e.target.value)}>
              <option value="">— не выбрано —</option>
              {opt('manager').map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
            </select>
          </div>
          <div className="ij-edit__field">
            <label className="ij-edit__label">Тип изделия</label>
            <select className="ij-edit__select" value={form.product_type}
              onChange={(e) => set('product_type', e.target.value)}>
              <option value="">— не выбрано —</option>
              {opt('product_type').map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="ij-edit__row ij-edit__row--3">
          <div className="ij-edit__field">
            <label className="ij-edit__label">Тираж</label>
            <input type="number" min={1} className="ij-edit__input"
              value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          </div>
          <div className="ij-edit__field">
            <label className="ij-edit__label">Дата сдачи</label>
            <input type="date" className="ij-edit__input ij-edit__input--date"
              value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
          </div>
          <div className="ij-edit__field">
            <label className="ij-edit__label">Статус</label>
            <select className="ij-edit__select" value={form.status}
              onChange={(e) => set('status', e.target.value)}>
              <option value="">— не выбрано —</option>
              {opt('status').map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {isWide ? (
          <div className="ij-edit__row ij-edit__row--2">
            <div className="ij-edit__field">
              <label className="ij-edit__label">Ширина печати, м</label>
              <input type="number" min={0} step={0.01} className="ij-edit__input"
                value={form.print_width_m} onChange={(e) => set('print_width_m', e.target.value)} />
            </div>
            <div className="ij-edit__field">
              <label className="ij-edit__label">Метры погонные, м</label>
              <input type="number" min={0} step={0.01} className="ij-edit__input"
                value={form.linear_meters} onChange={(e) => set('linear_meters', e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="ij-edit__row ij-edit__row--2">
            <div className="ij-edit__field">
              <label className="ij-edit__label">Количество столов</label>
              <input type="number" min={1} className="ij-edit__input"
                value={form.table_count} onChange={(e) => set('table_count', e.target.value)} />
            </div>
          </div>
        )}

        <div className="ij-edit__row ij-edit__row--3">
          <DurField label="Приладка"
            val={form.setup_val} unit={form.setup_unit}
            onVal={(v) => set('setup_val', v)} onUnit={(u) => set('setup_unit', u)} />
          <DurField label="Время печати"
            val={form.print_val} unit={form.print_unit}
            onVal={(v) => set('print_val', v)} onUnit={(u) => set('print_unit', u)} />
          <DurField label="Вр. постпечати"
            val={form.post_print_val} unit={form.post_print_unit}
            onVal={(v) => set('post_print_val', v)} onUnit={(u) => set('post_print_unit', u)} />
        </div>

        <div className="ij-edit__row ij-edit__row--1">
          <div className="ij-edit__field">
            <label className="ij-edit__label">Постпечать</label>
            <input type="text" className="ij-edit__input"
              value={form.post_print} onChange={(e) => set('post_print', e.target.value)} />
          </div>
        </div>
        <div className="ij-edit__row ij-edit__row--1">
          <div className="ij-edit__field">
            <label className="ij-edit__label">Примечание</label>
            <textarea className="ij-edit__textarea" rows={2}
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
      </DialogContent>

      <DialogActions className="ij-dialog__actions">
        <Button onClick={onClose} disabled={saving} size="small">Отмена</Button>
        <Button variant="contained" size="small" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={14} color="inherit" /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main widget ────────────────────────────────────────────────
type Props = {
  userId: string;
  refreshTrigger?: number;
};

const InkjetJobs = ({ userId, refreshTrigger = 0 }: Props) => {
  const [jobs, setJobs]       = useState<InkjetJob[]>([]);
  const [options, setOptions] = useState<InkjetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [editing, setEditing] = useState<InkjetJob | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [j, o] = await Promise.all([
        getMyInkjetJobs(userId),
        getInkjetOptions(),
      ]);
      setJobs(j);
      setOptions(o);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load, refreshTrigger]);

  const handleSaved = () => {
    setEditing(null);
    void load();
  };

  return (
    <Paper className="ij-jobs" elevation={0}>
      <div className="ij-jobs__header">
        <div>
          <Typography variant="subtitle2" className="ij-jobs__title">
            Мои задания
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Нажмите ✎ чтобы отредактировать запись
          </Typography>
        </div>
        {loading && <CircularProgress size={16} />}
      </div>

      <Divider className="ij-jobs__divider" />

      {error && (
        <Typography variant="caption" color="error" className="ij-jobs__msg">
          {error}
        </Typography>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="ij-jobs__empty">
          <Typography variant="body2" color="text.secondary">Заданий пока нет</Typography>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="ij-jobs__wrap">
          <table className="ij-jobs__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Тип</th>
                <th>Изделие</th>
                <th className="num">Тираж</th>
                <th>Менеджер</th>
                <th>Статус</th>
                <th>Сдача</th>
                <th className="num">Ширина</th>
                <th className="num">Погон. м</th>
                <th className="num">Столов</th>
                <th className="num">Приладка</th>
                <th className="num">Печать</th>
                <th className="num">Постпечать</th>
                <th className="act" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="ij-jobs__order">#{job.order_number ?? '—'}</td>
                  <td>
                    <span className={`ij-badge ij-badge--${job.print_type}`}>
                      {job.print_type === 'wide' ? 'Ширка' : 'УФ'}
                    </span>
                  </td>
                  <td>{job.product_type ?? '—'}</td>
                  <td className="num">{job.quantity ?? '—'}</td>
                  <td>{job.manager ?? '—'}</td>
                  <td>
                    {job.status ? (
                      <span
                        className="ij-status"
                        style={{ '--status-color': STATUS_COLORS[job.status] ?? 'rgba(255,255,255,0.3)' } as React.CSSProperties}
                      >
                        {job.status}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {job.due_date
                      ? new Date(job.due_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                      : '—'}
                  </td>
                  <td className="num">{job.print_width_m  != null ? `${job.print_width_m} м`  : '—'}</td>
                  <td className="num">{job.linear_meters   != null ? `${job.linear_meters} м`  : '—'}</td>
                  <td className="num">{job.table_count     != null ? job.table_count             : '—'}</td>
                  <td className="num">{formatDur(job.setup_minutes)}</td>
                  <td className="num">{formatDur(job.print_minutes)}</td>
                  <td className="num">{formatDur(job.post_print_minutes)}</td>
                  <td className="act">
                    <button
                      className="ij-jobs__edit-btn"
                      onClick={() => setEditing(job)}
                      title="Редактировать"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5zM9.5 2.5L11 1l2 2-1.5 1.5"
                          stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditDialog
          job={editing}
          options={options}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </Paper>
  );
};

export default InkjetJobs;
