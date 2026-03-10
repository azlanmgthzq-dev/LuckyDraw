const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — no temp files on disk
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WEBP and GIF images are allowed'), false);
        }
    },
});

const uploadController = {

    // Multer middleware — use as route middleware before handler
    uploadMiddleware: upload.single('image'),

    // POST /api/upload/image
    async uploadImage(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }

            // Upload buffer directly to Cloudinary
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        folder: 'lucky-draw/prizes',
                        transformation: [
                            { width: 800, height: 800, crop: 'limit' },
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(req.file.buffer);
            });

            res.json({
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    url: result.secure_url,
                    public_id: result.public_id,
                    width: result.width,
                    height: result.height,
                }
            });

        } catch (err) {
            next(err);
        }
    },

    // DELETE /api/upload/image
    async deleteImage(req, res, next) {
        try {
            const { public_id } = req.body;

            if (!public_id) {
                return res.status(400).json({
                    success: false,
                    message: 'public_id is required'
                });
            }

            await cloudinary.uploader.destroy(public_id);

            res.json({
                success: true,
                message: 'Image deleted successfully'
            });

        } catch (err) {
            next(err);
        }
    },
};

module.exports = uploadController;