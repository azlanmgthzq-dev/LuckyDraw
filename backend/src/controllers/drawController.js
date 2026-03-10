const DrawModel = require('../models/drawModel');
const EventModel = require('../models/eventModel');
const PrizeModel = require('../models/prizeModel');

const drawController = {

  // POST /api/events/:eventId/draw-session/start
  async startSession(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check no active session
        const existing = await DrawModel.getActiveSession(eventId);
        if (existing) {
          return res.status(200).json({
            success: true,
            message: 'Draw session already active',
            data: existing
          });
        }

      // Check prizes exist
      const prizes = await PrizeModel.findByEvent(eventId);
      if (prizes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No prizes found. Please register prizes first'
        });
      }

      // Check eligible participants exist
      const participants = await DrawModel.getEligibleParticipants(eventId);
      if (participants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No eligible participants found'
        });
      }

      // Auto close registration if still open
      if (event.registration_open) {
        await EventModel.closeRegistration(eventId);
      }

      const session = await DrawModel.startSession(eventId);

      res.status(201).json({
        success: true,
        message: 'Draw session started',
        data: session
      });

    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:eventId/draw-session/end
  async endSession(req, res, next) {
    try {
      const { eventId } = req.params;

      const session = await DrawModel.getActiveSession(eventId);
      if (!session) {
        return res.status(400).json({
          success: false,
          message: 'No active draw session found'
        });
      }

      const ended = await DrawModel.endSession(session.id);

      res.json({
        success: true,
        message: 'Draw session ended',
        data: ended
      });

    } catch (err) {
      next(err);
    }
  },

  // POST /api/prizes/:prizeId/draw
  async draw(req, res, next) {
    try {
      const { prizeId } = req.params;

      // Get prize
      const prize = await PrizeModel.findById(prizeId);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: 'Prize not found'
        });
      }

      // Get active session
      const session = await DrawModel.getActiveSession(prize.event_id);
      if (!session) {
        return res.status(400).json({
          success: false,
          message: 'No active draw session. Please start session first'
        });
      }

      // Check drawn count
      const drawnCount = await DrawModel.getDrawnCount(prizeId);
      if (drawnCount >= prize.winner_count) {
        return res.status(400).json({
          success: false,
          message: 'All winners for this prize have been drawn'
        });
      }

      const nextWinnerIndex = drawnCount + 1;

      // Get already drawn participants for this prize
      const alreadyDrawn = await DrawModel.getDrawnParticipants(prizeId);

      // Get eligible participants
      const eligible = await DrawModel.getEligibleParticipants(prize.event_id, prizeId);

      // Filter out already drawn for this prize
      const available = eligible.filter(
        p => !alreadyDrawn.includes(p.id)
      );

      if (available.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No eligible participants available for this draw'
        });
      }

      let winner;

      // Check scripted winner for this slot
      const scripted = await DrawModel.getScriptedWinner(prizeId, nextWinnerIndex);

      if (scripted) {
        // Use scripted winner
        winner = {
          id: scripted.participant_id,
          name: scripted.name,
          email: scripted.email,
          phone: scripted.phone
        };
      } else {
        // Random selection
        const randomIndex = Math.floor(Math.random() * available.length);
        winner = available[randomIndex];
      }

      // Save result
      const result = await DrawModel.saveResult(
        prize.event_id,
        prizeId,
        winner.id,
        session.id,
        nextWinnerIndex
      );

      // Winner recorded in draw_results — no need to mark ineligible
    // Same participant cannot win same prize twice (enforced by UNIQUE constraint)

      // Check if all prizes done
      const allDone = await DrawModel.checkAllPrizesDone(prize.event_id);

      res.json({
        success: true,
        message: '🎉 Winner selected!',
        data: {
          draw_result_id: result.id,
          winner_index: nextWinnerIndex,
          total_winners: prize.winner_count,
          winner: {
            id: winner.id,
            name: winner.name,
            email: winner.email
          },
          prize: {
            id: prize.id,
            title: prize.title,
            image_url: prize.image_url
          },
          drawn_at: result.drawn_at,
          all_prizes_completed: allDone
        }
      });

    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/:eventId/results
  async getResults(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const results = await DrawModel.getResultsByEvent(eventId);

      res.json({
        success: true,
        data: results
      });

    } catch (err) {
      next(err);
    }
  },

};

module.exports = drawController;