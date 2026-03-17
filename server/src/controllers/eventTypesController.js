import supabase from '../supabaseClient.js';

/**
 * Get active event types for a public username (used on the booking page).
 * Resolves username → user_id, then returns only is_active=true rows.
 *
 * @param {string} req.params.username - The host's username
 * @returns {200} Array of active event type objects
 * @returns {404} If username not found
 */
export const getPublicEventTypes = async (req, res) => {
  const { username } = req.params;

  // Two-step query: username is not stored on event_types, so we first resolve it to a user_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (profileError) return res.status(500).json({ error: profileError.message });
  // 404 here = the booking URL /book/:username points to a non-existent user
  if (!profile) return res.status(404).json({ error: 'User not found' });

  const { data, error } = await supabase
    .from('event_types')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_active', true); // Only expose active types — inactive ones are hidden from guests

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

/**
 * Get all event types (active and inactive) for the authenticated user.
 *
 * @returns {200} Array of event type objects owned by req.user.id
 */
export const getEventTypes = async (req, res) => {
  const { data, error } = await supabase
    .from('event_types')
    .select('*')
    .eq('user_id', req.user.id) // Only return this user's own event types
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

/**
 * Create a new event type for the authenticated user.
 *
 * @param {Object} req.body - { title, description, duration, color }
 * @returns {201} Created event type object
 */
export const createEventType = async (req, res) => {
  const { title, description, duration, color } = req.body;

  const { data, error } = await supabase
    .from('event_types')
    .insert({
      user_id: req.user.id, // Ownership assigned at creation
      title,
      description,
      duration,
      color: color || '#0069FF', // Fallback to brand blue if no color provided
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json(data);
};

/**
 * Update an event type by id.
 * Only allows updating fields owned by the authenticated user (ownership enforced).
 *
 * @param {string} req.params.id - UUID of the event type
 * @param {Object} req.body - Partial event type fields to update
 * @returns {200} Updated event type object
 */
export const updateEventType = async (req, res) => {
  const { id } = req.params;
  const { title, description, duration, color, is_active } = req.body;

  const { data, error } = await supabase
    .from('event_types')
    .update({ title, description, duration, color, is_active })
    .eq('id', id)
    .eq('user_id', req.user.id) // Prevent updating another user's event types
    .select()
    .single(); // .single() returns null in data (not an error) if no row matched both .eq() conditions

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Event type not found' });

  res.json(data);
};

/**
 * Delete an event type by id (ownership enforced).
 * Cascades to associated bookings via DB foreign key.
 *
 * @param {string} req.params.id - UUID of the event type
 * @returns {204} No content
 */
export const deleteEventType = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('event_types')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id); // Ownership check — a user can only delete their own types

  if (error) return res.status(500).json({ error: error.message });

  // 204 No Content — success with no response body (standard for DELETE)
  res.status(204).send();
};
