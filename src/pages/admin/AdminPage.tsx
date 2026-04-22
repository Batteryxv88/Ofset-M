import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { CircularProgress, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import {
  getPrintRunsInPeriod, calcBonuses,
} from '../../features/admin';
import type { UserBonusSummary } from '../../features/admin';
import {
  getInkjetPeriodDayStats,
  getInkjetWorkers,
  calcInkjetDailyBonuses,
  calcInkjetWorkerBonuses,
} from '../../features/inkjet';
import type {
  InkjetDailyBonus,
  InkjetWorkerBonus,
} from '../../features/inkjet';
import { AppHeader } from '../../widgets/app-header';
import { SettingsPanel } from '../../widgets/settings-panel';
import { InkjetSettingsPanel } from '../../widgets/inkjet-settings-panel';
import { InkjetOptionsPanel } from '../../widgets/inkjet-options-panel';
import { TabsStrip } from '../../shared/ui/tabs-strip';
import { getBillingPeriod, formatNum, formatRub } from '../../shared/lib';
import './AdminPage.scss';

/** «125» → «2 ч 5 мин» */
function formatMinutes(mins: number): string {
  if (!mins) return '0 мин';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

type AdminSection = 'laser' | 'inkjet';
type LaserTab = 'settings' | 'bonus';
type InkjetTab = 'settings' | 'options' | 'bonus';

// ── Расчёт премии — лазерная печать ─────────────────────────
const LaserBonusTable = () => {
  const settings = useSelector((state: RootState) => state.settings.values);

  const period = useMemo(
    () => getBillingPeriod(settings.calculation_day),
    [settings.calculation_day],
  );

  const [bonuses, setBonuses] = useState<UserBonusSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromMs = period.from.getTime();
  const toMs = period.to.getTime();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { runs, profiles } = await getPrintRunsInPeriod(new Date(fromMs), new Date(toMs));
      setBonuses(calcBonuses(runs, profiles, settings));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromMs, toMs]);

  useEffect(() => {
    if (bonuses.length === 0) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  useEffect(() => { loadData(); }, [loadData]);

  const totals = useMemo(
    () => ({
      colorBonus:  bonuses.reduce((a, b) => a + b.colorBonus,  0),
      bwBonus:     bonuses.reduce((a, b) => a + b.bwBonus,     0),
      layoutBonus: bonuses.reduce((a, b) => a + b.layoutBonus, 0),
      total:       bonuses.reduce((a, b) => a + b.totalBonus,  0),
    }),
    [bonuses],
  );

  return (
    <div className="bonus-table">
      <div className="bonus-table__header">
        <div>
          <Typography variant="h6" className="bonus-table__title">Расчёт премии</Typography>
          <Typography variant="caption" color="text.secondary" className="bonus-table__period">
            Расчётный период: {period.label}
          </Typography>
        </div>
        <button
          className="bonus-table__refresh"
          onClick={loadData}
          disabled={loading}
          title="Обновить"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 8a5.5 5.5 0 1 1 1.1 3.3M2.5 8V4.5M2.5 8H6"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="bonus-table__formula">
        <Typography variant="caption" color="text.secondary">
          Премия = ((цвет − {formatNum(settings.min_run_color)}) × {settings.price_color} ₽)
          &nbsp;+ ((Ч/Б − {formatNum(settings.min_run_bw)}) × {settings.price_bw} ₽)
          &nbsp;+ ((макеты − {formatNum(settings.min_files)}) × {settings.price_layout} ₽)
        </Typography>
        <Typography variant="caption" color="text.secondary" className="bonus-table__formula-note">
          &nbsp;· в зачёт только дни ≥ мин. и только сумма сверх минимума
        </Typography>
      </div>

      {loading && (
        <div className="bonus-table__loader"><CircularProgress size={28} /></div>
      )}

      {error && (
        <div className="bonus-table__error">
          <Typography variant="body2" color="error">{error}</Typography>
        </div>
      )}

      {!loading && !error && bonuses.length === 0 && (
        <div className="bonus-table__empty">
          <Typography variant="body2" color="text.secondary">
            Нет данных за расчётный период
          </Typography>
        </div>
      )}

      {bonuses.length > 0 && (
        <div className="bonus-table__wrap">
          <table className="bonus-table__table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th className="num" title="Листов сверх минимума (дней в зачёте / всего дней)">Цвет, л. ↑мин</th>
                <th className="num" title="Листов Ч/Б сверх минимума">Ч/Б, л. ↑мин</th>
                <th className="num" title="Макетов сверх минимума">Макеты ↑мин</th>
                <th className="num">Цвет ₽</th>
                <th className="num">Ч/Б ₽</th>
                <th className="num">Макеты ₽</th>
                <th className="num total">Итого ₽</th>
              </tr>
            </thead>
            <tbody>
              {bonuses.map((s) => {
                const name = s.user.name ?? s.user.email ?? s.user.id;
                const colorSkipped = s.colorDaysTotal - s.colorDaysQual;
                const bwSkipped    = s.bwDaysTotal    - s.bwDaysQual;
                const filesSkipped = s.filesDaysTotal - s.filesDaysQual;
                return (
                  <tr key={s.user.id}>
                    <td>
                      <div className="bonus-table__name">{name}</div>
                      {s.user.email && s.user.name && (
                        <div className="bonus-table__email">{s.user.email}</div>
                      )}
                    </td>
                    <td className="num">
                      <div>{formatNum(s.qualColorRun)}</div>
                      <div className="bonus-table__days">
                        {s.colorDaysQual}/{s.colorDaysTotal} дн.
                        {colorSkipped > 0 && (
                          <span className="bonus-table__skipped" title={`${colorSkipped} дн. не вышли в минимум`}>
                            −{colorSkipped}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="num">
                      <div>{formatNum(s.qualBwRun)}</div>
                      <div className="bonus-table__days">
                        {s.bwDaysQual}/{s.bwDaysTotal} дн.
                        {bwSkipped > 0 && (
                          <span className="bonus-table__skipped" title={`${bwSkipped} дн. не вышли в минимум`}>
                            −{bwSkipped}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="num">
                      <div>{formatNum(s.qualFiles)}</div>
                      <div className="bonus-table__days">
                        {s.filesDaysQual}/{s.filesDaysTotal} дн.
                        {filesSkipped > 0 && (
                          <span className="bonus-table__skipped" title={`${filesSkipped} дн. не вышли в минимум`}>
                            −{filesSkipped}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="num">{s.colorBonus  > 0 ? formatRub(s.colorBonus)  : <span className="bonus-table__zero">—</span>}</td>
                    <td className="num">{s.bwBonus     > 0 ? formatRub(s.bwBonus)     : <span className="bonus-table__zero">—</span>}</td>
                    <td className="num">{s.layoutBonus > 0 ? formatRub(s.layoutBonus) : <span className="bonus-table__zero">—</span>}</td>
                    <td className="num total">{formatRub(s.totalBonus)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="bonus-table__foot-label">Итого по всем</td>
                <td className="num">{formatRub(totals.colorBonus)}</td>
                <td className="num">{formatRub(totals.bwBonus)}</td>
                <td className="num">{formatRub(totals.layoutBonus)}</td>
                <td className="num total">{formatRub(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Расчёт премии — Струйная печать ─────────────────────────
const InkjetBonusTable = () => {
  const settings = useSelector((state: RootState) => state.settings.values);

  const period = useMemo(
    () => getBillingPeriod(settings.calculation_day),
    [settings.calculation_day],
  );

  const [daily, setDaily] = useState<InkjetDailyBonus[]>([]);
  const [workers, setWorkers] = useState<InkjetWorkerBonus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fromMs = period.from.getTime();
  const toMs = period.to.getTime();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, wList] = await Promise.all([
        getInkjetPeriodDayStats(new Date(fromMs), new Date(toMs)),
        getInkjetWorkers(),
      ]);
      setDaily(calcInkjetDailyBonuses(stats, settings));
      setWorkers(calcInkjetWorkerBonuses(stats, wList, settings));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromMs, toMs]);

  useEffect(() => {
    if (daily.length === 0 && workers.length === 0) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  useEffect(() => { loadData(); }, [loadData]);

  const grandTotal = workers.reduce((s, w) => s + w.totalBonus, 0);

  return (
    <div className="bonus-table">
      <div className="bonus-table__header">
        <div>
          <Typography variant="h6" className="bonus-table__title">
            Расчёт премии — струйная печать
          </Typography>
          <Typography variant="caption" color="text.secondary" className="bonus-table__period">
            Расчётный период: {period.label}
          </Typography>
        </div>
        <button
          className="bonus-table__refresh"
          onClick={loadData}
          disabled={loading}
          title="Обновить"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 8a5.5 5.5 0 1 1 1.1 3.3M2.5 8V4.5M2.5 8H6"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="bonus-table__formula">
        <Typography variant="caption" color="text.secondary">
          R = Σ (приладка + печать + постпечать) всех печатников за день.
          Если R &gt; {formatNum(settings.inkjet_min_total_minutes)} мин →
          премия каждому работнику = ((R / 60) − (кол-во работников × {settings.inkjet_norm_hours_per_worker} ч))
          × {settings.inkjet_rate_per_hour} ₽.
          Состав смены берётся из отметок «Кто в смене» в форме ввода.
        </Typography>
      </div>

      {loading && (
        <div className="bonus-table__loader"><CircularProgress size={28} /></div>
      )}

      {error && (
        <div className="bonus-table__error">
          <Typography variant="body2" color="error">{error}</Typography>
        </div>
      )}

      {!loading && !error && workers.length === 0 && (
        <div className="bonus-table__empty">
          <Typography variant="body2" color="text.secondary">
            Нет данных за расчётный период
          </Typography>
        </div>
      )}

      {!loading && !error && workers.length > 0 && (
        <div className="bonus-table__wrap">
          <table className="bonus-table__table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Печатник</th>
                <th className="num" title="Смен всего / премиальных">Смен</th>
                <th className="num total">Премия ₽</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const isOpen = expanded === w.workerId;
                const workerDays = daily.filter((d) =>
                  d.workerIds.includes(w.workerId),
                );
                return (
                  <Fragment key={w.workerId}>
                    <tr
                      className={`bonus-table__row--clickable ${isOpen ? 'bonus-table__row--open' : ''}`}
                      onClick={() => setExpanded(isOpen ? null : w.workerId)}
                    >
                      <td className="bonus-table__caret">{isOpen ? '▾' : '▸'}</td>
                      <td>
                        <div className="bonus-table__name">{w.workerName}</div>
                      </td>
                      <td className="num">
                        <div>{w.shiftsCount}</div>
                        <div className="bonus-table__days">
                          с премией: {w.qualShiftsCount}
                        </div>
                      </td>
                      <td className="num total">
                        {w.totalBonus > 0
                          ? formatRub(w.totalBonus)
                          : <span className="bonus-table__zero">—</span>}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bonus-table__details-row">
                        <td colSpan={4}>
                          <div className="bonus-table__details">
                            <table className="bonus-table__details-table">
                              <thead>
                                <tr>
                                  <th>Дата</th>
                                  <th className="num">Общее время</th>
                                  <th className="num">Работников</th>
                                  <th className="num">Сверх нормы</th>
                                  <th className="num total">Премия за день</th>
                                </tr>
                              </thead>
                              <tbody>
                                {workerDays.map((s) => {
                                  const overHours =
                                    s.totalMinutes / 60 - s.workersCount * settings.inkjet_norm_hours_per_worker;
                                  const belowMin = s.totalMinutes <= settings.inkjet_min_total_minutes;
                                  return (
                                    <tr key={s.dateKey}>
                                      <td>{s.label}</td>
                                      <td className="num">
                                        {formatMinutes(s.totalMinutes)}
                                        {belowMin && (
                                          <span
                                            className="bonus-table__skipped"
                                            title={`Ниже порога ${settings.inkjet_min_total_minutes} мин`}
                                          >
                                            ниже мин.
                                          </span>
                                        )}
                                      </td>
                                      <td className="num">{s.workersCount}</td>
                                      <td className="num">
                                        {overHours > 0
                                          ? `${overHours.toFixed(1)} ч`
                                          : <span className="bonus-table__zero">—</span>}
                                      </td>
                                      <td className="num total">
                                        {s.dayBonus > 0
                                          ? formatRub(s.dayBonus)
                                          : <span className="bonus-table__zero">—</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td className="bonus-table__foot-label">Фонд премий (сумма по всем)</td>
                <td></td>
                <td className="num total">{formatRub(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Главный компонент ────────────────────────────────────────
const AdminPage = () => {
  const [section, setSection]     = useState<AdminSection>('laser');
  const [laserTab, setLaserTab]   = useState<LaserTab>('settings');
  const [inkjetTab, setInkjetTab] = useState<InkjetTab>('settings');

  return (
    <div className="admin-page">
      <AppHeader />

      <div className="admin-page__content">

        {/* Главный переключатель секций */}
        <TabsStrip<AdminSection>
          variant="primary"
          active={section}
          onChange={setSection}
          tabs={[
            { id: 'laser',  label: 'Лазерная печать' },
            { id: 'inkjet', label: 'Струйная печать' },
          ]}
        />

        {/* ── Лазерная секция ─── */}
        {section === 'laser' && (
          <div className="admin-page__section">
            <TabsStrip<LaserTab>
              variant="sub"
              active={laserTab}
              onChange={setLaserTab}
              tabs={[
                { id: 'settings', label: 'Настройки системы' },
                { id: 'bonus',    label: 'Расчёт премии' },
              ]}
            />
            <div className="admin-page__tab-content">
              {laserTab === 'settings' && <SettingsPanel />}
              {laserTab === 'bonus'    && <LaserBonusTable />}
            </div>
          </div>
        )}

        {/* ── Струйная секция ─── */}
        {section === 'inkjet' && (
          <div className="admin-page__section">
            <TabsStrip<InkjetTab>
              variant="sub"
              active={inkjetTab}
              onChange={setInkjetTab}
              tabs={[
                { id: 'settings', label: 'Настройки системы' },
                { id: 'options',  label: 'Выпадающие списки' },
                { id: 'bonus',    label: 'Расчёт премии' },
              ]}
            />
            <div className="admin-page__tab-content">
              {inkjetTab === 'settings' && <InkjetSettingsPanel />}
              {inkjetTab === 'options'  && <InkjetOptionsPanel />}
              {inkjetTab === 'bonus'    && <InkjetBonusTable />}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPage;
