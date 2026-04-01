import { useSelector } from 'react-redux';
import { Alert, Button, Divider, LinearProgress, Paper, Typography } from '@mui/material';
import type { RootState } from '../../../app/store';
import { RingProgress } from '../../../shared/ui';
import { formatNum } from '../../../shared/lib';
import { BW_PRINTERS, COLOR_PRINTERS } from '../../../entities/printer';
import './DailyPlan.scss';

type SummaryRow = {
  printerModel: string;
  totalFiles: number;
  totalRun: number;
};

type Props = {
  summary: SummaryRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

const DailyPlan = ({ summary, loading, error, onRefresh }: Props) => {
  const { min_run_color, min_run_bw, min_files } = useSelector(
    (state: RootState) => state.settings.values,
  );

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const colorDone = summary
    .filter((r) => COLOR_PRINTERS.includes(r.printerModel))
    .reduce((acc, r) => acc + Number(r.totalRun ?? 0), 0);

  const bwDone = summary
    .filter((r) => BW_PRINTERS.includes(r.printerModel))
    .reduce((acc, r) => acc + Number(r.totalRun ?? 0), 0);

  const filesToday = summary.reduce((acc, r) => acc + Number(r.totalFiles ?? 0), 0);

  const color = {
    done: colorDone,
    left: Math.max(0, min_run_color - colorDone),
    progress: clamp(colorDone / min_run_color),
  };

  const bw = {
    done: bwDone,
    left: Math.max(0, min_run_bw - bwDone),
    progress: clamp(bwDone / min_run_bw),
  };

  const files = {
    done: filesToday,
    left: Math.max(0, min_files - filesToday),
    progress: clamp(filesToday / min_files),
  };

  return (
    <Paper elevation={0} className="daily-plan">
      <div className="daily-plan__head">
        <div>
          <Typography variant="subtitle1">Дневной план</Typography>
          <Typography variant="caption" color="text.secondary">
            Мин.: {formatNum(min_run_color)} / {formatNum(min_run_bw)} л. · {formatNum(min_files)} макетов
          </Typography>
        </div>
        <Button variant="text" color="primary" onClick={onRefresh} disabled={loading}>
          Обновить
        </Button>
      </div>

      {loading && <LinearProgress className="daily-plan__progress" />}

      <Divider className="daily-plan__divider" />

      {error && (
        <Alert severity="error" className="daily-plan__error">
          {error}
        </Alert>
      )}

      <div className="daily-plan__grid">
        <div className="daily-plan__item">
          <Typography variant="overline" color="text.secondary">
            Цветная
          </Typography>
          <Typography variant="caption" color="text.secondary" className="daily-plan__printers">
            6100 · 7210 · 3070
          </Typography>
          <RingProgress
            progress={color.progress}
            done={color.done}
            plan={min_run_color}
            loading={loading}
          />
          <Typography variant="caption" color="text.secondary">
            {loading ? '—' : color.left === 0 ? 'Выполнено!' : `Осталось: ${formatNum(color.left)}`}
          </Typography>
        </div>

        <div className="daily-plan__sep" />

        <div className="daily-plan__item">
          <Typography variant="overline" color="text.secondary">
            Ч/Б
          </Typography>
          <Typography variant="caption" color="text.secondary" className="daily-plan__printers">
            8210
          </Typography>
          <RingProgress
            progress={bw.progress}
            done={bw.done}
            plan={min_run_bw}
            loading={loading}
          />
          <Typography variant="caption" color="text.secondary">
            {loading ? '—' : bw.left === 0 ? 'Выполнено!' : `Осталось: ${formatNum(bw.left)}`}
          </Typography>
        </div>

        <div className="daily-plan__sep" />

        <div className="daily-plan__item">
          <Typography variant="overline" color="text.secondary">
            Макеты
          </Typography>
          <Typography variant="caption" color="text.secondary" className="daily-plan__printers">
            все принтеры
          </Typography>
          <RingProgress
            progress={files.progress}
            done={files.done}
            plan={min_files}
            loading={loading}
          />
          <Typography variant="caption" color="text.secondary">
            {loading ? '—' : files.left === 0 ? 'Выполнено!' : `Осталось: ${formatNum(files.left)}`}
          </Typography>
        </div>
      </div>
    </Paper>
  );
};

export default DailyPlan;
