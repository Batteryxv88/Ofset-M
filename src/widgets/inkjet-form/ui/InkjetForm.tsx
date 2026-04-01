import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, CircularProgress, Divider, Paper, Typography } from '@mui/material';
import type { RootState } from '../../../app/store';
import { createInkjetJob, getInkjetOptions } from '../../../features/inkjet';
import type { InkjetOption, PrintType } from '../../../features/inkjet';
import './InkjetForm.scss';

type DurUnit = 'min' | 'hour' | 'day';
const DUR_UNITS: { value: DurUnit; label: string; factor: number }[] = [
  { value: 'min',  label: 'мин', factor: 1 },
  { value: 'hour', label: 'ч',   factor: 60 },
  { value: 'day',  label: 'дн',  factor: 480 },
];

function durToMinutes(val: string, unit: DurUnit): number | null {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n <= 0) return null;
  const f = DUR_UNITS.find((u) => u.value === unit)!.factor;
  return Math.round(n * f);
}

const blank = (v: string) => v.trim() === '';

type FormState = {
  print_type: PrintType;
  order_number: string;
  manager: string;
  product_type: string;
  quantity: string;
  due_date: string;
  post_print: string;
  setup_val: string; setup_unit: DurUnit;
  print_width_m: string;
  linear_meters: string;
  table_count: string;
  print_val: string; print_unit: DurUnit;
  post_print_val: string; post_print_unit: DurUnit;
  notes: string;
  status: string;
};

const INITIAL: FormState = {
  print_type: 'wide',
  order_number: '', manager: '', product_type: '', quantity: '',
  due_date: '', post_print: '',
  setup_val: '', setup_unit: 'min',
  print_width_m: '', linear_meters: '', table_count: '',
  print_val: '', print_unit: 'hour',
  post_print_val: '', post_print_unit: 'min',
  notes: '', status: '',
};

// Компонент для ввода длительности
const DurInput = ({
  value, unit, onValue, onUnit, label,
}: {
  value: string; unit: DurUnit;
  onValue: (v: string) => void;
  onUnit: (u: DurUnit) => void;
  label: string;
}) => (
  <div className="ij-form__field">
    <label className="ij-form__label">{label}</label>
    <div className="ij-form__dur-wrap">
      <input
        type="number"
        min={0}
        className="ij-form__input ij-form__input--dur"
        placeholder="0"
        value={value}
        onChange={(e) => onValue(e.target.value)}
      />
      <select
        className="ij-form__select ij-form__select--unit"
        value={unit}
        onChange={(e) => onUnit(e.target.value as DurUnit)}
      >
        {DUR_UNITS.map((u) => (
          <option key={u.value} value={u.value}>{u.label}</option>
        ))}
      </select>
    </div>
  </div>
);

type Props = { onSaved?: () => void };

const InkjetForm = ({ onSaved }: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [options, setOptions] = useState<InkjetOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getInkjetOptions().then(setOptions).catch(() => {});
  }, []);

  const opt = (cat: InkjetOption['category']) =>
    options.filter((o) => o.category === cat);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (blank(form.order_number)) { setError('Укажите номер заказа'); return; }
    setError(null);
    setSaving(true);
    try {
      await createInkjetJob(user.id, {
        print_type: form.print_type,
        order_number: parseInt(form.order_number, 10) || null,
        manager:       blank(form.manager)       ? null : form.manager,
        product_type:  blank(form.product_type)  ? null : form.product_type,
        quantity:      blank(form.quantity)      ? null : parseInt(form.quantity, 10),
        due_date:      blank(form.due_date)      ? null : form.due_date,
        post_print:    blank(form.post_print)    ? null : form.post_print,
        setup_minutes: durToMinutes(form.setup_val, form.setup_unit),
        // wide-format
        print_width_m: form.print_type === 'wide' && !blank(form.print_width_m)
          ? parseFloat(form.print_width_m) : null,
        linear_meters: form.print_type === 'wide' && !blank(form.linear_meters)
          ? parseFloat(form.linear_meters) : null,
        // uv
        table_count:   form.print_type === 'uv' && !blank(form.table_count)
          ? parseInt(form.table_count, 10) : null,
        print_minutes:       durToMinutes(form.print_val,       form.print_unit),
        post_print_minutes:  durToMinutes(form.post_print_val,  form.post_print_unit),
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
          <select
            className="ij-form__select"
            value={form.manager}
            onChange={(e) => set('manager', e.target.value)}
          >
            <option value="">— не выбрано —</option>
            {opt('manager').map((o) => (
              <option key={o.id} value={o.label}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="ij-form__field">
          <label className="ij-form__label">Тип изделия</label>
          <select
            className="ij-form__select"
            value={form.product_type}
            onChange={(e) => set('product_type', e.target.value)}
          >
            <option value="">— не выбрано —</option>
            {opt('product_type').map((o) => (
              <option key={o.id} value={o.label}>{o.label}</option>
            ))}
          </select>
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
          <select
            className="ij-form__select"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="">— не выбрано —</option>
            {opt('status').map((o) => (
              <option key={o.id} value={o.label}>{o.label}</option>
            ))}
          </select>
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

      {/* ── Строка 4: Приладка · Время печати · Время постпечати */}
      <div className="ij-form__row ij-form__row--3">
        <DurInput
          label="Приладка"
          value={form.setup_val} unit={form.setup_unit}
          onValue={(v) => set('setup_val', v)}
          onUnit={(u) => set('setup_unit', u)}
        />
        <DurInput
          label="Время печати"
          value={form.print_val} unit={form.print_unit}
          onValue={(v) => set('print_val', v)}
          onUnit={(u) => set('print_unit', u)}
        />
        <DurInput
          label="Время постпечати"
          value={form.post_print_val} unit={form.post_print_unit}
          onValue={(v) => set('post_print_val', v)}
          onUnit={(u) => set('post_print_unit', u)}
        />
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
