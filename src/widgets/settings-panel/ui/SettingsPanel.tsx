import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Button, CircularProgress, Typography } from '@mui/material';
import type { AppDispatch, RootState } from '../../../app/store';
import { saveSetting } from '../../../features/settings';
import type { SettingKey } from '../../../features/settings';
import './SettingsPanel.scss';

const SETTING_ORDER: SettingKey[] = [
  'calculation_day',
  'min_run_color',
  'min_run_bw',
  'min_files',
  'price_color',
  'price_bw',
  'price_layout',
];

const SETTING_META: Record<SettingKey, { label: string; description: string; step: number }> = {
  calculation_day: {
    label: 'Дата расчёта (число месяца)',
    description: 'Период: с этого числа пред. месяца по (число − 1) текущего. Напр., 25 → период 25 фев – 24 мар.',
    step: 1,
  },
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
};

const SettingsPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const settings = useSelector((state: RootState) => state.settings.values);

  const [local, setLocal] = useState<Record<string, string>>(() =>
    Object.fromEntries(SETTING_ORDER.map((k) => [k, String(settings[k])])),
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

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
          Настройки системы
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Переменные для расчёта премии
        </Typography>
      </div>

      {error && (
        <Alert severity="error" className="settings-panel__error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="settings-panel__rows">
        {SETTING_ORDER.map((key) => {
          const meta = SETTING_META[key];
          return (
            <div key={key} className="settings-panel__row">
              <div className="settings-panel__row-info">
                <Typography variant="body2" className="settings-panel__row-label">
                  {meta.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {meta.description}
                </Typography>
              </div>
              <div className="settings-panel__row-control">
                <input
                  type="number"
                  className="settings-panel__input"
                  value={local[key]}
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
