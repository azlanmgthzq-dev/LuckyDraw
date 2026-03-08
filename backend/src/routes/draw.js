const express = require('express');
const router = express.Router({ mergeParams: true });
const drawController = require('../controllers/drawController');
const { protect } = require('../middleware/auth');

// Draw Session
router.post('/events/:eventId/draw-session/start', protect, drawController.startSession);
router.post('/events/:eventId/draw-session/end', protect, drawController.endSession);

// Draw Winner
router.post('/prizes/:prizeId/draw', protect, drawController.draw);

// Results
router.get('/events/:eventId/results', protect, drawController.getResults);

module.exports = router;