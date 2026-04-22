export { createInkjetJob } from './api/createInkjetJob';
export { getMyInkjetJobs } from './api/getMyInkjetJobs';
export { updateInkjetJob } from './api/updateInkjetJob';
export type { UpdateInkjetJobData } from './api/updateInkjetJob';
export { getInkjetOptions } from './api/getInkjetOptions';
export { addInkjetOption, deleteInkjetOption } from './api/manageInkjetOption';
export { getInkjetWorkers } from './api/getInkjetWorkers';
export type {
  InkjetJob,
  InkjetOption,
  InkjetOptionCategory,
  InkjetWorker,
  PrintType,
  CreateInkjetJobData,
} from './model/types';

// Статистика для дашборда
export { getInkjetDayStats } from './api/getInkjetDayStats';
export type { InkjetDayStats } from './api/getInkjetDayStats';
export { getInkjetPeriodDayStats } from './api/getInkjetPeriodDayStats';
export type { InkjetDayStat } from './api/getInkjetPeriodDayStats';

// Локальное состояние «кто в смене сегодня»
export { useInkjetShift } from './lib/useInkjetShift';

// Расчёты премии
export {
  calcInkjetDailyBonuses,
  calcInkjetTodayBonus,
  calcInkjetWorkerBonuses,
} from './lib/calcInkjetDailyBonuses';
export type {
  InkjetDailyBonus,
  InkjetWorkerBonus,
} from './lib/calcInkjetDailyBonuses';
