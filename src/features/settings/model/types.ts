export type SettingKey =
  // Общие
  | 'calculation_day'
  // Лазерная печать
  | 'min_run_color'
  | 'min_run_bw'
  | 'min_files'
  | 'price_color'
  | 'price_bw'
  | 'price_layout'
  // Струйная печать
  | 'inkjet_min_total_minutes'
  | 'inkjet_norm_hours_per_worker'
  | 'inkjet_rate_per_hour';

export type Setting = {
  key: SettingKey;
  value: number;
  label: string;
  description: string | null;
};

/** Плоский объект со значениями всех настроек */
export type AppSettings = Record<SettingKey, number>;

export const DEFAULT_SETTINGS: AppSettings = {
  calculation_day: 25,
  min_run_color: 4500,
  min_run_bw: 4500,
  min_files: 30,
  price_color: 0.2,
  price_bw: 0.12,
  price_layout: 12,
  inkjet_min_total_minutes: 750,
  inkjet_norm_hours_per_worker: 6,
  inkjet_rate_per_hour: 83,
};
