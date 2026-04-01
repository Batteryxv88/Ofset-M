import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0f1117',
      paper: '#181c27',
    },
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#a78bfa',
    },
    error: { main: '#f87171' },
    warning: { main: '#fb923c' },
    info: { main: '#38bdf8' },
    success: { main: '#34d399' },
    divider: 'rgba(255,255,255,0.07)',
    text: {
      primary: '#e2e8f0',
      secondary: '#64748b',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    fontSize: 13,
    h5: { fontWeight: 600, letterSpacing: '-0.3px' },
    h6: { fontWeight: 600, letterSpacing: '-0.2px' },
    subtitle1: { fontWeight: 600, fontSize: '0.9rem' },
    subtitle2: { fontWeight: 500, fontSize: '0.8rem' },
    body2: { fontSize: '0.8rem' },
    caption: { fontSize: '0.72rem' },
    overline: { fontSize: '0.65rem', letterSpacing: '0.08em', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(15,17,23,0.85)',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiButton: {
      defaultProps: { size: 'small', disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, borderRadius: 8 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontSize: '0.75rem', height: 26 } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: 'rgba(255,255,255,0.06)' } },
    },
    MuiAlert: {
      styleOverrides: { root: { fontSize: '0.78rem', padding: '6px 12px' } },
    },
  },
});
