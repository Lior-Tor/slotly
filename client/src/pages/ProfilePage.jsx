import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { getProfile, updateProfile, checkUsername } from '../api/profilesApi';
import { useAuth } from '../context/AuthContext';

/**
 * Profile page — lets the host edit their full name and username.
 * Username field includes real-time availability check (same as signup),
 * but skips the check when the value hasn't changed from the current username.
 */
export default function ProfilePage() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  // Tracks the saved username — used to skip the availability check when unchanged
  const [originalUsername, setOriginalUsername] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const debounceTimer = useRef(null);

  // Load current profile on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getProfile();
        setFullName(data.full_name);
        setUsername(data.username);
        setOriginalUsername(data.username); // Save baseline for comparison
      } catch (err) {
        setError('Impossible de charger le profil.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Debounced username check — skipped entirely if value matches the saved username.
  // Without this skip, the user's own username would always appear as "taken".
  useEffect(() => {
    if (!username || username === originalUsername) {
      setUsernameStatus(null);
      return;
    }

    setUsernameStatus('checking');
    clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const { data } = await checkUsername(username);
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);

    return () => clearTimeout(debounceTimer.current);
  }, [username, originalUsername]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await updateProfile({ full_name: fullName, username });
      // Update baseline so the check resets — typing the same username again shows no indicator
      setOriginalUsername(username);
      setUsernameStatus(null);
      setSnackbar(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const usernameEndAdornment = usernameStatus === 'checking' ? (
    <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
  ) : usernameStatus === 'available' ? (
    <InputAdornment position="end"><CheckCircle sx={{ color: 'success.main', fontSize: 20 }} /></InputAdornment>
  ) : usernameStatus === 'taken' ? (
    <InputAdornment position="end"><Cancel sx={{ color: 'error.main', fontSize: 20 }} /></InputAdornment>
  ) : null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h2" gutterBottom>
        Profil
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Modifiez vos informations personnelles.
      </Typography>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Email comes from Supabase Auth — not editable here */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Adresse e-mail
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            {user.email}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom complet"
              required
              fullWidth
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Box>
              <TextField
                label="Nom d'utilisateur"
                required
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                InputProps={{ endAdornment: usernameEndAdornment }}
                sx={{ mb: 0.5 }}
              />
              {usernameStatus === 'available' && (
                <Typography variant="body2" sx={{ color: 'success.main' }}>
                  Nom d'utilisateur disponible
                </Typography>
              )}
              {usernameStatus === 'taken' && (
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  Nom d'utilisateur déjà pris
                </Typography>
              )}
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
              sx={{ alignSelf: 'flex-start' }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="Profil mis à jour !"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
