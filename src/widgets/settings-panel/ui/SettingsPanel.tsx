import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Button, CircularProgress, Tooltip, Typography } from '@mui/material';
import type { AppDispatch, RootState } from '../../../app/store';
import { saveSetting } from '../../../features/settings';
import type { SettingKey } from '../../../features/settings';
import './SettingsPanel.scss';

export type SettingMeta = {
  label: string;
  description: string;
  step: number;
};

/** Мета-описания всех системных переменных */
export const SETTING_META: Record<SettingKey, SettingMeta> = {
  calculation_day: {
    label: 'Дата расчёта (число месяца)',
    description: 'Период: с этого числа пред. месяца по (число − 1) текущего. Напр., 25 → период 25 фев – 24 мар.',
    step: 1,
  },
  // Лазерная
  min_run_color: {
    label: 'Мин. тираж — цвет',
    description: 'Мин. листов за день. В зачёт идёт только сверх этого значения.',
    step: 100,
  },
  min_run_bw: {
    label: 'Мин. тираж — Ч/Б',
    description: 'Мин. листов за день. В зачёт идёт только сверх этого значения.',
    step: 100,
  },
  min_files: {
    label: 'Мин. макетов в день',
    description: 'Мин. файлов/макетов за день. В зачёт идёт только сверх этого значения.',
    step: 1,
  },
  price_color: {
    label: 'Цена листа — цвет',
    description: 'Стоимость одного листа на цветном принтере (руб.)',
    step: 0.01,
  },
  price_bw: {
    label: 'Цена листа — Ч/Б',
    description: 'Стоимость одного листа на ч/б принтере (руб.)',
    step: 0.01,
  },
  price_layout: {
    label: 'Цена макета (файла)',
    description: 'Стоимость обработки одного файла/макета (руб.)',
    step: 1,
  },
  // Струйная
  inkjet_min_total_minutes: {
    label: 'Мин. общее время за смену (мин)',
    description: 'Порог суммарного времени (печать + постпечать + приладка) всех печатников за день. Если меньше — премия за этот день не начисляется.',
    step: 10,
  },
  inkjet_norm_hours_per_worker: {
    label: 'Норма часов на работника',
    description: 'Норма часов на одного печатника в смену. Премия считается от часов сверх нормы.',
    step: 0.5,
  },
  inkjet_rate_per_hour: {
    label: 'Ставка премии за час (₽)',
    description: 'Стоимость одного часа сверх нормы. Начисляется каждому печатнику смены в полном объёме.',
    step: 1,
  },
};

const DEFAULT_LASER_ORDER: SettingKey[] = [
  'calculation_day',
  'min_run_color',
  'min_run_bw',
  'min_files',
  'price_color',
  'price_bw',
  'price_layout',
];

type Props = {
  /** Какие ключи настроек показывать (порядок сохраняется). По умолчанию — лазерная печать. */
  keys?: SettingKey[];
  /** Заголовок панели */
  title?: string;
  /** Подзаголовок (caption) */
  subtitle?: string;
};

const SettingsPanel = ({
  keys = DEFAULT_LASER_ORDER,
  title = 'Настройки системы',
  subtitle = 'Переменные для расчёта премии',
}: Props) => {
  const dispatch = useDispatch<AppDispatch>();
  const settings = useSelector((state: RootState) => state.settings.values);

  const [local, setLocal] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, String(settings[k])])),
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Синхронизируем локальные значения при смене набора ключей
  // (например, при переключении подвкладки) или при внешнем обновлении настроек.
  useEffect(() => {
    setLocal(Object.fromEntries(keys.map((k) => [k, String(settings[k])])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(','), settings]);

  const handleChange = (key: SettingKey, val: string) => {
    setLocal((prev) => ({ ...prev, [key]: val }));
    setSaved((prev) => ({ ...prev, [key]: false }));
  };

  const handleSave = async (key: SettingKey) => {
    const num = parseFloat(local[key]);
    if (isNaN(num) || num < 0) {
      setError(`Некорректное значение для «${SETTING_META[key].label}»`);
      return;
    }
    setError(null);
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await dispatch(saveSetting({ key, value: num })).unwrap();
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel__header">
        <Typography variant="h6" className="settings-panel__title">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </div>

      {error && (
        <Alert severity="error" className="settings-panel__error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="settings-panel__rows">
        {keys.map((key) => {
          const meta = SETTING_META[key];
          return (
            <div key={key} className="settings-panel__row">
              <div className="settings-panel__row-info">
                <div className="settings-panel__row-label-wrap">
                  <Typography variant="body2" className="settings-panel__row-label">
                    {meta.label}
                  </Typography>
                  <Tooltip title={meta.description} placement="top" arrow>
                    <span className="settings-panel__hint" aria-label="Подсказка">?</span>
                  </Tooltip>
                </div>
              </div>
              <div className="settings-panel__row-control">
                <input
                  type="number"
                  className="settings-panel__input"
                  value={local[key] ?? ''}
                  step={meta.step}
                  min={0}
                  onChange={(e) => handleChange(key, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave(key)}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleSave(key)}
                  disabled={saving[key]}
                  className={`settings-panel__save-btn ${saved[key] ? 'settings-panel__save-btn--saved' : ''}`}
                >
                  {saving[key] ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : saved[key] ? (
                    '✓'
                  ) : (
                    'Сохранить'
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsPanel;
