const pool = require('../config/database');

const EventModel = {

  // Get all events
  async findAll() {
    const result = await pool.query(
      'SELECT * FROM events ORDER BY created_at DESC'
    );
    return result.rows;
  },

  // Get event by id
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM events WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // Create event
  async create(name, description, eventDate) {
    const result = await pool.query(
      `INSERT INTO events (name, description, event_date, status)
       VALUES ($1, $2, $3, 'draft')
       RETURNING *`,
      [name, description, eventDate]
    );
    return result.rows[0];
  },

  // Update event
  async update(id, fields) {
    const { name, description, event_date, status } = fields;
    const result = await pool.query(
      `UPDATE events
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           event_date = COALESCE($3, event_date),
           status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
      [name, description, event_date, status, id]
    );
    return result.rows[0];
  },

  // Open registration
  async openRegistration(id, durationMinutes) {
    const closesAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const result = await pool.query(
      `UPDATE events
       SET registration_open = TRUE,
           registration_duration_minutes = $1,
           registration_closes_at = $2,
           status = 'registration'
       WHERE id = $3
       RETURNING *`,
      [durationMinutes, closesAt, id]
    );
    return result.rows[0];
  },

  // Close registration
  async closeRegistration(id) {
    const result = await pool.query(
      `UPDATE events
       SET registration_open = FALSE,
           status = 'ready'
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // Auto close expired registrations
  async autoCloseExpired() {
    const result = await pool.query(
      `UPDATE events
       SET registration_open = FALSE,
           status = 'ready'
       WHERE registration_open = TRUE
       AND registration_closes_at < NOW()
       RETURNING id, name`
    );
    return result.rows;
  },

};

module.exports = EventModel;