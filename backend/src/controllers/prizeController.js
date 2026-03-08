const PrizeModel = require('../models/prizeModel');
const EventModel = require('../models/eventModel');

const prizeController = {

  // GET /api/events/:eventId/prizes
  async getAll(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const prizes = await PrizeModel.findByEvent(eventId);
      res.json({
        success: true,
        data: prizes
      });

    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:eventId/prizes
  async create(req, res, next) {
    try {
      const { eventId } = req.params;
      const { title, image_url, prize_order, selection_method, winner_count } = req.body;

      if (!title || !prize_order) {
        return res.status(400).json({
          success: false,
          message: 'Title and prize order are required'
        });
      }

      // Validate winner_count
      const count = parseInt(winner_count) || 1;
      if (count < 1 || count > 6) {
        return res.status(400).json({
          success: false,
          message: 'Winner count must be between 1 and 6'
        });
      }

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const prize = await PrizeModel.create(
        eventId,
        title,
        image_url || null,
        prize_order,
        selection_method || 'random',
        count
      );

      res.status(201).json({
        success: true,
        message: 'Prize created successfully',
        data: prize
      });

    } catch (err) {
      next(err);
    }
  },

  // PUT /api/prizes/:id
  async update(req, res, next) {
    try {
      const prize = await PrizeModel.findById(req.params.id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: 'Prize not found'
        });
      }

      // Validate winner_count if provided
      if (req.body.winner_count) {
        const count = parseInt(req.body.winner_count);
        if (count < 1 || count > 6) {
          return res.status(400).json({
            success: false,
            message: 'Winner count must be between 1 and 6'
          });
        }
      }

      const updated = await PrizeModel.update(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Prize updated successfully',
        data: updated
      });

    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/prizes/:id
  async delete(req, res, next) {
    try {
      const prize = await PrizeModel.findById(req.params.id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: 'Prize not found'
        });
      }

      await PrizeModel.delete(req.params.id);
      res.json({
        success: true,
        message: 'Prize deleted successfully'
      });

    } catch (err) {
      next(err);
    }
  },

  // POST /api/prizes/:id/scripted-winner
  async setScriptedWinner(req, res, next) {
    try {
      const { participant_id, winner_index } = req.body;

      if (!participant_id || !winner_index) {
        return res.status(400).json({
          success: false,
          message: 'Participant ID and winner index are required'
        });
      }

      const prize = await PrizeModel.findById(req.params.id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: 'Prize not found'
        });
      }

      // Validate winner_index within winner_count
      if (winner_index > prize.winner_count) {
        return res.status(400).json({
          success: false,
          message: `Winner index cannot exceed winner count (${prize.winner_count})`
        });
      }

      const scripted = await PrizeModel.setScriptedWinner(
        req.params.id,
        participant_id,
        winner_index
      );

      res.json({
        success: true,
        message: 'Scripted winner set successfully',
        data: scripted
      });

    } catch (err) {
      next(err);
    }
  },

  // GET /api/prizes/:id/scripted-winner
  async getScriptedWinners(req, res, next) {
    try {
      const prize = await PrizeModel.findById(req.params.id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: 'Prize not found'
        });
      }

      const scripted = await PrizeModel.getScriptedWinners(req.params.id);
      res.json({
        success: true,
        data: scripted
      });

    } catch (err) {
      next(err);
    }
  },

};

module.exports = prizeController;