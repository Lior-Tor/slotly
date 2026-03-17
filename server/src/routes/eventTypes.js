import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getPublicEventTypes,
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
} from '../controllers/eventTypesController.js';

const router = Router();

// IMPORTANT: /public/:username must be declared before /:id
// otherwise Express would match "public" as the :id parameter

// Public — active event types for booking page
router.get('/public/:username', getPublicEventTypes);

// Protected — get all event types for the logged-in user
router.get('/', authMiddleware, getEventTypes);

// Protected — create a new event type
router.post('/', authMiddleware, createEventType);

// Protected — update an event type by id
router.put('/:id', authMiddleware, updateEventType);

// Protected — delete an event type by id
router.delete('/:id', authMiddleware, deleteEventType);

export default router;
