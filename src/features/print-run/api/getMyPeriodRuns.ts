import { supabase } from '../../../shared/api/supabaseClient';

export type PeriodRun = {
  id: string;
  user_id: string;
  printer_model: string;
  files: number;
  run: number;
  created_at: string;
};

export async function getMyPeriodRuns(
  userId: string,
  from: Date,
  to: Date,
): Promise<PeriodRun[]> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { data, error } = await supabase
    .from('print_runs')
    .select('id, user_id, printer_model, files, run, created_at')
    .eq('user_id', userId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PeriodRun[];
}
