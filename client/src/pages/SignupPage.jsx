import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Cancel, CalendarMonth } from '@mui/icons-material';
import supabase from '../supabaseClient';
import { createProfile, checkUsername } from '../api/profilesApi';

/**
 * Signup page — creates a Supabase Auth user and an associated profile row.
 * Includes real-time debounced username availability checking (500ms delay).
 * On success, redirects to /dashboard.
 */
export default function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  // useRef so it does not trigger a re-render when updated
  const debounceTimer = useRef(null);

  // Debounced username availability check — fires 500ms after the user stops typing.
  useEffect(() => {
    if (!username) {
      setUsernameStatus(null);
      return;
    }

    setUsernameStatus('checking');
    // Cancel the previous timer before starting a new one
    clearTimeout(debounceTimer.current);

    // Store the new timer ID so it can be cancelled on the next keystroke
    debounceTimer.current = setTimeout(async () => {
      try {
        const { data } = await checkUsername(username);
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);

    // Runs before each re-execution and on unmount — cancels the pending timer
    return () => clearTimeout(debounceTimer.current);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Step 1 — Create Supabase Auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Step 2 — Create profile row linked to the new auth user.
    // Pass the access token directly from the signUp response — avoids a race condition
    // where supabase.auth.getSession() in the interceptor hasn't updated yet.
    const token = authData.session?.access_token;
    try {
      await createProfile({ username, full_name: fullName }, token);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de la création du profil.';
      setError(msg);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/dashboard');
  };

  const usernameEndAdornment = usernameStatus === 'checking' ? (
    <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
  ) : usernameStatus === 'available' ? (
    <InputAdornment position="end"><CheckCircle sx={{ color: 'success.main', fontSize: 20 }} /></InputAdornment>
  ) : usernameStatus === 'taken' ? (
    <InputAdornment position="end"><Cancel sx={{ color: 'error.main', fontSize: 20 }} /></InputAdornment>
  ) : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #EEF2FF 0%, #F9FAFB 55%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      {/* Slotly logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <CalendarMonth sx={{ color: '#0069FF', fontSize: 32 }} />
        <Typography variant="h2" fontWeight={700}>
          Slotly
        </Typography>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h2" gutterBottom>
            Créer votre compte
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              label="Nom complet"
              fullWidth
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Username with real-time availability feedback */}
            <TextField
              label="Nom d'utilisateur"
              fullWidth
              required
              value={username}
              // Force lowercase and strip spaces on every keystroke — /\s/g matches all whitespace
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              InputProps={{ endAdornment: usernameEndAdornment }}
              sx={{ mb: 0.5 }}
            />
            {usernameStatus === 'available' && (
              <Typography variant="body2" sx={{ color: 'success.main', mb: 1.5 }}>
                Nom d'utilisateur disponible
              </Typography>
            )}
            {usernameStatus === 'taken' && (
              <Typography variant="body2" sx={{ color: 'error.main', mb: 1.5 }}>
                Nom d'utilisateur déjà pris
              </Typography>
            )}
            {(usernameStatus === 'checking' || usernameStatus === null) && (
              <Box sx={{ mb: 1.5 }} />
            )}

            <TextField
              label="Adresse e-mail"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Mot de passe"
              type="password"
              fullWidth
              required
              inputProps={{ minLength: 6 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Disabled while loading, or while username is invalid/still being checked */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
              sx={{ mb: 2 }}
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>

            <Typography variant="body2" textAlign="center" color="text.secondary">
              Déjà un compte ?{' '}
              <Link component={RouterLink} to="/login">
                Se connecter
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
