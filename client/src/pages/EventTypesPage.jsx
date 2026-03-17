import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add, Check, EventNote } from '@mui/icons-material';
import EventTypeCard from '../components/EventTypeCard';
import {
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
} from '../api/eventsApi';

// Defined outside the component — constants that never change don't need to live inside
const PRESET_COLORS = ['#0069FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const DURATION_OPTIONS = [15, 30, 45, 60, 90];

const EMPTY_FORM = { title: '', description: '', duration: 30, color: '#0069FF' };

/**
 * Event types management page — CRUD with create/edit dialog and delete confirmation.
 */
export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // selectedEvent drives the form dialog: null = create mode, object = edit mode
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Defined as a named function (not inline) so it can be called after create/edit/delete
  const load = async () => {
    try {
      const { data } = await getEventTypes();
      setEventTypes(data);
    } catch (err) {
      console.error('Erreur lors du chargement des types d\'événements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Open create dialog — reset form and clear selectedEvent to signal create mode
  const handleCreate = () => {
    setSelectedEvent(null);
    setForm(EMPTY_FORM);
    setError('');
    setFormOpen(true);
  };

  // Open edit dialog pre-filled with existing values
  const handleEdit = (eventType) => {
    setSelectedEvent(eventType);
    setForm({
      title: eventType.title,
      description: eventType.description || '',
      duration: eventType.duration,
      color: eventType.color,
    });
    setError('');
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (eventType) => {
    setToDelete(eventType);
    setDeleteOpen(true);
  };

  // Single save handler for both create and edit — selectedEvent determines which API call
  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');

    try {
      if (selectedEvent) {
        await updateEventType(selectedEvent.id, form);
      } else {
        await createEventType(form);
      }
      setFormOpen(false);
      await load(); // Refresh list after save
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // Confirm deletion
  const handleDeleteConfirm = async () => {
    try {
      await deleteEventType(toDelete.id);
      setDeleteOpen(false);
      await load();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Types d'événements</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Nouveau type
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : eventTypes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <EventNote sx={{ fontSize: 56, mb: 1, opacity: 0.4 }} />
          <Typography gutterBottom>Aucun type d'événement pour le moment.</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreate} sx={{ mt: 1 }}>
            Nouveau type
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {eventTypes.map((et) => (
            <Grid item xs={12} sm={6} md={4} key={et.id}>
              {/* onEdit/onDelete passed — no onClick — card shows action buttons, not clickable */}
              <EventTypeCard
                eventType={et}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create / Edit Dialog — title and save behaviour adapt based on selectedEvent */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEvent ? 'Modifier le type d\'événement' : 'Nouveau type d\'événement'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Titre"
              required
              fullWidth
              value={form.title}
              // Spread keeps other form fields unchanged — only updates the target field
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Durée</InputLabel>
              <Select
                label="Durée"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              >
                {DURATION_OPTIONS.map((d) => (
                  <MenuItem key={d} value={d}>{d} min</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Color selector — 6 preset circles with checkmark for selected */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Couleur
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {PRESET_COLORS.map((color) => (
                  <IconButton
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: color,
                      '&:hover': { bgcolor: color, opacity: 0.85 },
                    }}
                  >
                    {/* Checkmark only shown on the currently selected color */}
                    {form.color === color && (
                      <Check sx={{ color: '#fff', fontSize: 16 }} />
                    )}
                  </IconButton>
                ))}
              </Box>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Supprimer le type d'événement ?</DialogTitle>
        <DialogContent>
          <Typography>
            {/* toDelete?.title — safe access in case dialog renders before state is set */}
            Cela supprimera définitivement «{toDelete?.title}». Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
