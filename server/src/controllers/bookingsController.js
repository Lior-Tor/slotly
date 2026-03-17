import supabase from '../supabaseClient.js';

/**
 * Generate available time slots for an event type on a given date.
 * Algorithm (all times in UTC):
 *
 * 1. Fetch event_type by id — return 404 if not found or inactive
 * 2. Get duration (minutes) and host_user_id from event_type
 * 3. Parse date string → compute day_of_week (0=Sun … 6=Sat)
 * 4. Fetch availability row for (host_user_id, day_of_week) — return [] if none
 * 5. Generate all candidate slots from start_time to end_time (step = duration)
 *    A slot is valid only if slot_start + duration <= availability.end_time
 * 6. Fetch all confirmed bookings for that host on that date
 * 7. Filter out candidates that overlap any existing booking
 *    Overlap: candidate_start < booking.end_time AND candidate_end > booking.start_time
 * 8. Return remaining slots as ISO 8601 UTC strings
 *
 * @param {string} req.query.event_type_id - UUID of the event type
 * @param {string} req.query.date - Date string in YYYY-MM-DD format (UTC)
 * @returns {200} Array of ISO UTC strings representing available slot start times
 */
export const getSlots = async (req, res) => {
  // req.query holds URL parameters: /api/bookings/slots?event_type_id=...&date=...
  const { event_type_id, date } = req.query;

  if (!event_type_id || !date) {
    return res.status(400).json({ error: 'event_type_id and date are required' });
  }

  // Step 1 — Fetch event type
  // .maybeSingle() returns null instead of error when no row is found
  const { data: eventType, error: eventError } = await supabase
    .from('event_types')
    .select('*')
    .eq('id', event_type_id)
    .maybeSingle();

  // return stops execution — prevents sending a second response further down
  if (eventError) return res.status(500).json({ error: eventError.message });
  if (!eventType || !eventType.is_active) {
    return res.status(404).json({ error: 'Event type not found' });
  }

  // Step 2 — Extract duration and host id
  const { duration, user_id: hostUserId } = eventType;

  // Step 3 — Parse date and compute day_of_week (0=Sun, 6=Sat)
  // Append T00:00:00.000Z to force UTC midnight — avoids local timezone offset
  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = dateObj.getUTCDay();

  // Step 4 — Fetch host availability for that weekday
  const { data: avail, error: availError } = await supabase
    .from('availability')
    .select('*')
    .eq('user_id', hostUserId)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle();

  if (availError) return res.status(500).json({ error: availError.message });
  if (!avail) return res.json([]); // Host not available on this day

  // Step 5 — Generate candidate slots
  // Convert "HH:MM" strings to total minutes since midnight for arithmetic
  // e.g. "09:00" → 9*60+0 = 540
  //      "17:00" → 17*60+0 = 1020
  const [startHour, startMin] = avail.start_time.split(':').map(Number);
  const [endHour, endMin] = avail.end_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const candidates = []; // Each entry: { start: Date, end: Date }

  // Step by duration each iteration — ensures no slot runs past the availability window
  // e.g. 30min event, 09:00–17:00 → 540, 570, 600 … 990 (min=990+30=1020 → stops)
  for (let min = startMinutes; min + duration <= endMinutes; min += duration) {
    const slotStart = new Date(`${date}T00:00:00.000Z`);
    // setUTCHours(0, min, 0, 0) sets hours=0, minutes=min, seconds=0, ms=0
    slotStart.setUTCHours(0, min, 0, 0);

    // duration * 60 * 1000 converts minutes → milliseconds for Date arithmetic
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

    candidates.push({ start: slotStart, end: slotEnd });
  }

  // Step 6 — Fetch existing confirmed bookings for this host on this date
  // e.g. date="2025-05-01" → dayStart="2025-05-01T00:00:00.000Z", dayEnd="2025-05-02T00:00:00.000Z"
  const dayStart = `${date}T00:00:00.000Z`;
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const dayEnd = nextDate.toISOString();

  const { data: existingBookings, error: bookingError } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('host_user_id', hostUserId)
    .eq('status', 'confirmed')
    .gte('start_time', dayStart) // gte = greater than or equal
    .lt('start_time', dayEnd);   // lt  = less than (strict)

  if (bookingError) return res.status(500).json({ error: bookingError.message });

  // Step 7 — Filter out candidates that overlap any confirmed booking.
  // Two ranges overlap when: A starts before B ends AND A ends after B starts.
  // Keeping a slot means no existing booking overlaps it — hence the ! and some().
  const available = candidates.filter(({ start, end }) => {
    return !existingBookings.some((booking) => {
      const bStart = new Date(booking.start_time);
      const bEnd = new Date(booking.end_time);
      // Overlap condition: candidate_start < booking_end AND candidate_end > booking_start
      return start < bEnd && end > bStart;
    });
  });

  // Step 8 — Return available slots as ISO UTC strings
  res.json(available.map(({ start }) => start.toISOString()));
};

