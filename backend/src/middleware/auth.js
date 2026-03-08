const jwt = require('jsonwebtoken');
const AdminModel = require('../models/adminModel');

const protect = async (req, res, next) => {
    try {
        // Check token in header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided'
            });
        }

        // Verify token
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find admin
        const admin = await AdminModel.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Admin not found'
            });
        }

        // Attach admin to request
        req.admin = admin;
        next();

    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Invalid token'
        });
    }
};

module.exports = { protect };
