import { Card, CardContent, Box, Typography, Chip, IconButton } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

/**
 * Displays a single event type with its color, title, duration and description.
 * Shows Edit/Delete action buttons when onEdit/onDelete props are provided.
 * When used on the booking page, those props are omitted — the whole card becomes clickable.
 *
 * @param {Object} eventType - The event type data object
 * @param {Function} [onEdit] - Called with eventType when edit icon is clicked
 * @param {Function} [onDelete] - Called with eventType when delete icon is clicked
 * @param {Function} [onClick] - Called with eventType when card body is clicked (booking page)
 */
export default function EventTypeCard({ eventType, onEdit, onDelete, onClick }) {
  const { title, description, duration, color } = eventType;
  // Boolean(onClick) = true if prop was passed, false if omitted — drives dual behaviour
  const isClickable = Boolean(onClick);

  return (
    <Card
      onClick={isClickable ? () => onClick(eventType) : undefined}
      sx={{
        position: 'relative',
        borderLeft: `4px solid ${color}`,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 150ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0px 4px 16px rgba(0,0,0,0.10)',
        },
      }}
    >
      {/* Extra bottom padding reserves space for the absolute-positioned action buttons */}
      <CardContent sx={{ pb: onEdit || onDelete ? '40px !important' : undefined }}>
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>

        {/* `${color}18` appends 18 in hex (≈10% opacity) to the color for a tinted background */}
        <Chip
          label={`${duration} min`}
          size="small"
          sx={{ mb: 1, bgcolor: `${color}18`, color }}
        />

        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </CardContent>

      {/* Action buttons — only shown in the dashboard context */}
      {(onEdit || onDelete) && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
          }}
        >
          {onEdit && (
            <IconButton
              size="small"
              aria-label="Modifier"
              // stopPropagation prevents the card's onClick from also firing
              onClick={(e) => { e.stopPropagation(); onEdit(eventType); }}
              sx={{ color: 'text.secondary' }}
            >
              <Edit fontSize="small" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              size="small"
              aria-label="Supprimer"
              onClick={(e) => { e.stopPropagation(); onDelete(eventType); }}
              sx={{ color: 'error.main' }}
            >
              <Delete fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
    </Card>
  );
}
