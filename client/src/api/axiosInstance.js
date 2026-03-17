import axios from 'axios';
import supabase from '../supabaseClient';

// Base axios instance pointing at the Express API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

/**
 * Request interceptor — automatically injects the current Supabase JWT
 * into every outgoing request. This means individual API files never need
 * to handle token retrieval manually.
 */
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // authMiddleware on the server reads this header to verify the user
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  // Must return config — Axios uses the returned object as the final request config
  return config;
});

export default api;
