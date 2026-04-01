import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material';
import type { FormEvent } from 'react';
import type { AppDispatch, RootState } from '../../app/store';
import { signInWithEmail } from '../../features/auth';
import './LoginPage.scss';

const LoginPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || auth.status === 'loading') return;
    dispatch(signInWithEmail({ email, password }));
  };

  const isLoading = auth.status === 'loading';

  return (
    <Box className="login-page">
      <Paper elevation={0} className="login-card">
        <div className="login-card__logo">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect width="36" height="36" rx="12" fill="#6366f1" />
            <path
              d="M10 19L15.5 24.5L26 13"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <Typography variant="h5" component="h1" className="login-card__heading">
          Добро пожаловать
        </Typography>
        <Typography variant="body2" color="text.secondary" className="login-card__sub">
          Войди в свой аккаунт, чтобы продолжить
        </Typography>

        <Box component="form" onSubmit={handleSubmit} className="login-form">
          <div className="login-form__field">
            <Typography variant="caption" color="text.secondary" className="login-form__label">
              Email
            </Typography>
            <TextField
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              fullWidth
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="login-form__field">
            <Typography variant="caption" color="text.secondary" className="login-form__label">
              Пароль
            </Typography>
            <TextField
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              fullWidth
              autoComplete="current-password"
            />
          </div>

          {auth.error && <Alert severity="error">{auth.error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
            fullWidth
            className="login-form__submit"
          >
            {isLoading ? (
              <>
                <CircularProgress size={16} color="inherit" className="login-form__spinner" />
                Входим...
              </>
            ) : (
              'Войти'
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
