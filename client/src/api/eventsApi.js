import api from './axiosInstance';

// Get all event types for the logged-in user
export const getEventTypes = () => api.get('/api/event-types');

// Get active event types for a public booking page
export const getPublicEventTypes = (username) => api.get(`/api/event-types/public/${username}`);

// Create a new event type
export const createEventType = (data) => api.post('/api/event-types', data);

// Update an existing event type
export const updateEventType = (id, data) => api.put(`/api/event-types/${id}`, data);

// Delete an event type by id
export const deleteEventType = (id) => api.delete(`/api/event-types/${id}`);
