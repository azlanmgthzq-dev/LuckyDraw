const express = require('express');
const router = express.Router({ mergeParams: true });
const prizeController = require('../controllers/prizeController');
const { protect } = require('../middleware/auth');

// All routes protected (admin only)
router.get('/', prizeController.getAll);
router.post('/', protect, prizeController.create);
router.put('/:id', protect, prizeController.update);
router.delete('/:id', protect, prizeController.delete);
router.post('/:id/scripted-winner', protect, prizeController.setScriptedWinner);
router.get('/:id/scripted-winner', protect, prizeController.getScriptedWinners);

module.exports = router;