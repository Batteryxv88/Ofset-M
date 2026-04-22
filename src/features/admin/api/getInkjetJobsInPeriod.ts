import { supabase } from '../../../shared/api/supabaseClient';
import type { UserProfile } from './getPrintRunsInPeriod';

/** Минимально необходимые поля inkjet-работы для расчёта премии */
export type RawInkjetJob = {
  id: string;
  user_id: string;
  print_type: 'uv' | 'wide';
  setup_minutes: number | null;
  print_minutes: number | null;
  post_print_minutes: number | null;
  /** Дата, к которой относится работа (день смены). Берём created_at. */
  created_at: string;
};

export type InkjetPeriodData = {
  jobs: RawInkjetJob[];
  profiles: UserProfile[];
};

export async function getInkjetJobsInPeriod(
  from: Date,
  to: Date,
): Promise<InkjetPeriodData> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const [jobsResult, profilesResult] = await Promise.all([
    supabase
      .from('inkjet_jobs')
      .select('id, user_id, print_type, setup_minutes, print_minutes, post_print_minutes, created_at')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, name, email, role'),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);

  return {
    jobs: (jobsResult.data ?? []) as RawInkjetJob[],
    profiles: (profilesResult.data ?? []) as UserProfile[],
  };
}
