import supabase from '../supabaseClient.js';

/**
 * Create a new profile row after Supabase Auth signup.
 * The user's id comes from the validated JWT (req.user.id).
 *
 * @param {Object} req.body - { username: string, full_name: string }
 * @returns {201} Created profile object
 * @returns {409} If the username is already taken
 */
export const createProfile = async (req, res) => {
  const { username, full_name } = req.body;
  // req.user.id was set by authMiddleware — it's the Supabase Auth UUID
  // and must match the profile id (FK to auth.users)
  const id = req.user.id;

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id, username, full_name })
    .select()
    .single();

  if (error) {
    // PostgreSQL error code 23505 = unique constraint violation
    // Triggered when another profile already holds this username
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
};

/**
 * Get the authenticated user's own profile.
 *
 * @returns {200} Profile object for req.user.id
 * @returns {404} If profile row doesn't exist yet
 */
export const getProfile = async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Profile not found' });

  res.json(data);
};

/**
 * Update the authenticated user's profile (full_name and/or username).
 * If username changes, checks uniqueness before updating.
 *
 * @param {Object} req.body - { full_name?: string, username?: string }
 * @returns {200} Updated profile object
 * @returns {409} If the new username is already taken by someone else
 */
export const updateProfile = async (req, res) => {
  const { full_name, username } = req.body;

  // If username is being changed, check it isn't taken by another user
  if (username) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', req.user.id) // Excludes the current user username
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name, username })
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

/**
 * Check if a username is available (no account holds it yet).
 * Used for real-time validation on the signup form.
 *
 * @param {string} req.params.username - The username to check
 * @returns {200} { available: boolean }
 */
export const checkUsername = async (req, res) => {
  const { username } = req.params; // from the URL: GET /api/profiles/check-username/:username

  const { data, error } = await supabase
    .from('profiles')
    .select('id') // only fetch id — no need for the full row just to check existence
    .eq('username', username)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // data === null means no profile holds this username → it's available
  res.json({ available: data === null });
};
