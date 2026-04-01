import { supabase } from '../../../shared/api/supabaseClient';

export type PrinterModel = '6100' | '7210' | '3070' | '8210';

export type TodaySummaryRow = {
  printerModel: PrinterModel;
  totalFiles: number;
  totalRun: number;
};

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfNextLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
}

export async function getTodaySummary(params: { userId: string }) {
  if (!supabase) throw new Error('Supabase не сконфигурирован. Проверь .env.local');

  const now = new Date();
  const from = startOfLocalDay(now).toISOString();
  const to = startOfNextLocalDay(now).toISOString();

  const { data, error } = await supabase
    .from('print_runs')
    .select('printer_model, files, run, created_at')
    .eq('user_id', params.userId)
    .gte('created_at', from)
    .lt('created_at', to);

  if (error) throw new Error(error.message);

  const models: PrinterModel[] = ['6100', '7210', '3070', '8210'];
  const acc = new Map<PrinterModel, { files: number; run: number }>(
    models.map((m) => [m, { files: 0, run: 0 }]),
  );

  for (const row of data ?? []) {
    const model = row.printer_model as PrinterModel;
    if (!acc.has(model)) continue;
    const curr = acc.get(model)!;
    curr.files += Number(row.files ?? 0);
    curr.run += Number(row.run ?? 0);
  }

  return models.map((m) => ({
    printerModel: m,
    totalFiles: acc.get(m)!.files,
    totalRun: acc.get(m)!.run,
  })) as TodaySummaryRow[];
}

