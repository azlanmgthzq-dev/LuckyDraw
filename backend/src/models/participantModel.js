const pool = require('../config/database');

const ParticipantModel = {

  // Register participant
  async create(eventId, name, email, phone, isPreRegistered = false) {
    const result = await pool.query(
      `INSERT INTO participants 
       (event_id, name, email, phone, is_pre_registered, checked_in, is_eligible)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [eventId, name, email, phone, isPreRegistered, isPreRegistered]
    );
    return result.rows[0];
  },

  // Get all participants by event
  async findByEvent(eventId) {
    const result = await pool.query(
      `SELECT * FROM participants 
       WHERE event_id = $1 
       ORDER BY registered_at ASC`,
      [eventId]
    );
    return result.rows;
  },

  // Get eligible participants by event
  async findEligible(eventId) {
    const result = await pool.query(
      `SELECT * FROM participants 
       WHERE event_id = $1 
       AND is_eligible = TRUE
       AND checked_in = TRUE OR is_pre_registered = FALSE
       ORDER BY registered_at ASC`,
      [eventId]
    );
    return result.rows;
  },

  // Get participant count
  async countByEvent(eventId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM participants WHERE event_id = $1',
      [eventId]
    );
    return parseInt(result.rows[0].count);
  },

  // Get participant by id
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM participants WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // Check in participant (VIP)
  async checkIn(id) {
    const result = await pool.query(
      `UPDATE participants 
       SET checked_in = TRUE 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // Mark as not eligible (after winning)
  async markNotEligible(id) {
    const result = await pool.query(
      `UPDATE participants 
       SET is_eligible = FALSE 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // Check duplicate email per event
  async findByEmail(eventId, email) {
    const result = await pool.query(
      `SELECT * FROM participants 
       WHERE event_id = $1 AND email = $2`,
      [eventId, email]
    );
    return result.rows[0];
  },

};

module.exports = ParticipantModel;