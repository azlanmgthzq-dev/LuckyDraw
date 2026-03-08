const ParticipantModel = require('../models/participantModel');
const EventModel = require('../models/eventModel');
const DrawModel = require('../models/drawModel');

const participantController = {

  // POST /api/events/:eventId/participants
  async register(req, res, next) {
    try {
      const { eventId } = req.params;
      const { name, email, phone } = req.body;

      // Validate input
      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name, email and phone are required'
        });
      }

      // Check event exists
      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check registration is open
      if (!event.registration_open) {
        return res.status(400).json({
          success: false,
          message: 'Registration is closed'
        });
      }

      // Check draw session not started yet
      const activeSession = await DrawModel.getActiveSession(eventId);
      if (activeSession) {
        return res.status(400).json({
          success: false,
          message: 'Lucky draw session has started. Registration is closed'
        });
      }

      // Check registration not expired
      if (new Date() > new Date(event.registration_closes_at)) {
        await EventModel.closeRegistration(eventId);
        return res.status(400).json({
          success: false,
          message: 'Registration period has ended'
        });
      }

      // Check duplicate email
      const existing = await ParticipantModel.findByEmail(eventId, email);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered for this event'
        });
      }

      const participant = await ParticipantModel.create(
        eventId, name, email, phone
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: participant
      });

    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:eventId/participants/preregister
  async preRegister(req, res, next) {
    try {
      const { eventId } = req.params;
      const { name, email, phone } = req.body;

      // Validate input
      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name, email and phone are required'
        });
      }

      // Check event exists
      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check duplicate email
      const existing = await ParticipantModel.findByEmail(eventId, email);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered for this event'
        });
      }

      const participant = await ParticipantModel.create(
        eventId, name, email, phone, true
      );

      res.status(201).json({
        success: true,
        message: 'VIP pre-registration successful',
        data: participant
      });

    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/:eventId/participants
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

      const participants = await ParticipantModel.findByEvent(eventId);
      res.json({
        success: true,
        data: participants
      });

    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/:eventId/participants/count
  async getCount(req, res, next) {
    try {
      const { eventId } = req.params;
      const count = await ParticipantModel.countByEvent(eventId);
      res.json({
        success: true,
        data: { count }
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:eventId/participants/:id/checkin
  async checkIn(req, res, next) {
    try {
      const { id } = req.params;

      const participant = await ParticipantModel.findById(id);
      if (!participant) {
        return res.status(404).json({
          success: false,
          message: 'Participant not found'
        });
      }

      if (!participant.is_pre_registered) {
        return res.status(400).json({
          success: false,
          message: 'Only pre-registered participants can check in'
        });
      }

      if (participant.checked_in) {
        return res.status(400).json({
          success: false,
          message: 'Participant already checked in'
        });
      }

      const updated = await ParticipantModel.checkIn(id);
      res.json({
        success: true,
        message: 'Check in successful',
        data: updated
      });

    } catch (err) {
      next(err);
    }
  },

};

module.exports = participantController;