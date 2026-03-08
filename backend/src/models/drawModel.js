const pool = require('../config/database');

const DrawModel = {

  // Start draw session
  async startSession(eventId) {
    const result = await pool.query(
      `INSERT INTO draw_sessions (event_id, started_at)
       VALUES ($1, NOW())
       RETURNING *`,
      [eventId]
    );
    return result.rows[0];
  },

  // End draw session
  async endSession(sessionId) {
    const result = await pool.query(
      `UPDATE draw_sessions 
       SET ended_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [sessionId]
    );
    return result.rows[0];
  },

  // Get active session by event
  async getActiveSession(eventId) {
    const result = await pool.query(
      `SELECT * FROM draw_sessions 
       WHERE event_id = $1 
       AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [eventId]
    );
    return result.rows[0];
  },

  // Get eligible participants (not won any prize yet)
async getEligibleParticipants(eventId, prizeId) {
  const result = await pool.query(
    `SELECT * FROM participants
     WHERE event_id = $1
     AND id NOT IN (
       SELECT participant_id FROM draw_results
       WHERE event_id = $1
     )
     ORDER BY registered_at ASC`,
    [eventId]
  );
  return result.rows;
},

  // Get already drawn participants for a prize
  async getDrawnParticipants(prizeId) {
    const result = await pool.query(
      `SELECT participant_id FROM draw_results
       WHERE prize_id = $1`,
      [prizeId]
    );
    return result.rows.map(r => r.participant_id);
  },

  // Get scripted winner for specific slot
  async getScriptedWinner(prizeId, winnerIndex) {
    const result = await pool.query(
      `SELECT sw.*, p.name, p.email, p.phone
       FROM scripted_winners sw
       JOIN participants p ON sw.participant_id = p.id
       WHERE sw.prize_id = $1 
       AND sw.winner_index = $2`,
      [prizeId, winnerIndex]
    );
    return result.rows[0];
  },

  // Save draw result
  async saveResult(eventId, prizeId, participantId, sessionId, winnerIndex) {
    const result = await pool.query(
      `INSERT INTO draw_results 
       (event_id, prize_id, participant_id, draw_session_id, winner_index, drawn_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [eventId, prizeId, participantId, sessionId, winnerIndex]
    );
    return result.rows[0];
  },

  // Mark participant not eligible
  async markNotEligible(participantId) {
    await pool.query(
      `UPDATE participants 
       SET is_eligible = FALSE 
       WHERE id = $1`,
      [participantId]
    );
  },

  // Get draw results by event
  async getResultsByEvent(eventId) {
    const result = await pool.query(
      `SELECT 
         dr.id,
         dr.winner_index,
         dr.drawn_at,
         p.id as participant_id,
         p.name as winner_name,
         p.email as winner_email,
         pr.title as prize_title,
         pr.image_url as prize_image,
         pr.prize_order
       FROM draw_results dr
       JOIN participants p ON dr.participant_id = p.id
       JOIN prizes pr ON dr.prize_id = pr.id
       WHERE dr.event_id = $1
       ORDER BY pr.prize_order ASC, dr.winner_index ASC`,
      [eventId]
    );
    return result.rows;
  },

  // Get drawn count for prize
  async getDrawnCount(prizeId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM draw_results WHERE prize_id = $1',
      [prizeId]
    );
    return parseInt(result.rows[0].count);
  },

  // Check if all prizes done
  async checkAllPrizesDone(eventId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE p.winner_count = drawn.count) as completed,
         COUNT(*) as total
       FROM prizes p
       LEFT JOIN (
         SELECT prize_id, COUNT(*) as count 
         FROM draw_results 
         WHERE event_id = $1
         GROUP BY prize_id
       ) drawn ON p.id = drawn.prize_id
       WHERE p.event_id = $1`,
      [eventId]
    );
    const { completed, total } = result.rows[0];
    return parseInt(completed) === parseInt(total);
  },

};

module.exports = DrawModel;