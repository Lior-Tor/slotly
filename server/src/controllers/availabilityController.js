import supabase from '../supabaseClient.js';

/**
 * Get availability for a public username (used on booking page calendar).
 * Resolves username → user_id, then returns availability rows.
 *
 * @param {string} req.params.username - The host's username
 * @returns {200} Array of availability rows { day_of_week, start_time, end_time }
 * @returns {404} If username not found
 */
export const getPublicAvailability = async (req, res) => {
  const { username } = req.params;

  // Same two-step pattern as getPublicEventTypes — username lives in profiles, not availability
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (profileError) return res.status(500).json({ error: profileError.message });
  if (!profile) return res.status(404).json({ error: 'User not found' });

  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('user_id', profile.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

/**
 * Get the authenticated user's weekly availability.
 *
 * @returns {200} Array of availability rows for req.user.id
 */
export const getAvailability = async (req, res) => {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('user_id', req.user.id)
    .order('day_of_week', { ascending: true }); // Returns Sun→Sat order (0 to 6)

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

/**
 * Full replace of the authenticated user's weekly availability.
 * Deletes all existing rows, then inserts the new array.
 * Only enabled days should be sent — omitted days mean "not available".
 *
 * @param {Array} req.body - [{ day_of_week, start_time, end_time }, ...]
 * @returns {200} Newly inserted availability rows
 */
export const replaceAvailability = async (req, res) => {
  // req.body is the array of enabled days sent by AvailabilityPage on save
  const slots = req.body;
  const userId = req.user.id;

  // DELETE + INSERT strategy
  // Wipe everything for this user, then re-insert only the enabled days.
  const { error: deleteError } = await supabase
    .from('availability')
    .delete()
    .eq('user_id', userId);

  if (deleteError) return res.status(500).json({ error: deleteError.message });

  // If the array is empty (all days disabled), return empty result
  if (!slots || slots.length === 0) {
    return res.json([]);
  }

  // Attach user_id to each row — the client only sends day_of_week/start_time/end_time
  const rows = slots.map(({ day_of_week, start_time, end_time }) => ({
    user_id: userId,
    day_of_week,
    start_time,
    end_time,
  }));

  const { data, error } = await supabase
    .from('availability')
    .insert(rows) // Bulk insert — one query for all enabled days
    .select();

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};
