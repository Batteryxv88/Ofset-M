import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, CircularProgress, Divider, Paper, Typography } from '@mui/material';
import type { RootState } from '../../../app/store';
import {
  createInkjetJob,
  getInkjetOptions,
  getInkjetWorkers,
  useInkjetShift,
} from '../../../features/inkjet';
import type { InkjetOption, InkjetWorker, PrintType } from '../../../features/inkjet';
import { ComboBox } from '../../../shared/ui/combo-box';
import './InkjetForm.scss';

const blank = (v: string) => v.trim() === '';
const toMin = (v: string): number | null => {
  const n = parseInt(v, 10);
  return v && !isNaN(n) && n > 0 ? n : null;
};

type FormState = {
  print_type: PrintType;
  order_number: string;
  manager: string;
  product_type: string;
  quantity: string;
  due_date: string;
  post_print: string;
  setup_min: string;
  print_width_m: string;
  linear_meters: string;
  table_count: string;
  print_min: string;
  post_print_min: string;
  notes: string;
  status: string;
};

const INITIAL: FormState = {
  print_type: 'wide',
  order_number: '', manager: '', product_type: '', quantity: '',
  due_date: '', post_print: '',
  setup_min: '',
  print_width_m: '', linear_meters: '', table_count: '',
  print_min: '',
  post_print_min: '',
  notes: '', status: '',
};

type Props = { onSaved?: () => void };

