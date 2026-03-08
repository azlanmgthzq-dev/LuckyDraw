const express = require('express');
const router = express.Router({ mergeParams: true });
const participantController = require('../controllers/participantController');
const { protect } = require('../middleware/auth');

// Public
router.post('/', participantController.register);
router.get('/count', participantController.getCount);

// Protected (admin only)
router.get('/', protect, participantController.getAll);
router.post('/preregister', protect, participantController.preRegister);
router.post('/:id/checkin', protect, participantController.checkIn);

module.exports = router;