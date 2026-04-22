import { SettingsPanel } from '../../settings-panel';
import type { SettingKey } from '../../../features/settings';

const INKJET_ORDER: SettingKey[] = [
  'inkjet_min_total_minutes',
  'inkjet_norm_hours_per_worker',
  'inkjet_rate_per_hour',
];

const InkjetSettingsPanel = () => (
  <SettingsPanel
    keys={INKJET_ORDER}
    title="Настройки системы — струйная печать"
    subtitle="Переменные для расчёта премии печатников струйной печати"
  />
);

export default InkjetSettingsPanel;
