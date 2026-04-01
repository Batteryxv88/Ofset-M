import { useEffect } from 'react';
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

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
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

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
