import { createContext, useContext, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import supabase from '../supabaseClient';

/**
 * AuthContext exposes the current Supabase session state across the app.
 * Consumed by ProtectedRoute (to guard routes) and Sidebar (to show user email + logout).
 */
const AuthContext = createContext(null);

/**
 * AuthProvider wraps the entire app. It:
 * 1. Fetches the initial session on mount (sets loading=true while fetching)
 * 2. Subscribes to onAuthStateChange so session stays in sync after login/logout
 * 3. Shows a fullscreen spinner while loading to prevent any route from rendering
 *    before the auth state is known
 *
 * @param {React.ReactNode} children
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  // loading=true blocks the entire app from rendering until we know the auth state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Step 1 — Read the session Supabase stored on a previous login.
    // One-time async read; setLoading(false) unblocks the App once resolved.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Step 2 — Permanent listener for future auth events (login, logout, token refresh).
    // getSession() only covers the initial load; this covers everything that happens after.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Step 3 — Unsubscribe on unmount to prevent memory leaks
    return () => subscription.unsubscribe();
  }, []);

  // Block all rendering until the initial session fetch completes
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state from any component inside AuthProvider.
 * Returns { user, session, loading, signOut }.
 * Throws if used outside AuthProvider — prevents silent failures.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
