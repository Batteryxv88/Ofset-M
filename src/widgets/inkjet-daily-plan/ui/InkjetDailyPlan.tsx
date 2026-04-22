import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, Divider, LinearProgress, Paper, Typography } from '@mui/material';
import type { RootState } from '../../../app/store';
import {
  getInkjetDayStats,
  calcInkjetTodayBonus,
} from '../../../features/inkjet';
import type { InkjetDayStats } from '../../../features/inkjet';
import { RingProgress } from '../../../shared/ui';
import { formatRub } from '../../../shared/lib';
import './InkjetDailyPlan.scss';

type Props = {
  refreshTrigger?: number;
};

function formatMin(mins: number): string {
  if (mins <= 0) return '0 мин';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

const InkjetDailyPlan = ({ refreshTrigger }: Props) => {
  const settings = useSelector((state: RootState) => state.settings.values);
  const minTotal = settings.inkjet_min_total_minutes;

  const [stats, setStats] = useState<InkjetDayStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getInkjetDayStats(new Date());
      if (isMounted.current) setStats(s);
    } catch (e: unknown) {
      if (isMounted.current)
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    load();
    return () => { isMounted.current = false; };
  }, [load]);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const totalMinutes = stats?.totalMinutes ?? 0;
  const workersCount = stats?.workersCount ?? 0;
  const ownMinutes = stats?.ownMinutes ?? 0;
  const progress = Math.max(0, Math.min(1, totalMinutes / (minTotal || 1)));
  const leftToMin = Math.max(0, minTotal - totalMinutes);
  const reached = totalMinutes > minTotal;

  // Премия за сегодня (каждому работнику смены)
  const todayBonus = stats
    ? calcInkjetTodayBonus(totalMinutes, workersCount, settings)
    : 0;

  return (
    <Paper elevation={0} className="inkjet-plan">
      <div className="inkjet-plan__head">
        <div>
          <Typography variant="subtitle1">Дневной план</Typography>
          <Typography variant="caption" color="text.secondary">
            Порог смены: {formatMin(minTotal)} · норма {settings.inkjet_norm_hours_per_worker} ч / чел
          </Typography>
        </div>
        <Button variant="text" color="primary" onClick={load} disabled={loading}>
          Обновить
        </Button>
      </div>

      {loading && <LinearProgress className="inkjet-plan__progress" />}
      <Divider className="inkjet-plan__divider" />

      {error && (
        <Alert severity="error" className="inkjet-plan__error">
          {error}
        </Alert>
      )}

      <div className="inkjet-plan__main">
        <RingProgress
          progress={progress}
          done={totalMinutes}
          plan={minTotal}
          loading={loading}
        />
        <div className="inkjet-plan__readout">
          <Typography variant="caption" color="text.secondary">
            Общее время смены
          </Typography>
          <Typography variant="h6" className="inkjet-plan__big">
            {loading ? '—' : formatMin(totalMinutes)}
          </Typography>
          <Typography
            variant="caption"
            className={`inkjet-plan__status ${reached ? 'inkjet-plan__status--ok' : ''}`}
          >
            {loading
              ? '—'
              : reached
                ? '✓ Порог взят'
                : `До порога: ${formatMin(leftToMin)}`}
          </Typography>
        </div>
      </div>

      <div className="inkjet-plan__metrics">
        <div className="inkjet-plan__metric">
          <Typography variant="caption" color="text.secondary">
            Работников в смене
          </Typography>
          <Typography variant="body2" className="inkjet-plan__metric-value">
            {loading ? '—' : workersCount || '—'}
          </Typography>
        </div>

        <div className="inkjet-plan__metric">
          <Typography variant="caption" color="text.secondary">
            Моё время
          </Typography>
          <Typography variant="body2" className="inkjet-plan__metric-value">
            {loading ? '—' : formatMin(ownMinutes)}
          </Typography>
        </div>

        <div className="inkjet-plan__metric inkjet-plan__metric--bonus">
          <Typography variant="caption" color="text.secondary">
            Премия сегодня (каждому)
          </Typography>
          <Typography
            variant="body2"
            className={`inkjet-plan__metric-value ${todayBonus > 0 ? 'inkjet-plan__metric-value--ok' : ''}`}
          >
            {loading ? '—' : formatRub(todayBonus)}
          </Typography>
        </div>
      </div>
    </Paper>
  );
};

export default InkjetDailyPlan;
