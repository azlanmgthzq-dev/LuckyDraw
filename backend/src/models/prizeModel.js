const pool = require('../config/database');

const PrizeModel = {

  // Create prize
  async create(eventId, title, imageUrl, prizeOrder, selectionMethod, winnerCount) {
    const result = await pool.query(
      `INSERT INTO prizes 
       (event_id, title, image_url, prize_order, selection_method, winner_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventId, title, imageUrl, prizeOrder, selectionMethod, winnerCount]
    );
    return result.rows[0];
  },

  // Get all prizes by event
  async findByEvent(eventId) {
    const result = await pool.query(
      `SELECT * FROM prizes 
       WHERE event_id = $1 
       ORDER BY prize_order ASC`,
      [eventId]
    );
    return result.rows;
  },

  // Get prize by id
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM prizes WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // Update prize
  async update(id, fields) {
    const { title, image_url, prize_order, selection_method, winner_count } = fields;
    const result = await pool.query(
      `UPDATE prizes
       SET title = COALESCE($1, title),
           image_url = COALESCE($2, image_url),
           prize_order = COALESCE($3, prize_order),
           selection_method = COALESCE($4, selection_method),
           winner_count = COALESCE($5, winner_count)
       WHERE id = $6
       RETURNING *`,
      [title, image_url, prize_order, selection_method, winner_count, id]
    );
    return result.rows[0];
  },

  // Delete prize
  async delete(id) {
    await pool.query('DELETE FROM prizes WHERE id = $1', [id]);
  },

  // Set scripted winner for a slot
  async setScriptedWinner(prizeId, participantId, winnerIndex) {
    const result = await pool.query(
      `INSERT INTO scripted_winners (prize_id, participant_id, winner_index)
       VALUES ($1, $2, $3)
       ON CONFLICT (prize_id, winner_index) 
       DO UPDATE SET participant_id = $2
       RETURNING *`,
      [prizeId, participantId, winnerIndex]
    );
    return result.rows[0];
  },

  // Get scripted winners for a prize
  async getScriptedWinners(prizeId) {
    const result = await pool.query(
      `SELECT sw.*, p.name, p.email 
       FROM scripted_winners sw
       JOIN participants p ON sw.participant_id = p.id
       WHERE sw.prize_id = $1
       ORDER BY sw.winner_index ASC`,
      [prizeId]
    );
    return result.rows;
  },

  // Get winner count drawn so far
  async getDrawnCount(prizeId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM draw_results WHERE prize_id = $1',
      [prizeId]
    );
    return parseInt(result.rows[0].count);
  },

};

module.exports = PrizeModel;