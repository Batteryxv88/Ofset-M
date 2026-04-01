import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { getTodaySummary } from '../../features/print-run';
import { AppHeader } from '../../widgets/app-header';
import { PrintRunForm } from '../../widgets/print-run-form';
import { DailyPlan } from '../../widgets/daily-plan';
import { PrinterSummary } from '../../widgets/printer-summary';
import { BonusSummary } from '../../widgets/bonus-summary';
import './DashboardPage.scss';

type SummaryRow = {
  printerModel: string;
  totalFiles: number;
  totalRun: number;
};

const DashboardPage = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Инкремент при каждой новой записи → BonusSummary обновляется
  const [bonusTrigger, setBonusTrigger] = useState(0);
  const isMounted = useRef(true);

  const totals = useMemo(() => {
    let filesTotal = 0;
    let runTotal = 0;
    for (const r of summary) {
      filesTotal += Number(r.totalFiles ?? 0);
      runTotal += Number(r.totalRun ?? 0);
    }
    return { filesTotal, runTotal };
  }, [summary]);

  const refreshSummary = useCallback(async () => {
    if (!user?.id) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const rows = await getTodaySummary({ userId: user.id });
      if (isMounted.current) setSummary(rows);
    } catch (e) {
      if (isMounted.current)
        setSummaryError(e instanceof Error ? e.message : 'Не удалось загрузить сводку');
    } finally {
      if (isMounted.current) setSummaryLoading(false);
    }
  }, [user?.id]);

  const handleSaved = useCallback(() => {
    refreshSummary();
    setBonusTrigger((n) => n + 1);
  }, [refreshSummary]);

  useEffect(() => {
    isMounted.current = true;
    if (user?.id) void refreshSummary();
    return () => { isMounted.current = false; };
  }, [user?.id, refreshSummary]);

  return (
    <div className="dashboard-page">
      <AppHeader />

      <div className="dashboard-page__content">
        <div className="dashboard-page__layout">

          {/* Левая колонка: форма + сводка за сегодня */}
          <div className="dashboard-page__col dashboard-page__col--left">
            <PrintRunForm onSaved={handleSaved} />
            <PrinterSummary
              summary={summary}
              totals={totals}
              loading={summaryLoading}
            />
          </div>

          {/* Правая колонка: дневной план + премия за период */}
          <div className="dashboard-page__col dashboard-page__col--right">
            <DailyPlan
              summary={summary}
              loading={summaryLoading}
              error={summaryError}
              onRefresh={refreshSummary}
            />
            <BonusSummary refreshTrigger={bonusTrigger} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
