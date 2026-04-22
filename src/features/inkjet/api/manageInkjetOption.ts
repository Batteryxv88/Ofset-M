import { supabase } from '../../../shared/api/supabaseClient';
import type { InkjetOption, InkjetOptionCategory } from '../model/types';

export async function addInkjetOption(
  category: InkjetOptionCategory,
  label: string,
): Promise<InkjetOption> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const trimmed = label.trim();
  if (!trimmed) throw new Error('Пустое значение');

  const { data, error } = await supabase
    .from('inkjet_options')
    .insert({ category, label: trimmed, sort_order: 0 })
    .select()
    .single();

  if (error) {
    // 23505 = postgres unique_violation — дубликат в справочнике
    const pgCode = (error as { code?: string }).code;
    if (pgCode === '23505') {
      throw new Error(`«${trimmed}» уже есть в справочнике`);
    }
    throw new Error(error.message);
  }
  return data as InkjetOption;
}

export async function deleteInkjetOption(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { error } = await supabase.from('inkjet_options').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
