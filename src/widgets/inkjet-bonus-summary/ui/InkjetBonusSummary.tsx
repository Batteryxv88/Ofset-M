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
  calcInkjetDailyBonuses,
} from '../../../features/inkjet';
import type { InkjetMyBonusSummary } from '../../../features/inkjet';
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
    payload: {
      dayBonus: number;
      totalMinutes: number;
      workersCount: number;
      ownMinutes: number;
    };
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
      <div className="ij-bonus-chart__tooltip-row">
        Моё: {formatMin(d.ownMinutes)}
      </div>
      <div className="ij-bonus-chart__tooltip-total">
        Премия: {formatRub(d.dayBonus)}
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

  const [summary, setSummary] = useState<InkjetMyBonusSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromMs = period.from.getTime();
  const toMs = period.to.getTime();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await getInkjetPeriodDayStats(
        new Date(fromMs),
        new Date(toMs),
      );
      setSummary(calcInkjetDailyBonuses(stats, settings));
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
    if (summary) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const chartData = summary?.dailyBreakdown ?? [];
  const hasData = chartData.length > 0 && (summary?.totalBonus ?? 0) > 0;

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

      <div className="ij-bonus-summary__total">
        <Typography variant="h4" className="ij-bonus-summary__amount">
          {loading ? '—' : formatRub(summary?.totalBonus ?? 0)}
        </Typography>
        {summary && !loading && (
          <div className="ij-bonus-summary__meta">
            <span className="ij-bonus-summary__chip">
              Смен: {summary.shiftsCount}
            </span>
            <span className="ij-bonus-summary__chip ij-bonus-summary__chip--ok">
              Премиальных: {summary.qualShiftsCount}
            </span>
            <span className="ij-bonus-summary__chip">
              Отработано: {formatMin(summary.ownMinutes)}
            </span>
          </div>
        )}
      </div>

      {!loading && hasData && (
        <div className="ij-bonus-summary__chart">
          <Typography
            variant="caption"
            color="text.secondary"
            className="ij-bonus-summary__chart-label"
          >
            Премия по сменам, ₽
          </Typography>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={chartData}
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
                {chartData.map((entry, index) => (
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

      {!loading && !hasData && !error && (
        <div className="ij-bonus-summary__empty">
          <Typography variant="body2" color="text.secondary">
            Нет данных за расчётный период
          </Typography>
        </div>
      )}
    </Paper>
  );
};

export default InkjetBonusSummary;
