import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CircularProgress, Paper, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RootState } from '../../../app/store';
import {
  getInkjetPeriodDayStats,
  getInkjetWorkers,
  calcInkjetDailyBonuses,
  calcInkjetWorkerBonuses,
} from '../../../features/inkjet';
import type {
  InkjetDailyBonus,
  InkjetWorker,
  InkjetWorkerBonus,
} from '../../../features/inkjet';
import { getBillingPeriod, formatRub } from '../../../shared/lib';
import './InkjetBonusSummary.scss';

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

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: {
    payload: InkjetDailyBonus;
  }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="ij-bonus-chart__tooltip">
      <div className="ij-bonus-chart__tooltip-date">{label}</div>
      <div className="ij-bonus-chart__tooltip-row">
        Общее: {formatMin(d.totalMinutes)}
      </div>
      <div className="ij-bonus-chart__tooltip-row">
        Работников: {d.workersCount}
      </div>
      <div className="ij-bonus-chart__tooltip-total">
        Каждому: {formatRub(d.dayBonus)}
      </div>
    </div>
  );
};

const InkjetBonusSummary = ({ refreshTrigger }: Props) => {
  const settings = useSelector((state: RootState) => state.settings.values);

  const period = useMemo(
    () => getBillingPeriod(settings.calculation_day),
    [settings.calculation_day],
  );

  const [daily, setDaily] = useState<InkjetDailyBonus[]>([]);
  const [workersReport, setWorkersReport] = useState<InkjetWorkerBonus[]>([]);
  const [allWorkers, setAllWorkers] = useState<InkjetWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromMs = period.from.getTime();
  const toMs = period.to.getTime();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, workers] = await Promise.all([
        getInkjetPeriodDayStats(new Date(fromMs), new Date(toMs)),
        getInkjetWorkers(),
      ]);
      setAllWorkers(workers);
      setDaily(calcInkjetDailyBonuses(stats, settings));
      setWorkersReport(calcInkjetWorkerBonuses(stats, workers, settings));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromMs, toMs]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    // Пересчитываем при изменении настроек (не перезагружая данные)
    if (daily.length > 0 || workersReport.length > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const hasChart = daily.length > 0 && daily.some((d) => d.dayBonus > 0);
  const grandTotal = workersReport.reduce(
    (sum, w) => sum + w.totalBonus,
    0,
  );

  return (
    <Paper elevation={0} className="ij-bonus-summary">
      <div className="ij-bonus-summary__header">
        <div>
          <Typography variant="subtitle1" className="ij-bonus-summary__title">
            Премия за период
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {period.label}
          </Typography>
        </div>
        {loading && <CircularProgress size={16} />}
      </div>

      {error && (
        <Typography variant="caption" color="error" className="ij-bonus-summary__error">
          {error}
        </Typography>
      )}

      {/* Суммарный фонд */}
      <div className="ij-bonus-summary__total">
        <Typography variant="caption" color="text.secondary">
          Фонд премий за период (сумма по всем печатникам)
        </Typography>
        <Typography variant="h4" className="ij-bonus-summary__amount">
          {loading ? '—' : formatRub(grandTotal)}
        </Typography>
      </div>

      {/* Таблица по печатникам */}
      {!loading && workersReport.length > 0 && (
        <div className="ij-bonus-summary__workers">
          <Typography
            variant="caption"
            color="text.secondary"
            className="ij-bonus-summary__workers-label"
          >
            По печатникам
          </Typography>
          <div className="ij-bonus-summary__workers-list">
            {workersReport.map((w) => (
              <div className="ij-bonus-summary__worker" key={w.workerId}>
                <div className="ij-bonus-summary__worker-main">
                  <div className="ij-bonus-summary__worker-name">
                    {w.workerName}
                  </div>
                  <div className="ij-bonus-summary__worker-meta">
                    Смен: {w.shiftsCount} · премиальных: {w.qualShiftsCount}
                  </div>
                </div>
                <div
                  className={`ij-bonus-summary__worker-amount ${
                    w.totalBonus > 0 ? 'ij-bonus-summary__worker-amount--ok' : ''
                  }`}
                >
                  {formatRub(w.totalBonus)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* График */}
      {!loading && hasChart && (
        <div className="ij-bonus-summary__chart">
          <Typography
            variant="caption"
            color="text.secondary"
            className="ij-bonus-summary__chart-label"
          >
            Премия каждому в смене, ₽
          </Typography>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={daily}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) => `${v} ₽`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="dayBonus" name="Премия" radius={[4, 4, 0, 0]}>
                {daily.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.dayBonus > 0 ? '#6366f1' : 'rgba(255,255,255,0.06)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && workersReport.length === 0 && !error && (
        <div className="ij-bonus-summary__empty">
          <Typography variant="body2" color="text.secondary">
            {allWorkers.length === 0
              ? 'Справочник печатников пуст — добавьте сотрудников в админке'
              : 'Нет данных за расчётный период'}
          </Typography>
        </div>
      )}
    </Paper>
  );
};

export default InkjetBonusSummary;
