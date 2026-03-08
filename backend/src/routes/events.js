const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/auth');

// Public
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);

// Protected (admin only)
router.post('/', protect, eventController.create);
router.put('/:id', protect, eventController.update);
router.post('/:id/registration/open', protect, eventController.openRegistration);
router.post('/:id/registration/close', protect, eventController.closeRegistration);

module.exports = router;