import { NavLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import {
  CalendarMonth,
  Dashboard,
  EventNote,
  AccessTime,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

// Defined outside the component — doesn't re-create on every render
const NAV_ITEMS = [
  { label: 'Tableau de bord', icon: <Dashboard />, to: '/dashboard' },
  { label: 'Types d\'événements', icon: <EventNote />, to: '/dashboard/event-types' },
  { label: 'Disponibilités', icon: <AccessTime />, to: '/dashboard/availability' },
  { label: 'Profil', icon: <Person />, to: '/dashboard/profile' },
];

/**
 * Fixed left sidebar for the dashboard layout.
 * Highlights the active route using NavLink's isActive state.
 * Shows user email and a logout button at the bottom.
 */
export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(); // Clears Supabase session + triggers onAuthStateChange in AuthContext
    navigate('/login');
  };

  return (
    <Box
      sx={{
        width: 240,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        bgcolor: 'background.paper',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Brand logo — top section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 2.5 }}>
        <CalendarMonth sx={{ color: '#0069FF', fontSize: 28 }} />
        <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700 }}>
          Slotly
        </Typography>
      </Box>

      <Divider />

      {/* Navigation items */}
      <List sx={{ flex: 1, pt: 1 }}>
        {NAV_ITEMS.map(({ label, icon, to }) => (
          <ListItem key={to} disablePadding sx={{ px: 1.5, mb: 0.5 }}>
            <NavLink
              to={to}
              end={to === '/dashboard'} // Only exact match for /dashboard
              style={{ textDecoration: 'none', width: '100%' }}
            >
              {/* NavLink passes isActive — true when the current URL matches this route */}
              {({ isActive }) => (
                <ListItemButton
                  sx={{
                    borderRadius: '8px',
                    borderLeft: isActive ? '3px solid #0069FF' : '3px solid transparent',
                    bgcolor: isActive ? '#E8F0FF' : 'transparent',
                    color: isActive ? '#0069FF' : 'text.primary',
                    transition: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease',
                    '&:hover': { bgcolor: isActive ? '#E8F0FF' : 'action.hover' },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: isActive ? '#0069FF' : 'text.secondary',
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              )}
            </NavLink>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* User email + logout — bottom section */}
      <Box sx={{ px: 2.5, py: 2 }}>
        {/* user?.email — safe access in case user is briefly null during session refresh */}
        <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
          {user?.email}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={handleLogout}
          sx={{ borderColor: '#E5E7EB', color: 'text.secondary' }}
        >
          Déconnexion
        </Button>
      </Box>
    </Box>
  );
}
