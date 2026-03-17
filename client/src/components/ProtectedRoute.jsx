import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

/**
 * Guards all /dashboard/* routes from unauthenticated access.
 * - While loading: renders a fullscreen spinner
 * - If no user: redirects to /login with `replace` so the back button doesn't loop
 * - If authenticated: renders the nested route via <Outlet />
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Wait for AuthProvider to resolve the session before making any routing decision.
  // Without this, the app would redirect to /login on every refresh even if logged in.
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Outlet renders whichever child route matched like DashboardPage or EventTypesPage
  return <Outlet />;
}
