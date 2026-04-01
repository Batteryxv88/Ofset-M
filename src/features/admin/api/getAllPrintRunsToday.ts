import { supabase } from '../../../shared/api/supabaseClient';

export type PrintRunRow = {
  id: string;
  user_id: string;
  printer_model: string;
  files: number;
  run: number;
  created_at: string;
};

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

export type UserSummary = {
  user: UserProfile;
  colorRun: number;
  bwRun: number;
  totalFiles: number;
};

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfNextLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
}

const BW_PRINTERS = ['8210'];

export async function getAllPrintRunsToday(): Promise<UserSummary[]> {
  if (!supabase) throw new Error('Supabase не сконфигурирован');

  const now = new Date();
  const from = startOfLocalDay(now).toISOString();
  const to = startOfNextLocalDay(now).toISOString();

  const [runsResult, profilesResult] = await Promise.all([
    supabase
      .from('print_runs')
      .select('id, user_id, printer_model, files, run, created_at')
      .gte('created_at', from)
      .lt('created_at', to),
    supabase
      .from('profiles')
      .select('id, name, email, role'),
  ]);

  if (runsResult.error) throw new Error(runsResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);

  const runs = (runsResult.data ?? []) as PrintRunRow[];
  const profiles = (profilesResult.data ?? []) as UserProfile[];

  const profileMap = new Map<string, UserProfile>(profiles.map((p) => [p.id, p]));

  const summaryMap = new Map<string, UserSummary>();

  for (const run of runs) {
    if (!summaryMap.has(run.user_id)) {
      summaryMap.set(run.user_id, {
        user: profileMap.get(run.user_id) ?? { id: run.user_id, name: null, email: null, role: null },
        colorRun: 0,
        bwRun: 0,
        totalFiles: 0,
      });
    }
    const s = summaryMap.get(run.user_id)!;
    if (BW_PRINTERS.includes(run.printer_model)) {
      s.bwRun += Number(run.run ?? 0);
    } else {
      s.colorRun += Number(run.run ?? 0);
    }
    s.totalFiles += Number(run.files ?? 0);
  }

  return Array.from(summaryMap.values());
}
