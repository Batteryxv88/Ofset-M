import { supabase } from '../../../shared/api/supabaseClient';
import type { CreateInkjetJobData, InkjetJob } from '../model/types';

export async function createInkjetJob(
  userId: string,
  data: CreateInkjetJobData,
): Promise<InkjetJob> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { data: row, error } = await supabase
    .from('inkjet_jobs')
    .insert({ ...data, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return row as InkjetJob;
}
