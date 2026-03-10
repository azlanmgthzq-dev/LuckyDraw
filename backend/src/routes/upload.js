const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// POST /api/upload/image
router.post(
    '/image',
    protect,
    uploadController.uploadMiddleware,
    uploadController.uploadImage
);

// DELETE /api/upload/image
router.delete('/image', protect, uploadController.deleteImage);

module.exports = router;