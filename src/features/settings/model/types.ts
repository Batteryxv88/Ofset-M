export type SettingKey =
  | 'min_run_color'
  | 'min_run_bw'
  | 'min_files'
  | 'price_color'
  | 'price_bw'
  | 'price_layout'
  | 'calculation_day';

export type Setting = {
  key: SettingKey;
  value: number;
  label: string;
  description: string | null;
};

/** Плоский объект со значениями всех настроек */
export type AppSettings = Record<SettingKey, number>;

export const DEFAULT_SETTINGS: AppSettings = {
  min_run_color: 4500,
  min_run_bw: 4500,
  min_files: 30,
  price_color: 0.2,
  price_bw: 0.12,
  price_layout: 12,
  calculation_day: 25,
};
