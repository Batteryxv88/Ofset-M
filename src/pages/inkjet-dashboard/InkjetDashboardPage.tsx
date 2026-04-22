import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { AppHeader } from '../../widgets/app-header';
import { InkjetForm } from '../../widgets/inkjet-form';
import { InkjetJobs } from '../../widgets/inkjet-jobs';
import { InkjetDailyPlan } from '../../widgets/inkjet-daily-plan';
import { InkjetBonusSummary } from '../../widgets/inkjet-bonus-summary';
import './InkjetDashboardPage.scss';

const InkjetDashboardPage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [jobsTrigger, setJobsTrigger] = useState(0);
  const [statsTrigger, setStatsTrigger] = useState(0);

  const handleSaved = useCallback(() => {
    setJobsTrigger((n) => n + 1);
    setStatsTrigger((n) => n + 1);
  }, []);

  return (
    <div className="inkjet-page">
      <AppHeader />
      <div className="inkjet-page__content">
        <div className="inkjet-page__layout">

          {/* Левая колонка: форма ввода */}
          <div className="inkjet-page__col inkjet-page__col--left">
            <InkjetForm onSaved={handleSaved} />
          </div>

          {/* Правая колонка: дневной план + премия за период */}
          <div className="inkjet-page__col inkjet-page__col--right">
            <InkjetDailyPlan refreshTrigger={statsTrigger} />
            <InkjetBonusSummary refreshTrigger={statsTrigger} />
          </div>

          {/* Таблица заказов — на всю ширину */}
          {user?.id && (
            <div className="inkjet-page__full-width">
              <InkjetJobs userId={user.id} refreshTrigger={jobsTrigger} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InkjetDashboardPage;
