import api from './axiosInstance';

// Create a profile row after Supabase Auth signup.
// Accepts an optional token to bypass the interceptor's getSession() race condition —
// signUp returns a session before it's propagated to supabase.auth.getSession().
export const createProfile = (data, token) => {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  return api.post('/api/profiles', data, config);
};

// Check username availability (public — no auth needed)
export const checkUsername = (username) => api.get(`/api/profiles/check-username/${username}`);

// Get the logged-in user's profile
export const getProfile = () => api.get('/api/profiles/me');

// Update the logged-in user's profile
export const updateProfile = (data) => api.put('/api/profiles/me', data);
