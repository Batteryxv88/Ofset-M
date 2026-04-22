import { supabase } from '../../../shared/api/supabaseClient';
import type { InkjetWorker } from '../model/types';

/** Возвращает справочник печатников струйной печати (category='worker'). */
export async function getInkjetWorkers(): Promise<InkjetWorker[]> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { data, error } = await supabase
    .from('inkjet_options')
    .select('*')
    .eq('category', 'worker')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as InkjetWorker[];
}
