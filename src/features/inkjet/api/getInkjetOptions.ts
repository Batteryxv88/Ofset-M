import { supabase } from '../../../shared/api/supabaseClient';
import type { InkjetOption, InkjetOptionCategory } from '../model/types';

export async function getInkjetOptions(
  category?: InkjetOptionCategory,
): Promise<InkjetOption[]> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  let query = supabase
    .from('inkjet_options')
    .select('*')
    .order('sort_order', { ascending: true });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as InkjetOption[];
}
