import api from './axiosInstance';

// Get the logged-in user's weekly availability
export const getAvailability = () => api.get('/api/availability');

// Get a host's availability for the booking page calendar (public)
export const getPublicAvailability = (username) => api.get(`/api/availability/public/${username}`);

// Full replace of weekly availability — sends only enabled days
export const updateAvailability = (slots) => api.put('/api/availability', slots);
