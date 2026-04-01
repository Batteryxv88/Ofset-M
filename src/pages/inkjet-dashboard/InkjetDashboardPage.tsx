import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { AppHeader } from '../../widgets/app-header';
import { InkjetForm } from '../../widgets/inkjet-form';
import { InkjetJobs } from '../../widgets/inkjet-jobs';
import './InkjetDashboardPage.scss';

const InkjetDashboardPage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [jobsTrigger, setJobsTrigger] = useState(0);

  const handleSaved = useCallback(() => {
    setJobsTrigger((n) => n + 1);
  }, []);

  return (
    <div className="inkjet-page">
      <AppHeader />
      <div className="inkjet-page__content">
        <InkjetForm onSaved={handleSaved} />
        {user?.id && (
          <InkjetJobs userId={user.id} refreshTrigger={jobsTrigger} />
        )}
      </div>
    </div>
  );
};

export default InkjetDashboardPage;
