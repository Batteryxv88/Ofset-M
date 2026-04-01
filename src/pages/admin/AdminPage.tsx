import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircularProgress, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { getPrintRunsInPeriod, calcBonuses } from '../../features/admin';
import type { UserBonusSummary } from '../../features/admin';
import { AppHeader } from '../../widgets/app-header';
import { SettingsPanel } from '../../widgets/settings-panel';
import { InkjetOptionsPanel } from '../../widgets/inkjet-options-panel';
import { getBillingPeriod, formatNum, formatRub } from '../../shared/lib';
import './AdminPage.scss';

type AdminSection = 'laser' | 'inkjet';

const AdminPage = () => {
  const settings = useSelector((state: RootState) => state.settings.values);
  const [section, setSection] = useState<AdminSection>('laser');

  // Мемоизируем период — без этого новые Date() каждый рендер вызывают бесконечный цикл
  const period = useMemo(
    () => getBillingPeriod(settings.calculation_day),
    [settings.calculation_day],
  );

  const [bonuses, setBonuses] = useState<UserBonusSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Стабильные зависимости через числа (getTime), а не объекты Date
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
  }, [fromMs, toMs]); // settings не в deps — пересчёт при изменении настроек делается отдельно

  // Пересчёт при изменении настроек без запроса к Supabase
  useEffect(() => {
    if (bonuses.length === 0) return;
    // Перезагружаем, чтобы пересчитать с новыми ценами/минимумами
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(
    () => ({
      colorBonus: bonuses.reduce((a, b) => a + b.colorBonus, 0),
      bwBonus: bonuses.reduce((a, b) => a + b.bwBonus, 0),
      layoutBonus: bonuses.reduce((a, b) => a + b.layoutBonus, 0),
      total: bonuses.reduce((a, b) => a + b.totalBonus, 0),
    }),
    [bonuses],
  );

  return (
    <div className="admin-page">
      <AppHeader />

      <div className="admin-page__content">

        {/* Переключатель разделов */}
        <div className="admin-page__sections">
          <button
            className={`admin-page__section-tab ${section === 'laser' ? 'admin-page__section-tab--active' : ''}`}
            onClick={() => setSection('laser')}
          >
            Лазерная печать
          </button>
          <button
            className={`admin-page__section-tab ${section === 'inkjet' ? 'admin-page__section-tab--active' : ''}`}
            onClick={() => setSection('inkjet')}
          >
            Струйная печать
          </button>
        </div>

        {/* Струйная секция */}
        {section === 'inkjet' && (
          <InkjetOptionsPanel />
        )}

        {/* Лазерная секция */}
        {section === 'laser' && (
        <div className="admin-page__layout">

          {/* Левая колонка: настройки */}
          <div className="admin-page__col admin-page__col--left">
            <SettingsPanel />
          </div>

          {/* Правая колонка: расчёт премии */}
          <div className="admin-page__col admin-page__col--right">
            <div className="bonus-table">

              <div className="bonus-table__header">
                <div>
                  <Typography variant="h6" className="bonus-table__title">
                    Расчёт премии
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
                    <path
                      d="M2.5 8a5.5 5.5 0 1 1 1.1 3.3M2.5 8V4.5M2.5 8H6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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
                <div className="bonus-table__loader">
                  <CircularProgress size={28} />
                </div>
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
                        const bwSkipped = s.bwDaysTotal - s.bwDaysQual;
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
                            <td className="num">{s.colorBonus > 0 ? formatRub(s.colorBonus) : <span className="bonus-table__zero">—</span>}</td>
                            <td className="num">{s.bwBonus > 0 ? formatRub(s.bwBonus) : <span className="bonus-table__zero">—</span>}</td>
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
          </div>

        </div>
        )} {/* end laser section */}

      </div>
    </div>
  );
};

export default AdminPage;
