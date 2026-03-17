import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  Fade,
  CircularProgress,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  EventNote,
  ContentCopy,
  Link as LinkIcon,
  Cancel,
  ArrowUpward,
  ArrowDownward,
  Search,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getBookings, cancelBooking } from '../api/bookingsApi';
import { getEventTypes } from '../api/eventsApi';
import { getProfile } from '../api/profilesApi';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook — counts from 0 up to `target` over ~600ms when target changes.
 * Uses setInterval at 20ms intervals, incrementing by target/30 each tick.
 * useRef stores the interval ID without triggering re-renders.
 */
function useCountUp(target) {
  const [value, setValue] = useState(0);
  const timer = useRef(null);
  useEffect(() => {
    clearInterval(timer.current);
    if (target === 0) { setValue(0); return; }
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 30)); // Reaches target in ~30 steps
    timer.current = setInterval(() => {
      current = Math.min(current + increment, target); // Math.min prevents overshooting
      setValue(current);
      if (current >= target) clearInterval(timer.current);
    }, 20);
    return () => clearInterval(timer.current); // Cleanup on unmount or target change
  }, [target]);
  return value;
}

/** Format an ISO string as HH:MM using UTC hours/minutes. */
const formatUTC = (iso) => {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/**
 * Main dashboard — stats, public link, bookings table with tabs/search/sort.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [eventTypesCount, setEventTypesCount] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // Booking object to cancel, or null
  const [cancelling, setCancelling] = useState(false);

  // Table controls
  const [tab, setTab] = useState(0); // 0 = upcoming, 1 = past
  const [search, setSearch] = useState('');
  const [searchEventType, setSearchEventType] = useState('');
  const [sortField, setSortField] = useState('start_time');
  const [sortDir, setSortDir] = useState('asc'); // upcoming sorted soonest first

  const now = new Date();
  // Upcoming = confirmed bookings with a future start_time
  const upcomingCount = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.start_time) > now
  ).length;

  // Each stat card gets its own animated counter
  const animatedEventCount = useCountUp(eventTypesCount);
  const animatedBookingCount = useCountUp(bookings.length);
  const animatedUpcomingCount = useCountUp(upcomingCount);

  // Promise.all fires all three requests in parallel — faster than sequential awaits
  const load = async () => {
    try {
      const [bookingsRes, eventTypesRes, profileRes] = await Promise.all([
        getBookings(),
        getEventTypes(),
        getProfile(),
      ]);
      setBookings(bookingsRes.data);
      setEventTypesCount(eventTypesRes.data.length);
      setProfile(profileRes.data);
    } catch (err) {
      console.error('Erreur lors du chargement du tableau de bord:', err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, [user.id]);

  // Built from window.location.origin so it works on both localhost and production
  const publicUrl = profile
    ? `${window.location.origin}/book/${profile.username}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopySnackbar(true);
  };

  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      await cancelBooking(cancelTarget.id);
      setCancelTarget(null);
      await load(); // Refresh table after cancellation
    } catch (err) {
      console.error('Erreur lors de l\'annulation:', err);
    } finally {
      setCancelling(false);
    }
  };

  // Tab filtering: upcoming = future confirmed, past = everything else (cancelled or past)
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.start_time) > now
  );
  const pastBookings = bookings.filter(
    (b) => !(b.status === 'confirmed' && new Date(b.start_time) > now)
  );
  const tabBookings = tab === 0 ? upcomingBookings : pastBookings;

  // Search filters by guest name/email and/or event type title — case-insensitive
  const searchedBookings = tabBookings.filter((b) => {
    const matchesGuest = !search ||
      b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      b.guest_email.toLowerCase().includes(search.toLowerCase());
    const matchesEventType = !searchEventType ||
      (b.event_types?.title || '').toLowerCase().includes(searchEventType.toLowerCase());
    return matchesGuest && matchesEventType;
  });

  // Spread into a new array before sorting — sort() mutates in place
  const sortedBookings = [...searchedBookings].sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'start_time') {
      aVal = new Date(a.start_time);
      bVal = new Date(b.start_time);
    } else if (sortField === 'event_type') {
      aVal = (a.event_types?.title || '').toLowerCase();
      bVal = (b.event_types?.title || '').toLowerCase();
    } else if (sortField === 'guest_name') {
      aVal = a.guest_name.toLowerCase();
      bVal = b.guest_name.toLowerCase();
    } else {
      aVal = a[sortField];
      bVal = b[sortField];
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Toggle direction if clicking the same column, reset to asc for a new column
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Returns null for inactive columns — only renders an icon for the active sort column
  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ArrowUpward sx={{ fontSize: 13, ml: 0.5, verticalAlign: 'middle' }} />
      : <ArrowDownward sx={{ fontSize: 13, ml: 0.5, verticalAlign: 'middle' }} />;
  };

  const sortableCell = (label, field) => (
    <TableCell
      onClick={() => handleSort(field)}
      sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
        <strong>{label}</strong>
        <SortIcon field={field} />
      </Box>
    </TableCell>
  );

  return (
    <Box>
      {/* Page header */}
      <Typography variant="h2" gutterBottom>
        Tableau de bord
      </Typography>
      {/* profile?.full_name — safe access while profile is still loading */}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Bienvenue, {profile?.full_name || user.email}
      </Typography>

      <Box>
        {/* Stats + public link row — each card Fades in with a staggered delay */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Fade in={loaded} timeout={400}>
              <Card>
                <CardContent>
                  <Typography variant="h1" color="primary" fontWeight={700}>
                    {animatedEventCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Types d'événements
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            {/* transitionDelay staggers each card's entrance — 0ms when not loaded to skip */}
            <Fade in={loaded} timeout={400} style={{ transitionDelay: loaded ? '100ms' : '0ms' }}>
              <Card>
                <CardContent>
                  <Typography variant="h1" color="primary" fontWeight={700}>
                    {animatedBookingCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total des réservations
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Fade in={loaded} timeout={400} style={{ transitionDelay: loaded ? '200ms' : '0ms' }}>
              <Card>
                <CardContent>
                  <Typography variant="h1" sx={{ color: 'success.main' }} fontWeight={700}>
                    {animatedUpcomingCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Réservations à venir
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          {/* Public booking link card */}
          <Grid item xs={12} sm={6} md={3}>
            <Fade in={loaded} timeout={400} style={{ transitionDelay: loaded ? '300ms' : '0ms' }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={600}>
                      Votre lien de réservation
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  >
                    {publicUrl || '…'}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={handleCopyLink}
                    disabled={!publicUrl}
                    sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                  >
                    Copier le lien
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        </Grid>

        {/* Bookings table section */}
        <Fade in={loaded} timeout={400} style={{ transitionDelay: loaded ? '400ms' : '0ms' }}>
          <Box>
            <Typography variant="h3" gutterBottom>
              Réservations
            </Typography>

            {!loaded ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Tab switch resets search and sets appropriate default sort direction */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                  <Tabs
                    value={tab}
                    onChange={(_, v) => { setTab(v); setSearch(''); setSearchEventType(''); setSortField('start_time'); setSortDir(v === 0 ? 'asc' : 'desc'); }}
                    sx={{ minHeight: 40 }}
                  >
                    <Tab
                      label={`À venir (${upcomingBookings.length})`}
                      sx={{ minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 500 }}
                    />
                    <Tab
                      label={`Passées (${pastBookings.length})`}
                      sx={{ minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 500 }}
                    />
                  </Tabs>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Rechercher un type d'évènement…"
                      value={searchEventType}
                      onChange={(e) => setSearchEventType(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ width: 240 }}
                    />
                    <TextField
                      size="small"
                      placeholder="Rechercher un invité…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ width: 240 }}
                    />
                  </Box>
                </Box>

                {sortedBookings.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <EventNote sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                    <Typography>
                      {search ? 'Aucun résultat pour cette recherche.' : 'Aucune réservation pour le moment.'}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          {sortableCell('Date & Heure', 'start_time')}
                          {sortableCell('Type d\'événement', 'event_type')}
                          {sortableCell('Invité', 'guest_name')}
                          <TableCell><strong>E-mail</strong></TableCell>
                          <TableCell><strong>Statut</strong></TableCell>
                          <TableCell><strong>Action</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedBookings.map((booking) => {
                          const isPast = new Date(booking.start_time) <= now;
                          return (
                          <TableRow key={booking.id} hover>
                            {/* Date + heure début → fin */}
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2">
                                {format(new Date(booking.start_time), 'dd MMM yyyy', { locale: fr })}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatUTC(booking.start_time)} → {formatUTC(booking.end_time)} UTC
                                {/* duration comes from the FK join in getBookings */}
                                {booking.event_types?.duration && (
                                  <Box component="span" sx={{ ml: 0.5, color: 'text.disabled' }}>
                                    ({booking.event_types.duration} min)
                                  </Box>
                                )}
                              </Typography>
                            </TableCell>

                            {/* Event type with colored dot */}
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {booking.event_types?.color && (
                                  <Box
                                    sx={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%', // Makes the Box a circle
                                      bgcolor: booking.event_types.color,
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                {booking.event_types?.title}
                              </Box>
                            </TableCell>

                            <TableCell>{booking.guest_name}</TableCell>
                            <TableCell>{booking.guest_email}</TableCell>
                            <TableCell>
                              <Chip
                                label={booking.status === 'cancelled' ? 'Annulé' : isPast ? 'Passé' : 'Confirmé'}
                                color={booking.status === 'cancelled' ? 'default' : isPast ? 'default' : 'success'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {/* Cancel button only shown for upcoming confirmed bookings */}
                              {booking.status === 'confirmed' && !isPast && (
                                <Tooltip title="Annuler cette réservation">
                                  <IconButton
                                    size="small"
                                    onClick={() => setCancelTarget(booking)}
                                    sx={{ color: 'error.main' }}
                                  >
                                    <Cancel fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </Box>
        </Fade>
      </Box>

      {/* Cancel confirmation dialog — Boolean(cancelTarget) opens when a booking is targeted */}
      <Dialog open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)}>
        <DialogTitle>Annuler cette réservation ?</DialogTitle>
        <DialogContent>
          <Typography>
            Voulez-vous annuler la réservation de <strong>{cancelTarget?.guest_name}</strong> pour{' '}
            <strong>{cancelTarget?.event_types?.title}</strong> ? Cette action ne peut pas être annulée.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelTarget(null)}>Retour</Button>
          <Button variant="contained" color="error" onClick={handleCancelConfirm} disabled={cancelling}>
            {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy link success snackbar */}
      <Snackbar
        open={copySnackbar}
        autoHideDuration={3000}
        onClose={() => setCopySnackbar(false)}
        message="Lien copié dans le presse-papiers !"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
