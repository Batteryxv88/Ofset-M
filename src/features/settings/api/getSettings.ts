import { supabase } from '../../../shared/api/supabaseClient';
import type { Setting } from '../model/types';

export async function getSettings(): Promise<Setting[]> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');
  const { data, error } = await supabase
    .from('settings')
    .select('key, value, label, description')
    .order('key');
  if (error) throw new Error(error.message);
  return data as Setting[];
}
