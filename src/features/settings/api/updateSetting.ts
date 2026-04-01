import { supabase } from '../../../shared/api/supabaseClient';

export async function updateSetting(key: string, value: number): Promise<void> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');
  const { error } = await supabase
    .from('settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) throw new Error(error.message);
}
