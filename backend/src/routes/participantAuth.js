const express = require('express');
const router = express.Router();
const participantAuthController = require('../controllers/participantAuthController');

// Public routes — no auth needed
router.post('/register', participantAuthController.register);
router.post('/login', participantAuthController.login);
router.get('/active-event', participantAuthController.getActiveEvent);
router.get('/events/completed', participantAuthController.getCompletedEvents);

// Public — get event info by ID (for registration page)
router.get('/event/:eventId', participantAuthController.getEventById);

module.exports = router;