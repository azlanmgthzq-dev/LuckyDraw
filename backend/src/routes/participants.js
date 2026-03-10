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

// Delete — deleteAll MESTI sebelum deleteOne (/:id akan capture 'all' kalau letak dulu)
router.delete('/all', protect, participantController.deleteAll);
router.delete('/:id', protect, participantController.deleteOne);

module.exports = router;