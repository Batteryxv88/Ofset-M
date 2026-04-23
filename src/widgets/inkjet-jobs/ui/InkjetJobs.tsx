import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Menu, MenuItem, Paper, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import {
  dueFormToIso,
  dueValueToForm,
  formatDueShortRu,
  getInkjetOptions,
  getMyInkjetJobs,
  updateInkjetJob,
} from '../../../features/inkjet';
import type { InkjetJob, InkjetOption } from '../../../features/inkjet';
import { ComboBox } from '../../../shared/ui/combo-box';
import './InkjetJobs.scss';

function formatDur(min: number | null): string {
  if (!min) return '—';
  return `${min} мин`;
}

function toMin(v: string): number | null {
  const n = parseInt(v, 10);
  return v && !isNaN(n) && n > 0 ? n : null;
}

const STATUS_COLORS: Record<string, string> = {
  'В работе': 'var(--ij-status-active)',
  'Выполнен': 'var(--ij-status-done)',
  'На паузе': 'var(--ij-status-pause)',
  'Отменён':  'var(--ij-status-cancel)',
};

// ── Быстрая смена статуса (chip-кнопка с выпадающим меню) ─────
const QuickStatus = ({
  job, statuses, onChanged,
}: {
  job: InkjetJob;
  statuses: InkjetOption[];
  onChanged: () => void;
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const color = job.status
    ? STATUS_COLORS[job.status] ?? 'rgba(255,255,255,0.3)'
    : 'rgba(255,255,255,0.3)';

  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setAnchor(e.currentTarget);
  };
  const closeMenu = () => setAnchor(null);

  const apply = async (label: string) => {
    closeMenu();
    if (label === job.status) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateInkjetJob(job.id, { status: label });
      onChanged();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Не удалось сменить статус');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {saveError && (
        <Tooltip title={saveError} placement="top" arrow>
          <span className="ij-status-err" aria-label={saveError}>⚠</span>
        </Tooltip>
      )}
      <button
        type="button"
        className="ij-status ij-status--button"
        style={{ '--status-color': color } as React.CSSProperties}
        onClick={openMenu}
        disabled={saving}
        title="Сменить статус"
      >
        {saving ? (
          <CircularProgress size={10} color="inherit" />
        ) : (
          <>
            <span>{job.status ?? 'Без статуса'}</span>
            <span className="ij-status__caret" aria-hidden>▾</span>
          </>
        )}
      </button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        PaperProps={{ className: 'ij-status-menu' }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top',    horizontal: 'left' }}
      >
        {statuses.length === 0 && (
          <MenuItem disabled>Нет статусов в справочнике</MenuItem>
        )}
        {statuses.map((s) => {
          const active = s.label === job.status;
          return (
            <MenuItem
              key={s.id}
              selected={active}
              onClick={() => apply(s.label)}
              className="ij-status-menu__item"
            >
              <span
                className="ij-status-menu__dot"
                style={{ background: STATUS_COLORS[s.label] ?? 'rgba(255,255,255,0.3)' }}
              />
              {s.label}
              {active && <span className="ij-status-menu__tick">✓</span>}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

// ── Иконка с тултипом (постпечать + примечание) ─────────────
const NotesIcon = ({ job }: { job: InkjetJob }) => {
  const hasPost  = Boolean(job.post_print && job.post_print.trim());
  const hasNotes = Boolean(job.notes && job.notes.trim());
  if (!hasPost && !hasNotes) return null;

  const tooltip = (
    <div className="ij-notes-tip">
      {hasPost && (
        <div className="ij-notes-tip__block">
          <div className="ij-notes-tip__label">Постпечать</div>
          <div className="ij-notes-tip__text">{job.post_print}</div>
        </div>
      )}
      {hasNotes && (
        <div className="ij-notes-tip__block">
          <div className="ij-notes-tip__label">Примечание</div>
          <div className="ij-notes-tip__text">{job.notes}</div>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip
      title={tooltip}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={4000}
      placement="top"
      PopperProps={{ className: 'ij-notes-tip-popper' }}
    >
      <button
        type="button"
        className="ij-notes-btn"
        aria-label="Показать постпечать и примечание"
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 3h10v6H7l-2.5 2.5V9H2V3z"
            stroke="currentColor" strokeWidth="1.3"
            strokeLinejoin="round" fill="currentColor" fillOpacity="0.08"
          />
        </svg>
      </button>
    </Tooltip>
  );
};

// ── Edit Dialog ────────────────────────────────────────────────
type EditState = {
  manager: string; product_type: string; quantity: string;
  due_date: string;
  due_time: string;
  post_print: string;
  setup_min: string;
  print_width_m: string; linear_meters: string; table_count: string;
  print_min: string;
  post_print_min: string;
  notes: string; status: string;
};

function jobToEdit(job: InkjetJob): EditState {
  const due = dueValueToForm(job.due_date);
  return {
    manager:       job.manager       ?? '',
    product_type:  job.product_type  ?? '',
    quantity:      job.quantity      != null ? String(job.quantity)      : '',
    due_date:      due.date,
    due_time:      due.time,
    post_print:    job.post_print    ?? '',
    setup_min:     job.setup_minutes != null ? String(job.setup_minutes) : '',
    print_width_m: job.print_width_m != null ? String(job.print_width_m)  : '',
    linear_meters: job.linear_meters != null ? String(job.linear_meters)  : '',
    table_count:   job.table_count   != null ? String(job.table_count)    : '',
    print_min:     job.print_minutes != null ? String(job.print_minutes) : '',
    post_print_min: job.post_print_minutes != null ? String(job.post_print_minutes) : '',
    notes:  job.notes  ?? '',
    status: job.status ?? '',
  };
}

const EditDialog = ({
  job, options, onClose, onSaved,
}: {
  job: InkjetJob; options: InkjetOption[];
  onClose: () => void; onSaved: () => void;
}) => {
  const [form, setForm] = useState<EditState>(() => jobToEdit(job));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 600px)');

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
        due_date:      form.due_date ? dueFormToIso(form.due_date, form.due_time) : null,
        post_print:    form.post_print   || null,
        setup_minutes: toMin(form.setup_min),
        print_width_m: form.print_width_m ? parseFloat(form.print_width_m) : null,
        linear_meters: form.linear_meters ? parseFloat(form.linear_meters) : null,
        table_count:   form.table_count   ? parseInt(form.table_count, 10) : null,
        print_minutes:      toMin(form.print_min),
        post_print_minutes: toMin(form.post_print_min),
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
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ className: 'ij-dialog' }}
    >
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
            <ComboBox
              options={opt('manager').map((o) => o.label)}
              value={form.manager}
              onChange={(v) => set('manager', v)}
              placeholder="— не выбрано —"
              inputClassName="ij-edit__input"
            />
          </div>
          <div className="ij-edit__field">
            <label className="ij-edit__label">Тип изделия</label>
            <ComboBox
              options={opt('product_type').map((o) => o.label)}
              value={form.product_type}
              onChange={(v) => set('product_type', v)}
              placeholder="— не выбрано —"
              inputClassName="ij-edit__input"
            />
          </div>
        </div>

        <div className="ij-edit__row ij-edit__row--3">
          <div className="ij-edit__field">
            <label className="ij-edit__label">Тираж</label>
            <input type="number" min={1} className="ij-edit__input"
              value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          </div>
          <div className="ij-edit__field">
            <label className="ij-edit__label">Срок сдачи</label>
            <div className="ij-edit__due-inputs">
              <input
                type="date"
                className="ij-edit__input ij-edit__input--date ij-edit__input--due-date"
                value={form.due_date}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((p) => ({ ...p, due_date: v, due_time: v ? p.due_time : '' }));
                }}
              />
              <input
                type="time"
                className="ij-edit__input ij-edit__input--date ij-edit__input--time ij-edit__input--due-time"
                value={form.due_time}
                onChange={(e) => set('due_time', e.target.value)}
                disabled={!form.due_date}
                title="Время — по желанию"
                aria-label="Время сдачи, необязательно"
              />
            </div>
          </div>
          <div className="ij-edit__field">
            <label className="ij-edit__label">Статус</label>
            <ComboBox
              options={opt('status').map((o) => o.label)}
              value={form.status}
              onChange={(v) => set('status', v)}
              placeholder="— не выбрано —"
              inputClassName="ij-edit__input"
            />
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
          <div className="ij-edit__field">
            <label className="ij-edit__label">Приладка, мин</label>
            <input type="number" min={0} className="ij-edit__input"
              value={form.setup_min} onChange={(e) => set('setup_min', e.target.value)} />
          </div>
          <div className="ij-edit__field">
            <label className="ij-edit__label">Время печати, мин</label>
            <input type="number" min={0} className="ij-edit__input"
              value={form.print_min} onChange={(e) => set('print_min', e.target.value)} />
          </div>
          <div className="ij-edit__field">
            <label className="ij-edit__label">Вр. постпечати, мин</label>
            <input type="number" min={0} className="ij-edit__input"
              value={form.post_print_min} onChange={(e) => set('post_print_min', e.target.value)} />
          </div>
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

  const statuses = options.filter((o) => o.category === 'status');

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
            Статус меняется по клику · ✎ — полное редактирование
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
        <>
          {/* ── Desktop: обычная таблица ─────────────────────────── */}
          <div className="ij-jobs__wrap ij-jobs__wrap--desktop">
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
                      <div className="ij-jobs__status-cell">
                        <QuickStatus job={job} statuses={statuses} onChanged={load} />
                        <NotesIcon job={job} />
                      </div>
                    </td>
                    <td>
                      {job.due_date ? formatDueShortRu(job.due_date) : '—'}
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

          {/* ── Mobile: карточки ──────────────────────────────── */}
          <div className="ij-jobs__cards">
            {jobs.map((job) => (
              <div key={job.id} className="ij-card">
                <div className="ij-card__head">
                  <div className="ij-card__head-left">
                    <span className="ij-card__order">#{job.order_number ?? '—'}</span>
                    <span className={`ij-badge ij-badge--${job.print_type}`}>
                      {job.print_type === 'wide' ? 'Ширка' : 'УФ'}
                    </span>
                  </div>
                  <button
                    className="ij-card__edit"
                    onClick={() => setEditing(job)}
                    aria-label="Редактировать"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5zM9.5 2.5L11 1l2 2-1.5 1.5"
                        stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Изменить</span>
                  </button>
                </div>

                {/* Статус + иконка комментариев + дата сдачи */}
                <div className="ij-card__status-row">
                  <div className="ij-card__status-group">
                    <QuickStatus job={job} statuses={statuses} onChanged={load} />
                    <NotesIcon job={job} />
                  </div>
                  {job.due_date && (
                    <span className="ij-card__due">
                      до {formatDueShortRu(job.due_date)}
                    </span>
                  )}
                </div>

                {/* Базовые поля: изделие, тираж, менеджер */}
                <div className="ij-card__grid">
                  <div className="ij-card__cell">
                    <span className="ij-card__label">Изделие</span>
                    <span className="ij-card__value">{job.product_type ?? '—'}</span>
                  </div>
                  <div className="ij-card__cell">
                    <span className="ij-card__label">Тираж</span>
                    <span className="ij-card__value">{job.quantity ?? '—'}</span>
                  </div>
                  <div className="ij-card__cell ij-card__cell--full">
                    <span className="ij-card__label">Менеджер</span>
                    <span className="ij-card__value">{job.manager ?? '—'}</span>
                  </div>
                </div>

                {/* Специфичные поля для типа */}
                {job.print_type === 'wide' ? (
                  <div className="ij-card__grid">
                    <div className="ij-card__cell">
                      <span className="ij-card__label">Ширина</span>
                      <span className="ij-card__value">
                        {job.print_width_m != null ? `${job.print_width_m} м` : '—'}
                      </span>
                    </div>
                    <div className="ij-card__cell">
                      <span className="ij-card__label">Погонные</span>
                      <span className="ij-card__value">
                        {job.linear_meters != null ? `${job.linear_meters} м` : '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="ij-card__grid">
                    <div className="ij-card__cell">
                      <span className="ij-card__label">Столов</span>
                      <span className="ij-card__value">{job.table_count ?? '—'}</span>
                    </div>
                  </div>
                )}

                {/* Времена */}
                <div className="ij-card__grid ij-card__grid--times">
                  <div className="ij-card__cell">
                    <span className="ij-card__label">Приладка</span>
                    <span className="ij-card__value">{formatDur(job.setup_minutes)}</span>
                  </div>
                  <div className="ij-card__cell">
                    <span className="ij-card__label">Печать</span>
                    <span className="ij-card__value">{formatDur(job.print_minutes)}</span>
                  </div>
                  <div className="ij-card__cell">
                    <span className="ij-card__label">Постпечать</span>
                    <span className="ij-card__value">{formatDur(job.post_print_minutes)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
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
