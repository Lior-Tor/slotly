import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import { keyframes } from '@mui/system';
import { CheckCircleOutline, CalendarMonth } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const popIn = keyframes`
  0%   { transform: scale(0.2); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  80%  { transform: scale(0.92); }
  100% { transform: scale(1); }
`;

/**
 * Confirmation page shown after a successful booking.
 * Reads booking data from React Router location.state.
 * If state is missing (direct URL access), redirects to home immediately.
 */
export default function ConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state;

  // Guard: redirect if accessed directly without booking state
  useEffect(() => {
    if (!state) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  if (!state) return null;

  const { eventTitle, hostFullName, date, startTime, guestName, guestEmail } = state;

  // Format date as "Monday, June 10, 2025"
  const formattedDate = date
    ? format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })
    : '';

  // Format time as "HH:mm UTC" — use UTC methods to avoid local timezone offset
  const formattedTime = startTime
    ? (() => { const d = new Date(startTime); return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`; })()
    : '';

  const details = [
    { label: 'Événement', value: eventTitle },
    { label: 'Avec', value: hostFullName },
    { label: 'Date', value: formattedDate },
    { label: 'Heure', value: formattedTime },
    { label: 'Nom', value: guestName },
    { label: 'E-mail', value: guestEmail },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <CalendarMonth sx={{ color: '#0069FF', fontSize: 28 }} />
        <Typography variant="h3" fontWeight={700}>
          Slotly
        </Typography>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {/* Large success icon — elastic scale-in on mount */}
          <CheckCircleOutline
            sx={{
              fontSize: 72,
              color: '#10B981',
              mb: 2,
              animation: `${popIn} 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
            }}
          />

          <Typography variant="h2" gutterBottom>
            C'est réservé !
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Votre réservation a été confirmée.
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* Booking details list */}
          <Box sx={{ textAlign: 'left' }}>
            {details.map(({ label, value }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  {label}
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ textAlign: 'right' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            fullWidth
          >
            Réserver une autre réunion
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
