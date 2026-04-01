import { supabase } from '../../../shared/api/supabaseClient';

export type RawPrintRun = {
  id: string;
  user_id: string;
  printer_model: string;
  files: number;
  run: number;
  created_at: string;
};

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

export type PeriodData = {
  runs: RawPrintRun[];
  profiles: UserProfile[];
};

export async function getPrintRunsInPeriod(from: Date, to: Date): Promise<PeriodData> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const [runsResult, profilesResult] = await Promise.all([
    supabase
      .from('print_runs')
      .select('id, user_id, printer_model, files, run, created_at')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, name, email, role'),
  ]);

  if (runsResult.error) throw new Error(runsResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);

  return {
    runs: (runsResult.data ?? []) as RawPrintRun[],
    profiles: (profilesResult.data ?? []) as UserProfile[],
  };
}
