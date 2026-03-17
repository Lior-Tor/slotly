import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getSlots,
  getBookings,
  createBooking,
  cancelBooking,
} from '../controllers/bookingsController.js';

const router = Router();

// IMPORTANT: /slots must be declared before /:id

// Public — available time slots for a given event type and date
router.get('/slots', getSlots);

// Protected — all bookings for the logged-in host
router.get('/', authMiddleware, getBookings);

// Public — create a new booking (guests have no account)
router.post('/', createBooking);

// Protected — cancel a booking by id
router.patch('/:id/cancel', authMiddleware, cancelBooking);

export default router;
