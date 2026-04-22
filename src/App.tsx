import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './app/store';
import { theme } from './app/theme';
import { loadProfile, setUser } from './features/auth';
import { fetchSettings } from './features/settings';
import { supabase } from './shared/api/supabaseClient';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import InkjetDashboardPage from './pages/inkjet-dashboard/InkjetDashboardPage';
import AdminPage from './pages/admin/AdminPage';
import './App.scss';

// ── Экран «Supabase не настроен» ────────────────────────────────
const NoSupabaseScreen = () => (
  <div className="app-fatal">
    <div className="app-fatal__card">
      <div className="app-fatal__icon" aria-hidden>🔌</div>
      <h2 className="app-fatal__title">Сервис недоступен</h2>
      <p className="app-fatal__desc">
        Не удалось подключиться к базе данных.<br />
        Отсутствуют переменные окружения{' '}
        <code>VITE_SUPABASE_URL</code> и{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code>.
      </p>
      <p className="app-fatal__hint">
        Если вы видите это на GitHub Pages — убедитесь, что секреты добавлены в настройках репозитория.
      </p>
    </div>
  </div>
);

// ── Оффлайн-баннер ──────────────────────────────────────────────
const OfflineBanner = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOnline  = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="app-offline" role="alert" aria-live="polite">
      <span className="app-offline__dot" aria-hidden />
      Нет подключения к интернету — данные могут быть устаревшими
    </div>
  );
};

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin    = user?.role === 'admin';
  const isInkjet   = user?.role === 'inkjet_printer';
  const isLaser    = user?.role === 'laser_printer';

  // Куда перенаправить после логина — зависит от роли
  const defaultPath = isInkjet ? '/inkjet' : '/laser';

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (!supabase) return;

    let currentUserId: string | null = null;

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      currentUserId = u?.id ?? null;
      dispatch(
        setUser(
          u
            ? {
                id: u.id,
                email: u.email ?? null,
                name:
                  (u.user_metadata?.name as string | undefined) ??
                  (u.user_metadata?.full_name as string | undefined) ??
                  null,
                role: null,
              }
            : null,
        ),
      );
      if (u) dispatch(loadProfile(u.id));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      // События TOKEN_REFRESHED / USER_UPDATED не меняют пользователя —
      // игнорируем их, иначе role сбрасывается в null и страницу перекидывает.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;

      const u = session?.user ?? null;
      const nextId = u?.id ?? null;

      // Если тот же пользователь (например INITIAL_SESSION при повторном монтировании),
      // ничего не делаем — профиль уже загружен
      if (nextId === currentUserId) return;

      currentUserId = nextId;
      dispatch(
        setUser(
          u
            ? {
                id: u.id,
                email: u.email ?? null,
                name:
                  (u.user_metadata?.name as string | undefined) ??
                  (u.user_metadata?.full_name as string | undefined) ??
                  null,
                role: null,
              }
            : null,
        ),
      );
      if (u) dispatch(loadProfile(u.id));
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [dispatch]);

  if (!supabase) return <NoSupabaseScreen />;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OfflineBanner />
      <Routes>
        {/* Лазерная печать (laser_printer + admin) */}
        <Route
          path="/laser"
          element={
            !user ? <Navigate to="/login" replace /> :
            (isAdmin || isLaser) ? <DashboardPage /> :
            <Navigate to={defaultPath} replace />
          }
        />

        {/* Струйная печать (inkjet_printer + admin) */}
        <Route
          path="/inkjet"
          element={
            !user ? <Navigate to="/login" replace /> :
            (isAdmin || isInkjet) ? <InkjetDashboardPage /> :
            <Navigate to={defaultPath} replace />
          }
        />

        {/* Административная страница */}
        <Route
          path="/admin"
          element={
            !user ? <Navigate to="/login" replace /> :
            isAdmin ? <AdminPage /> :
            <Navigate to={defaultPath} replace />
          }
        />

        {/* Логин */}
        <Route
          path="/login"
          element={user ? <Navigate to={defaultPath} replace /> : <LoginPage />}
        />

        {/* Fallback: корень → дефолтный дашборд */}
        <Route
          path="/"
          element={user ? <Navigate to={defaultPath} replace /> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<Navigate to={user ? defaultPath : '/login'} replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
