import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { getAvailability, updateAvailability } from '../api/availabilityApi';

// Day definitions — order: Sun, Mon, Tue, Wed, Thu, Fri, Sat (matching DB day_of_week 0–6)
const DAYS = [
  { label: 'Dimanche', value: 0 },
  { label: 'Lundi',    value: 1 },
  { label: 'Mardi',   value: 2 },
  { label: 'Mercredi',value: 3 },
  { label: 'Jeudi',   value: 4 },
  { label: 'Vendredi',value: 5 },
  { label: 'Samedi',  value: 6 },
];

// TimePicker works with Date objects, but the API stores "HH:MM" strings.
// These two helpers convert between the two formats.
const timeStringToDate = (str) => {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0); // Only the time part matters — the date is irrelevant
  return d;
};

const dateToTimeString = (date) => {
  if (!date) return '00:00';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

// Builds the initial state: all 7 days disabled with default 09:00–17:00 times.
// reduce instead of manually wrtiting the 7 days
const defaultDayState = () =>
  DAYS.reduce((acc, day) => {
    acc[day.value] = { enabled: false, start: timeStringToDate('09:00'), end: timeStringToDate('17:00') };
    return acc;
  }, {});

/**
 * Weekly availability editor. Each day has an enable/disable Switch and
 * optional TimePicker pair (24h format). On save, sends only enabled days to the API.
 */
export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState(defaultDayState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [error, setError] = useState('');

  // Load existing availability and pre-fill the form
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getAvailability();
        const newSchedule = defaultDayState();

        // Override defaults only for days the host has configured
        data.forEach(({ day_of_week, start_time, end_time }) => {
          newSchedule[day_of_week] = {
            enabled: true,
            start: timeStringToDate(start_time),
            end: timeStringToDate(end_time),
          };
        });

        setSchedule(newSchedule);
      } catch (err) {
        console.error('Erreur lors du chargement des disponibilités:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Spread operator preserves all other days — only toggles the targeted day
  const toggleDay = (dayValue) => {
    setSchedule((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], enabled: !prev[dayValue].enabled },
    }));
  };

  // [field] is a computed property key — allows updating 'start' or 'end' with one function
  const updateTime = (dayValue, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    // Filter to enabled days only, then convert Date objects back to "HH:MM" strings for the API
    const slots = DAYS
      .filter((day) => schedule[day.value].enabled)
      .map((day) => ({
        day_of_week: day.value,
        start_time: dateToTimeString(schedule[day.value].start),
        end_time: dateToTimeString(schedule[day.value].end),
      }));

    try {
      await updateAvailability(slots); // Backend does DELETE + INSERT (full replace)
      setSnackbar(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h2" gutterBottom>
        Disponibilités
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Définissez votre planning hebdomadaire. Tous les horaires sont en UTC.
      </Typography>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
        {DAYS.map((day, index) => {
          const { enabled, start, end } = schedule[day.value];
          return (
            <Box key={day.value}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 3,
                  py: 2,
                  opacity: enabled ? 1 : 0.5, // Dim the row visually when disabled
                }}
              >
                {/* Day name — fixed width for alignment */}
                <Typography
                  sx={{ fontWeight: 600, minWidth: 100, color: enabled ? 'text.primary' : 'text.secondary' }}
                >
                  {day.label}
                </Typography>

                {/* Toggle switch */}
                <Switch
                  checked={enabled}
                  onChange={() => toggleDay(day.value)}
                  color="primary"
                />

                {/* Time pickers — only shown when day is enabled */}
                {enabled && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <TimePicker
                      value={start}
                      onChange={(val) => updateTime(day.value, 'start', val)}
                      ampm={false} // Forces 24h format — times are stored/displayed in UTC
                      slotProps={{ textField: { size: 'small', sx: { width: 120 } } }}
                    />
                    <Typography color="text.secondary">–</Typography>
                    <TimePicker
                      value={end}
                      onChange={(val) => updateTime(day.value, 'end', val)}
                      ampm={false}
                      slotProps={{ textField: { size: 'small', sx: { width: 120 } } }}
                    />
                  </Box>
                )}
              </Box>

              {/* Divider between rows — not rendered after the last day */}
              {index < DAYS.length - 1 && <Divider />}
            </Box>
          );
        })}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving}
        sx={{ mt: 3, width: { xs: '100%', sm: 'auto' } }}
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>

      {/* Success snackbar — auto-hides after 3 seconds */}
      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="Disponibilités enregistrées !"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
