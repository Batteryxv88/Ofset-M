import { supabase } from '../../../shared/api/supabaseClient';
import type { InkjetJob } from '../model/types';

export async function getMyInkjetJobs(userId: string, limit = 50): Promise<InkjetJob[]> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { data, error } = await supabase
    .from('inkjet_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as InkjetJob[];
}
