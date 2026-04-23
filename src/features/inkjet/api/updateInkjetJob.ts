import { supabase } from '../../../shared/api/supabaseClient';
import type { InkjetJob } from '../model/types';

export type UpdateInkjetJobData = Partial<
  Omit<InkjetJob, 'id' | 'user_id' | 'created_at' | 'completed_at'>
>;

export async function updateInkjetJob(id: string, data: UpdateInkjetJobData): Promise<void> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { error } = await supabase
    .from('inkjet_jobs')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
