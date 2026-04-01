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
import { getMyPeriodRuns, calcDailyBonuses } from '../../../features/print-run';
import type { MyBonusSummary } from '../../../features/print-run';
import { getBillingPeriod, formatRub } from '../../../shared/lib';
import './BonusSummary.scss';

type Props = {
  /** Вызывается при обновлении (например, после записи нового тиража) */
  refreshTrigger?: number;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: { colorBonus: number; bwBonus: number; layoutBonus: number; total: number } }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bonus-chart__tooltip">
      <div className="bonus-chart__tooltip-date">{label}</div>
      {d.colorBonus > 0 && (
        <div className="bonus-chart__tooltip-row">
          <span className="bonus-chart__tooltip-dot" style={{ background: '#6366f1' }} />
          Цвет: {formatRub(d.colorBonus)}
        </div>
      )}
      {d.bwBonus > 0 && (
        <div className="bonus-chart__tooltip-row">
          <span className="bonus-chart__tooltip-dot" style={{ background: '#818cf8' }} />
          Ч/Б: {formatRub(d.bwBonus)}
        </div>
      )}
      {d.layoutBonus > 0 && (
        <div className="bonus-chart__tooltip-row">
          <span className="bonus-chart__tooltip-dot" style={{ background: '#a5b4fc' }} />
          Макеты: {formatRub(d.layoutBonus)}
        </div>
      )}
      <div className="bonus-chart__tooltip-total">Итого: {formatRub(d.total)}</div>
    </div>
  );
};

const BonusSummary = ({ refreshTrigger }: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings.values);

  const period = useMemo(
    () => getBillingPeriod(settings.calculation_day),
    [settings.calculation_day],
  );

  const [summary, setSummary] = useState<MyBonusSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromMs = period.from.getTime();
  const toMs = period.to.getTime();

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const runs = await getMyPeriodRuns(user.id, new Date(fromMs), new Date(toMs));
      setSummary(calcDailyBonuses(runs, settings));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, fromMs, toMs]);

  // Перезагрузка при изменении периода
  useEffect(() => { load(); }, [load]);

  // Перезагрузка при записи нового тиража (через refreshTrigger)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Пересчёт при изменении тарифов (без запроса к БД)
  useEffect(() => {
    if (summary) {
      // Runs уже загружены — просто пересчитываем
      // Но мы не храним сырые runs, поэтому делаем re-fetch
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const chartData = summary?.dailyBreakdown ?? [];
  const hasData = chartData.length > 0 && (summary?.totalBonus ?? 0) > 0;

  return (
    <Paper elevation={0} className="bonus-summary">
      <div className="bonus-summary__header">
        <div>
          <Typography variant="subtitle1" className="bonus-summary__title">
            Премия за период
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {period.label}
          </Typography>
        </div>
        {loading && <CircularProgress size={16} />}
      </div>

      {error && (
        <Typography variant="caption" color="error" className="bonus-summary__error">
          {error}
        </Typography>
      )}

      <div className="bonus-summary__total">
        <Typography variant="h4" className="bonus-summary__amount">
          {loading ? '—' : formatRub(summary?.totalBonus ?? 0)}
        </Typography>
        {summary && !loading && (
          <div className="bonus-summary__breakdown">
            {summary.colorBonus > 0 && (
              <span className="bonus-summary__chip bonus-summary__chip--color">
                Цвет {formatRub(summary.colorBonus)}
              </span>
            )}
            {summary.bwBonus > 0 && (
              <span className="bonus-summary__chip bonus-summary__chip--bw">
                Ч/Б {formatRub(summary.bwBonus)}
              </span>
            )}
            {summary.layoutBonus > 0 && (
              <span className="bonus-summary__chip bonus-summary__chip--layout">
                Макеты {formatRub(summary.layoutBonus)}
              </span>
            )}
          </div>
        )}
      </div>

      {!loading && hasData && (
        <div className="bonus-summary__chart">
          <Typography variant="caption" color="text.secondary" className="bonus-summary__chart-label">
            Премия по дням, ₽
          </Typography>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="colorBonus" stackId="a" name="Цвет" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bwBonus" stackId="a" name="Ч/Б" fill="#818cf8" />
              <Bar dataKey="layoutBonus" stackId="a" name="Макеты" fill="#a5b4fc" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.total > 0 ? '#a5b4fc' : 'rgba(255,255,255,0.06)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && !hasData && !error && (
        <div className="bonus-summary__empty">
          <Typography variant="body2" color="text.secondary">
            Нет данных за расчётный период
          </Typography>
        </div>
      )}
    </Paper>
  );
};

export default BonusSummary;
