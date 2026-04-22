export { createInkjetJob } from './api/createInkjetJob';
export { getMyInkjetJobs } from './api/getMyInkjetJobs';
export { updateInkjetJob } from './api/updateInkjetJob';
export type { UpdateInkjetJobData } from './api/updateInkjetJob';
export { getInkjetOptions } from './api/getInkjetOptions';
export { addInkjetOption, deleteInkjetOption } from './api/manageInkjetOption';
export type { InkjetJob, InkjetOption, InkjetOptionCategory, PrintType, CreateInkjetJobData } from './model/types';

// Статистика для дашборда печатника
export { getInkjetDayStats } from './api/getInkjetDayStats';
export type { InkjetDayStats } from './api/getInkjetDayStats';
export { getInkjetPeriodDayStats } from './api/getInkjetPeriodDayStats';
export type { InkjetDayStat } from './api/getInkjetPeriodDayStats';
export { calcInkjetDailyBonuses, calcInkjetTodayBonus } from './lib/calcInkjetDailyBonuses';
export type { InkjetDailyBonus, InkjetMyBonusSummary } from './lib/calcInkjetDailyBonuses';
