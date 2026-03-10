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

  // Open registration — manual, no countdown
  // Sets registration_closes_at far in the future (99 years) so existing checks don't break
  async openRegistration(id) {
    const farFuture = new Date('2099-12-31T23:59:59Z');
    const result = await pool.query(
      `UPDATE events
       SET registration_open = TRUE,
           registration_closes_at = $1,
           status = 'registration'
       WHERE id = $2
       RETURNING *`,
      [farFuture, id]
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

  async archive(id) {
    const result = await pool.query(
      'UPDATE events SET is_archived = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async findAllActive() {
    const result = await pool.query(
      'SELECT * FROM events WHERE is_archived = FALSE ORDER BY created_at DESC'
    );
    return result.rows;
  },

};

module.exports = EventModel;