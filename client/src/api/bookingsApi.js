import api from './axiosInstance';

// Get available time slots for an event type on a given date (public)
export const getSlots = (eventTypeId, date) =>
  api.get('/api/bookings/slots', { params: { event_type_id: eventTypeId, date } });

// Get all bookings for the logged-in host
export const getBookings = () => api.get('/api/bookings');

// Create a new booking (public — guests have no account)
export const createBooking = (data) => api.post('/api/bookings', data);

// Cancel a booking by id (host only)
export const cancelBooking = (id) => api.patch(`/api/bookings/${id}/cancel`);
