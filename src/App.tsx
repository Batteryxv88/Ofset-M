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
import AdminPage from './pages/admin/AdminPage';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';

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
        <Route
          path="/"
          element={user ? <DashboardPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : isAdmin ? (
              <AdminPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
