import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getPublicAvailability,
  getAvailability,
  replaceAvailability,
} from '../controllers/availabilityController.js';

const router = Router();

// IMPORTANT: /public/:username must be declared before any /:id route

// Public — availability for booking page calendar
router.get('/public/:username', getPublicAvailability);

// Protected — get the logged-in user's availability
router.get('/', authMiddleware, getAvailability);

// Protected — full replace of weekly availability
router.put('/', authMiddleware, replaceAvailability);

export default router;
