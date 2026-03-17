import { Grid, Button, Typography, Box } from '@mui/material';

// getUTCHours/Minutes used deliberately — slots are UTC ISO strings and must
// be displayed in UTC, not converted to the user's local timezone
const formatUTCTime = (isoString) => {
  const d = new Date(isoString);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/**
 * Renders a responsive grid of available time slot buttons.
 * Each button shows the time formatted as HH:mm.
 *
 * @param {string[]} slots - Array of ISO UTC strings representing slot start times
 * @param {Function} onSelect - Called with the selected ISO UTC string
 */
export default function TimeSlotPicker({ slots, onSelect }) {
  if (slots.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Aucun créneau disponible pour ce jour.
        </Typography>
      </Box>
    );
  }

  return (
    // xs=6 (2 per row), sm=4 (3 per row), md=3 (4 per row)
    <Grid container spacing={1.5}>
      {slots.map((slot) => (
        <Grid item xs={6} sm={4} md={3} key={slot}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onSelect(slot)}
            sx={{
              borderColor: '#E5E7EB',
              color: 'text.primary',
              fontWeight: 500,
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.light',
                color: 'primary.main',
              },
            }}
          >
            {formatUTCTime(slot)}
          </Button>
        </Grid>
      ))}
    </Grid>
  );
}
