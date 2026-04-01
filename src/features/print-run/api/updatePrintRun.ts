import { supabase } from '../../../shared/api/supabaseClient';

export type UpdatePrintRunData = {
  files: number;
  run: number;
};

export async function updatePrintRun(id: string, data: UpdatePrintRunData): Promise<void> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const { error } = await supabase
    .from('print_runs')
    .update({ files: data.files, run: data.run })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
