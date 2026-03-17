import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CircularProgress,
  Alert,
  Slide,
  TextField,
  Grid,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { ArrowBack, CalendarMonth } from '@mui/icons-material';
import { format, isBefore, startOfDay, addMonths } from 'date-fns';
import { getPublicEventTypes } from '../api/eventsApi';
import { getPublicAvailability } from '../api/availabilityApi';
import { getSlots, createBooking } from '../api/bookingsApi';
import EventTypeCard from '../components/EventTypeCard';
import TimeSlotPicker from '../components/TimeSlotPicker';

/**
 * Public 4-step booking flow for visitors.
 * Step 1 — Select event type
 * Step 2 — Select a date (calendar with disabled unavailable days)
 * Step 3 — Select a time slot
 * Step 4 — Enter guest info and confirm
 *
 * Animated transitions between steps using MUI Slide.
 * Direction is controlled by "forward" (left) or "backward" (right).
 */
export default function BookingPage() {
  const { username } = useParams(); // comes from the URL: /book/:username
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 | 2 | 3 | 4
  const [direction, setDirection] = useState('forward'); // "forward" | "backward"
  const [slideIn, setSlideIn] = useState(true);

  // Data state (from API)
  const [eventTypes, setEventTypes] = useState([]);
  const [availability, setAvailability] = useState([]); // Array of { day_of_week }
  const [slots, setSlots] = useState([]);

  // Selection state (from user interactions)
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null); // Date object
  const [selectedSlot, setSelectedSlot] = useState(null); // ISO string

  // Guest form state (from step 4 form inputs)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // UI state
  const [loadingEventTypes, setLoadingEventTypes] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Step 1 — Load event types on mount.
  // Each step has its own useEffect so data is fetched only when that step is reached.
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getPublicEventTypes(username);
        setEventTypes(data);
      } catch (err) {
        if (err.response?.status === 404) {
          setPageError("Cet utilisateur n'existe pas.");
        } else {
          setPageError("Une erreur est survenue lors du chargement.");
        }
      } finally {
        setLoadingEventTypes(false);
      }
    };
    load();
  }, [username]);

  // Step 2 — Load availability when entering step 2.
  // Used by shouldDisableDate to grey out days the host hasn't configured.
  useEffect(() => {
    if (step !== 2) return;

    const load = async () => {
      try {
        const { data } = await getPublicAvailability(username);
        setAvailability(data);
      } catch {
        setAvailability([]);
      }
    };
    load();
  }, [step, username]);

  // Step 3 — Load available time slots when entering step 3.
  // date-fns format() converts the Date object to 'yyyy-MM-dd' string for the API query param.
  useEffect(() => {
    if (step !== 3 || !selectedEventType || !selectedDate) return;

    const load = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data } = await getSlots(selectedEventType.id, dateStr);
        setSlots(data);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
  }, [step, selectedEventType, selectedDate]);

  // Handles the animated transition between steps:
  // 1. Set direction and trigger slide-out (slideIn=false)
  // 2. After 250ms (animation duration), change the step and trigger slide-in
  const goToStep = (nextStep, dir) => {
    setDirection(dir);
    setSlideIn(false);
    setTimeout(() => {
      setStep(nextStep);
      setSlideIn(true);
    }, 250);
  };

  const handleSelectEventType = (et) => {
    setSelectedEventType(et);
    goToStep(2, 'forward');
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    goToStep(3, 'forward');
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    goToStep(4, 'forward');
  };

  const handleBack = () => {
    goToStep(step - 1, 'backward');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    setSubmitting(true);

    try {
      await createBooking({
        event_type_id: selectedEventType.id,
        host_user_id: selectedEventType.user_id,
        guest_name: guestName,
        guest_email: guestEmail,
        start_time: selectedSlot,
      });

      // Pass booking details via router state instead of URL params — keeps sensitive
      // data (name, email) out of the browser history
      navigate('/confirmation', {
        state: {
          eventTitle: selectedEventType.title,
          hostFullName: username,
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: selectedSlot,
          guestName,
          guestEmail,
        },
      });
    } catch (err) {
      // 409 = slot was taken by someone else between the time slots loaded and submit.
      // Send user back to step 3 to pick a new slot.
      if (err.response?.status === 409) {
        setBookingError("Ce créneau vient d'être réservé. Veuillez retourner en arrière et en choisir un autre.");
        goToStep(3, 'backward');
      } else {
        setBookingError(err.response?.data?.error || "Une erreur est survenue lors de la réservation.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Called by DateCalendar for every visible date cell — returns true to grey out the date.
  // Two conditions disable a date: it's in the past, or the host has no availability that weekday.
  const shouldDisableDate = (date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;
    // date.getDay() returns 0 (Sun) to 6 (Sat) — same encoding as day_of_week in the DB
    const dow = date.getDay();
    // some() = true if the host has this weekday configured. ! inverts it.
    return !availability.some((a) => a.day_of_week === dow);
  };

  // Slide direction: moving forward = new content enters from the right (direction='left')
  //                  going back     = new content enters from the left  (direction='right')
  const slideDirection = direction === 'forward' ? 'left' : 'right';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F3F4F6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2,
        py: 4,
      }}
    >
      {/* Slotly logo — outside the card */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, alignSelf: 'flex-start', ml: { xs: 0, md: '10%' } }}>
        <CalendarMonth sx={{ color: '#0069FF', fontSize: 24 }} />
        <Typography variant="h3" fontWeight={700}>
          Slotly
        </Typography>
      </Box>

      {/* Main booking card */}
      <Card
        sx={{
          width: '100%',
          maxWidth: 860,
          borderRadius: '16px',
          boxShadow: '0px 4px 24px rgba(0,0,0,0.08)',
          p: { xs: '20px', sm: '40px' },
          overflow: 'hidden',
          position: 'relative',
          minHeight: 400,
        }}
      >
        {/* Step indicator */}
        {!pageError && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Étape {step} sur 4
          </Typography>
        )}

        {/* Back button — shown on steps 2, 3, 4 */}
        {step > 1 && !pageError && (
          <Button
            variant="text"
            startIcon={<ArrowBack />}
            onClick={handleBack}
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            Retour
          </Button>
        )}

        {/* Page-level error (unknown user) */}
        {pageError && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">{pageError}</Typography>
          </Box>
        )}

        {/* Animated step content.
            mountOnEnter/unmountOnExit ensure only the active step exists in the DOM. */}
        {!pageError && (
          <Slide direction={slideDirection} in={slideIn} timeout={250} mountOnEnter unmountOnExit>
            <Box>
              {/* Step 1 — Select event type */}
              {step === 1 && (
                <Box>
                  <Typography variant="h2" gutterBottom>
                    Choisissez un type de réunion
                  </Typography>

                  {loadingEventTypes ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : eventTypes.length === 0 ? (
                    <Typography color="text.secondary">
                      Ce calendrier n'a aucun type de réunion disponible.
                    </Typography>
                  ) : (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {eventTypes.map((et) => (
                        <Grid item xs={12} sm={6} key={et.id}>
                          {/* onClick only — no onEdit/onDelete — makes the full card clickable */}
                          <EventTypeCard eventType={et} onClick={handleSelectEventType} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {/* Step 2 — Select a date */}
              {step === 2 && (
                <Box>
                  <Typography variant="h2" gutterBottom>
                    Choisissez une date
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <DateCalendar
                      onChange={handleSelectDate}
                      shouldDisableDate={shouldDisableDate}
                      disablePast
                      maxDate={addMonths(new Date(), 2)}
                    />
                  </Box>
                </Box>
              )}

              {/* Step 3 — Select a time slot */}
              {step === 3 && (
                <Box>
                  <Typography variant="h2" gutterBottom>
                    Choisissez un créneau
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy')}
                  </Typography>

                  {loadingSlots ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <TimeSlotPicker slots={slots} onSelect={handleSelectSlot} />
                  )}
                </Box>
              )}

              {/* Step 4 — Guest information form */}
              {step === 4 && (
                <Box>
                  <Typography variant="h2" gutterBottom>
                    Confirmez votre réservation
                  </Typography>

                  {/* Booking summary */}
                  <Box
                    sx={{
                      bgcolor: 'primary.light',
                      borderRadius: 2,
                      p: 2,
                      mb: 3,
                    }}
                  >
                    <Typography variant="body1" fontWeight={600}>
                      {selectedEventType?.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy')} à{' '}
                      {/* getUTCHours/Minutes used here to display the slot in UTC, not local time */}
                      {selectedSlot && (() => { const d = new Date(selectedSlot); return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`; })()} UTC
                    </Typography>
                  </Box>

                  <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Votre nom"
                      required
                      fullWidth
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                    <TextField
                      label="Votre e-mail"
                      type="email"
                      required
                      fullWidth
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />

                    {bookingError && (
                      <Alert severity="error">{bookingError}</Alert>
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={submitting}
                      sx={{ py: 1.5 }}
                    >
                      {submitting ? 'Réservation en cours...' : 'Confirmer la réservation'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Slide>
        )}
      </Card>

      {/* Footer */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Propulsé par Slotly
      </Typography>
    </Box>
  );
}
