const EventModel = require('../models/eventModel');

const eventController = {

  // GET /api/events
  async getAll(req, res, next) {
    try {
      const events = await EventModel.findAll();
      res.json({
        success: true,
        data: events
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/:id
  async getById(req, res, next) {
    try {
      const event = await EventModel.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      res.json({
        success: true,
        data: event
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/events
  async create(req, res, next) {
    try {
      const { name, description, event_date } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Event name is required'
        });
      }

      const event = await EventModel.create(name, description, event_date);
      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/events/:id
  async update(req, res, next) {
    try {
      const event = await EventModel.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const updated = await EventModel.update(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Event updated successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:id/registration/open
  async openRegistration(req, res, next) {
    try {
      const { duration_minutes } = req.body;

      if (![3, 5, 7].includes(Number(duration_minutes))) {
        return res.status(400).json({
          success: false,
          message: 'Duration must be 3, 5, or 7 minutes'
        });
      }

      const event = await EventModel.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const updated = await EventModel.openRegistration(
        req.params.id,
        duration_minutes
      );

      res.json({
        success: true,
        message: `Registration opened for ${duration_minutes} minutes`,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:id/registration/close
  async closeRegistration(req, res, next) {
    try {
      const event = await EventModel.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const updated = await EventModel.closeRegistration(req.params.id);
      res.json({
        success: true,
        message: 'Registration closed successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

};

module.exports = eventController;