const InkjetForm = ({ onSaved }: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [options, setOptions] = useState<InkjetOption[]>([]);
  const [workers, setWorkers] = useState<InkjetWorker[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { workerIds: shiftIds, toggle: toggleShiftWorker, clear: clearShift } =
    useInkjetShift();

  useEffect(() => {
    getInkjetOptions().then(setOptions).catch(() => {});
    getInkjetWorkers().then(setWorkers).catch(() => {});
  }, []);

  const selectedWorkers = useMemo(
    () => workers.filter((w) => shiftIds.includes(w.id)),
    [workers, shiftIds],
  );

  const opt = (cat: InkjetOption['category']) =>
    options.filter((o) => o.category === cat);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (blank(form.order_number)) { setError('Укажите номер заказа'); return; }
    if (shiftIds.length === 0) {
      setError('Отметьте, кто сегодня в смене');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createInkjetJob(user.id, {
        print_type:    form.print_type,
        worker_ids:    shiftIds,
        order_number:  parseInt(form.order_number, 10) || null,
        manager:       blank(form.manager)      ? null : form.manager,
        product_type:  blank(form.product_type) ? null : form.product_type,
        quantity:      blank(form.quantity)     ? null : parseInt(form.quantity, 10),
        due_date:      blank(form.due_date)     ? null : form.due_date,
        post_print:    blank(form.post_print)   ? null : form.post_print,
        setup_minutes: toMin(form.setup_min),
        print_width_m: form.print_type === 'wide' && !blank(form.print_width_m)
          ? parseFloat(form.print_width_m) : null,
        linear_meters: form.print_type === 'wide' && !blank(form.linear_meters)
          ? parseFloat(form.linear_meters) : null,
        table_count:   form.print_type === 'uv' && !blank(form.table_count)
          ? parseInt(form.table_count, 10) : null,
        print_minutes:      toMin(form.print_min),
        post_print_minutes: toMin(form.post_print_min),
        notes:  blank(form.notes)  ? null : form.notes,
        status: blank(form.status) ? 'В работе' : form.status,
      });
      setForm((prev) => ({ ...INITIAL, print_type: prev.print_type }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const isWide = form.print_type === 'wide';

  return (
    <Paper className="ij-form" elevation={0}>
      {/* Заголовок + переключатель типа */}
      <div className="ij-form__header">
        <div>
          <Typography variant="subtitle2" className="ij-form__title">
            Новое задание
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Заполните параметры и нажмите «Записать»
          </Typography>
        </div>
        <div className="ij-form__tabs">
          <button
            type="button"
            className={`ij-form__tab ${!isWide ? 'ij-form__tab--active' : ''}`}
            onClick={() => set('print_type', 'uv')}
          >
            УФ печать
          </button>
          <button
            type="button"
            className={`ij-form__tab ${isWide ? 'ij-form__tab--active' : ''}`}
            onClick={() => set('print_type', 'wide')}
          >
            Широкий формат
          </button>
        </div>
      </div>

      <Divider className="ij-form__divider" />

      {/* ── Блок «Кто сегодня в смене» ──────────────────── */}
      <div className="ij-form__shift">
        <div className="ij-form__shift-head">
          <div>
            <Typography variant="caption" className="ij-form__shift-title">
              Кто сегодня в смене
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Отметьте всех, кто работает сегодня — бонус разделится на этот состав
            </Typography>
          </div>
          {selectedWorkers.length > 0 && (
            <button
              type="button"
              className="ij-form__shift-clear"
              onClick={clearShift}
              title="Сбросить состав смены"
            >
              Сбросить
            </button>
          )}
        </div>

        {workers.length === 0 ? (
          <Typography variant="caption" color="text.secondary" className="ij-form__shift-empty">
            Список печатников пуст. Попросите администратора добавить сотрудников на странице «Админ → Струйная → Списки».
          </Typography>
        ) : (
          <div className="ij-form__shift-chips">
            {workers.map((w) => {
              const on = shiftIds.includes(w.id);
              return (
                <button
                  type="button"
                  key={w.id}
                  className={`ij-form__shift-chip ${on ? 'ij-form__shift-chip--on' : ''}`}
                  onClick={() => toggleShiftWorker(w.id)}
                  aria-pressed={on}
                >
                  <span className="ij-form__shift-chip-dot" aria-hidden>
                    {on ? '✓' : '+'}
                  </span>
                  {w.label}
                </button>
              );
            })}
          </div>
        )}

        <Typography variant="caption" color="text.secondary" className="ij-form__shift-count">
          В смене: <b>{selectedWorkers.length}</b>
          {selectedWorkers.length > 0 && ` · ${selectedWorkers.map((w) => w.label).join(', ')}`}
        </Typography>
      </div>

      <Divider className="ij-form__divider" />

      {/* ── Строка 1: Заказ · Менеджер · Тип изделия ─────── */}
      <div className="ij-form__row ij-form__row--3">
        <div className="ij-form__field">
          <label className="ij-form__label">Номер заказа *</label>
          <input
            type="number" min={1}
            className="ij-form__input"
            placeholder="12345"
            value={form.order_number}
            onChange={(e) => set('order_number', e.target.value)}
          />
        </div>
        <div className="ij-form__field">
          <label className="ij-form__label">Менеджер</label>
          <ComboBox
            options={opt('manager').map((o) => o.label)}
            value={form.manager}
            onChange={(v) => set('manager', v)}
            placeholder="— не выбрано —"
            inputClassName="ij-form__input"
          />
        </div>
        <div className="ij-form__field">
          <label className="ij-form__label">Тип изделия</label>
          <ComboBox
            options={opt('product_type').map((o) => o.label)}
            value={form.product_type}
            onChange={(v) => set('product_type', v)}
            placeholder="— не выбрано —"
            inputClassName="ij-form__input"
          />
        </div>
      </div>

      {/* ── Строка 2: Тираж · Дата сдачи · Статус ─────────── */}
      <div className="ij-form__row ij-form__row--3">
        <div className="ij-form__field">
          <label className="ij-form__label">Тираж, шт.</label>
          <input
            type="number" min={1}
            className="ij-form__input"
            placeholder="100"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </div>
        <div className="ij-form__field">
          <label className="ij-form__label">Дата сдачи</label>
          <input
            type="date"
            className="ij-form__input ij-form__input--date"
            value={form.due_date}
            onChange={(e) => set('due_date', e.target.value)}
          />
        </div>
        <div className="ij-form__field">
          <label className="ij-form__label">Статус заказа</label>
          <ComboBox
            options={opt('status').map((o) => o.label)}
            value={form.status}
            onChange={(v) => set('status', v)}
            placeholder="— не выбрано —"
            inputClassName="ij-form__input"
          />
        </div>
      </div>

      {/* ── Строка 3: поля специфичные для типа ─────────────── */}
      {isWide ? (
        <div className="ij-form__row ij-form__row--2">
          <div className="ij-form__field">
            <label className="ij-form__label">Ширина печати, м</label>
            <input
              type="number" min={0} step={0.01}
              className="ij-form__input"
              placeholder="1.60"
              value={form.print_width_m}
              onChange={(e) => set('print_width_m', e.target.value)}
            />
          </div>
          <div className="ij-form__field">
            <label className="ij-form__label">Метры погонные, м</label>
            <input
              type="number" min={0} step={0.01}
              className="ij-form__input"
              placeholder="25.00"
              value={form.linear_meters}
              onChange={(e) => set('linear_meters', e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="ij-form__row ij-form__row--2">
          <div className="ij-form__field">
            <label className="ij-form__label">Количество столов, шт.</label>
            <input
              type="number" min={1}
              className="ij-form__input"
              placeholder="2"
              value={form.table_count}
              onChange={(e) => set('table_count', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Строка 4: Приладка · Время печати · Время постпечати (мин) */}
      <div className="ij-form__row ij-form__row--3">
        <div className="ij-form__field">
          <label className="ij-form__label">Приладка, мин</label>
          <input
            type="number" min={0}
            className="ij-form__input"
            placeholder="0"
            value={form.setup_min}
            onChange={(e) => set('setup_min', e.target.value)}
          />
        </div>
        <div className="ij-form__field">
          <label className="ij-form__label">Время печати, мин</label>
          <input
            type="number" min={0}
            className="ij-form__input"
            placeholder="0"
            value={form.print_min}
            onChange={(e) => set('print_min', e.target.value)}
          />
        </div>
        <div className="ij-form__field">
          <label className="ij-form__label">Время постпечати, мин</label>
          <input
            type="number" min={0}
            className="ij-form__input"
            placeholder="0"
            value={form.post_print_min}
            onChange={(e) => set('post_print_min', e.target.value)}
          />
        </div>
      </div>

      {/* ── Строка 5: Постпечать (текст) ─────────────────────── */}
      <div className="ij-form__row ij-form__row--1">
        <div className="ij-form__field">
          <label className="ij-form__label">Постпечать (описание)</label>
          <input
            type="text"
            className="ij-form__input"
            placeholder="Ламинация, резка, биговка…"
            value={form.post_print}
            onChange={(e) => set('post_print', e.target.value)}
          />
        </div>
      </div>

      {/* ── Строка 6: Примечание ────────────────────────────── */}
      <div className="ij-form__row ij-form__row--1">
        <div className="ij-form__field">
          <label className="ij-form__label">Примечание</label>
          <textarea
            className="ij-form__textarea"
            placeholder="Дополнительные сведения…"
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </div>

      {/* ── Подвал ───────────────────────────────────────────── */}
      <div className="ij-form__footer">
        {error && (
          <Typography variant="caption" color="error">{error}</Typography>
        )}
        {success && (
          <Typography variant="caption" className="ij-form__ok">
            ✓ Записано
          </Typography>
        )}
        <Button
          variant="contained"
          size="small"
          className="ij-form__submit"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? <CircularProgress size={16} color="inherit" /> : 'Записать'}
        </Button>
      </div>
    </Paper>
  );
};

export default InkjetForm;