/**
 * Cancel a booking by setting its status to 'cancelled'.
 * Ownership is enforced — only the host can cancel their own bookings.
 *
 * @param {string} req.params.id - UUID of the booking
 * @returns {200} Updated booking object
 * @returns {404} If booking not found or not owned by the requester
 */
export const cancelBooking = async (req, res) => {
  const { id } = req.params; // from the URL: PATCH /api/bookings/:id/cancel

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('host_user_id', req.user.id) // Prevent cancelling another host's booking
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Booking not found' });

  res.json(data);
};

/**
 * Get all bookings for the authenticated host (past and upcoming).
 * Sorted by start_time DESC. Includes event type title via join.
 *
 * @returns {200} Array of booking objects with event_types.title
 */
export const getBookings = async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    // FK join: event_types(title, color, duration) fetches those fields from the related table (event_types)
    .select('*, event_types(title, color, duration)')
    .eq('host_user_id', req.user.id)
    .order('start_time', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

/**
 * Create a new booking (public endpoint — no auth required).
 * Computes end_time server-side from event type duration.
 * Checks for overlap with existing confirmed bookings before inserting.
 *
 * @param {Object} req.body - { event_type_id, host_user_id, guest_name, guest_email, start_time }
 * @returns {201} Created booking object
 * @returns {409} If the slot overlaps an existing confirmed booking
 */
export const createBooking = async (req, res) => {
  const { event_type_id, host_user_id, guest_name, guest_email, start_time } = req.body;

  // Fetch event type to get duration for end_time computation
  const { data: eventType, error: eventError } = await supabase
    .from('event_types')
    .select('duration')
    .eq('id', event_type_id)
    .maybeSingle();

  if (eventError) return res.status(500).json({ error: eventError.message });
  if (!eventType) return res.status(404).json({ error: 'Event type not found' });

  // Compute end_time by adding duration (minutes → ms) to start_time
  // e.g. start="10:00", duration=30 → end="10:30"
  const startDate = new Date(start_time);
  const endDate = new Date(startDate.getTime() + eventType.duration * 60 * 1000);
  const end_time = endDate.toISOString();

  // Check for any confirmed booking that overlaps this slot for the same host.
  // Same two-condition overlap logic as getSlots step 7.
  const { data: conflicts, error: conflictError } = await supabase
    .from('bookings')
    .select('id')
    .eq('host_user_id', host_user_id)
    .eq('status', 'confirmed')
    .lt('start_time', end_time)   // existing booking starts before new slot ends
    .gt('end_time', start_time);  // existing booking ends after new slot starts

  if (conflictError) return res.status(500).json({ error: conflictError.message });

  // 409 Conflict — slot was taken between the time it was shown and when the guest submitted
  if (conflicts.length > 0) {
    return res.status(409).json({ error: 'Slot no longer available' });
  }

  // Insert the booking
  const { data, error } = await supabase
    .from('bookings')
    .insert({ event_type_id, host_user_id, guest_name, guest_email, start_time, end_time })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 201 Created — distinct from 200 to signal a new resource was created
  res.status(201).json(data);
};
