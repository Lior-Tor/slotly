import { createTheme } from '@mui/material/styles';

// Generate progressively deeper shadows for indices 3–24
// MUI requires exactly 25 entries (0–24) in the shadows array
const buildShadows = () => {
  const base = [
    'none',
    '0px 1px 3px rgba(0,0,0,0.06)',
    '0px 1px 5px rgba(0,0,0,0.08)',
  ];
  for (let i = 3; i <= 24; i++) {
    const blur = i * 2;
    const spread = Math.floor(i / 3);
    const opacity = Math.min(0.04 + i * 0.008, 0.3).toFixed(3);
    base.push(`0px ${i}px ${blur}px ${spread}px rgba(0,0,0,${opacity})`);
  }
  return base;
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0069FF',      // Brand blue — buttons, links, active states
      light: '#E8F0FF',     // Pale blue — selected states, highlights
      dark: '#0052CC',      // Hover state on primary buttons
    },
    secondary: {
      main: '#6B7280',
    },
    background: {
      default: '#F9FAFB',   // App background (very light gray)
      paper: '#FFFFFF',     // Cards, sidebar, modals
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
    divider: '#E5E7EB',
    error: { main: '#EF4444' },
    success: { main: '#10B981' },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '2rem',    fontWeight: 700 },
    h2: { fontSize: '1.5rem',  fontWeight: 600 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    h4: { fontSize: '1.1rem',  fontWeight: 600 },
    body1: { fontSize: '0.95rem' },
    body2: { fontSize: '0.85rem' },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: buildShadows(),
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          fontWeight: 500,
          transition: 'transform 150ms ease, box-shadow 150ms ease',
          '&:hover': { transform: 'scale(1.02)' },
          '&:active': { transform: 'scale(0.98)' },
        },
        containedPrimary: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': { borderRadius: 8 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
      },
    },
  },
});

export default theme;
