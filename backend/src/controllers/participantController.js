const ParticipantModel = require('../models/participantModel');
const EventModel = require('../models/eventModel');
const DrawModel = require('../models/drawModel');

const participantController = {

  // POST /api/events/:eventId/participants
  async register(req, res, next) {
    try {
      const { eventId } = req.params;
      const { name, email, phone } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
      }

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      if (!event.registration_open) {
        return res.status(400).json({ success: false, message: 'Registration is closed' });
      }

      const activeSession = await DrawModel.getActiveSession(eventId);
      if (activeSession) {
        return res.status(400).json({ success: false, message: 'Lucky draw session has started. Registration is closed' });
      }

      const existing = await ParticipantModel.findByEmail(eventId, email);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered for this event' });
      }

      const participant = await ParticipantModel.create(eventId, name, email, phone);
      res.status(201).json({ success: true, message: 'Registration successful', data: participant });

    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:eventId/participants/preregister
  async preRegister(req, res, next) {
    try {
      const { eventId } = req.params;
      const { name, email, phone } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
      }

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const existing = await ParticipantModel.findByEmail(eventId, email);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered for this event' });
      }

      const participant = await ParticipantModel.create(eventId, name, email, phone, true);
      res.status(201).json({ success: true, message: 'VIP pre-registration successful', data: participant });

    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/:eventId/participants
  // Returns participants sorted: winners first, then non-winners
  async getAll(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const participants = await ParticipantModel.findByEventSorted(eventId);
      res.json({ success: true, data: participants });

    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/:eventId/participants/count
  async getCount(req, res, next) {
    try {
      const { eventId } = req.params;
      const count = await ParticipantModel.countByEvent(eventId);
      res.json({ success: true, data: { count } });
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
        return res.status(404).json({ success: false, message: 'Participant not found' });
      }

      if (!participant.is_pre_registered) {
        return res.status(400).json({ success: false, message: 'Only pre-registered participants can check in' });
      }

      if (participant.checked_in) {
        return res.status(400).json({ success: false, message: 'Participant already checked in' });
      }

      const updated = await ParticipantModel.checkIn(id);
      res.json({ success: true, message: 'Check in successful', data: updated });

    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/events/:eventId/participants/:id
  async deleteOne(req, res, next) {
    try {
      const { id } = req.params;

      const participant = await ParticipantModel.findById(id);
      if (!participant) {
        return res.status(404).json({ success: false, message: 'Participant not found' });
      }

      // draw_results will auto-cascade delete due to ON DELETE CASCADE in schema
      await ParticipantModel.deleteById(id);

      res.json({ success: true, message: 'Peserta dipadam / Participant deleted' });

    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/events/:eventId/participants/all
  async deleteAll(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // draw_results will auto-cascade delete due to ON DELETE CASCADE in schema
      const count = await ParticipantModel.deleteByEvent(eventId);

      res.json({
        success: true,
        message: `${count} peserta dipadam / participants deleted`,
        data: { deleted: count }
      });

    } catch (err) {
      next(err);
    }
  },

};

module.exports = participantController;