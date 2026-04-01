import { supabase } from '../../../shared/api/supabaseClient';

export type CreatePrintRunInput = {
  userId: string;
  printerModel: '6100' | '7210' | '3070' | '8210';
  files: number;
  run: number;
};

export async function createPrintRun(input: CreatePrintRunInput) {
  if (!supabase) throw new Error('Supabase не сконфигурирован. Проверь .env.local');

  const { data, error } = await supabase
    .from('print_runs')
    .insert({
      user_id: input.userId,
      printer_model: input.printerModel,
      files: input.files,
      run: input.run,
    })
    .select('id, user_id, printer_model, files, run, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as {
    id: string;
    user_id: string;
    printer_model: string;
    files: number;
    run: number;
    created_at: string;
  };
}

