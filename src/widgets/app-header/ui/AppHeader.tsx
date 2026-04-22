import { Avatar, IconButton, Tooltip, Typography } from '@mui/material';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import { signOut } from '../../../features/auth';
import { ROLE_LABELS } from '../../../shared/config';
import { avatarLetters } from '../../../shared/lib';
import './AppHeader.scss';

const NavLinks = ({ className }: { className?: string }) => (
  <nav className={`app-header__nav ${className ?? ''}`}>
    <NavLink
      to="/laser"
      className={({ isActive }) =>
        `app-header__nav-link ${isActive ? 'app-header__nav-link--active' : ''}`
      }
    >
      Лазерная
    </NavLink>
    <NavLink
      to="/inkjet"
      className={({ isActive }) =>
        `app-header__nav-link ${isActive ? 'app-header__nav-link--active' : ''}`
      }
    >
      Струйная
    </NavLink>
    <NavLink
      to="/admin"
      className={({ isActive }) =>
        `app-header__nav-link ${isActive ? 'app-header__nav-link--active' : ''}`
      }
    >
      Админ
    </NavLink>
  </nav>
);

const AppHeader = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const isAdmin = user?.role === 'admin';
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '—';
  const displayName = user?.name ?? user?.email?.split('@')[0] ?? '—';
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="app-header">
      <div className="app-header__top">
        <div className="app-header__left">
          <div className="app-header__brand">
            <div className="app-header__logo">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <rect width="22" height="22" rx="7" fill="#6366f1" />
                <path
                  d="M6 11.5L9.5 15L16 8"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="app-header__brand-text">
              <Typography variant="subtitle1" className="app-header__title">
                Офсет Москва
              </Typography>
              <Typography variant="caption" color="text.secondary" className="app-header__date">
                {today}
              </Typography>
            </div>
          </div>

          {/* Навигация для desktop: в одну строку с логотипом */}
          {isAdmin && <NavLinks className="app-header__nav--desktop" />}
        </div>

        <div className="app-header__user">
          <div className="app-header__user-info">
            <Typography variant="body2" className="app-header__name">
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" className="app-header__role">
              {roleLabel}
            </Typography>
          </div>

          <Tooltip title="Выйти из аккаунта">
            <IconButton
              className="app-header__avatar-btn"
              onClick={() => dispatch(signOut())}
              size="small"
              aria-label="Выйти"
            >
              <Avatar className="app-header__avatar">
                {avatarLetters(user?.name, user?.email)}
              </Avatar>
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Навигация для mobile: отдельной строкой под хедером с horizontal scroll */}
      {isAdmin && <NavLinks className="app-header__nav--mobile" />}
    </header>
  );
};

export default AppHeader;
