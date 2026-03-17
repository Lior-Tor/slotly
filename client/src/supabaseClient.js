import { createClient } from '@supabase/supabase-js';

// Browser client using the Supabase anon (public) key. Not the service role.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default supabase;
