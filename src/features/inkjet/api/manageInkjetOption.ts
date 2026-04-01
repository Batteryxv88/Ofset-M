import { supabase } from '../../../shared/api/supabaseClient';
import type { InkjetOption, InkjetOptionCategory } from '../model/types';

export async function addInkjetOption(
  category: InkjetOptionCategory,
  label: string,
): Promise<InkjetOption> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { data, error } = await supabase
    .from('inkjet_options')
    .insert({ category, label, sort_order: 0 })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as InkjetOption;
}

export async function deleteInkjetOption(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { error } = await supabase.from('inkjet_options').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
