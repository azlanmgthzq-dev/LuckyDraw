const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminModel = require('../models/adminModel');

const authController = {

    // POST /api/auth/register
    async register(req, res, next) {
        try {
            const { name, email, password } = req.body;

            // Validate input
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email and password are required'
                });
            }

            // Check if admin already exists
            const existing = await AdminModel.findByEmail(email);
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Create admin
            const admin = await AdminModel.create(name, email, passwordHash);

            res.status(201).json({
                success: true,
                message: 'Admin registered successfully',
                data: admin
            });

        } catch (err) {
            next(err);
        }
    },

    // POST /api/auth/login
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            // Find admin
            const admin = await AdminModel.findByEmail(email);
            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, admin.password_hash);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: admin.id, email: admin.email },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.json({
                success: true,
                message: 'Login successful',
                token,
                data: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email
                }
            });

        } catch (err) {
            next(err);
        }
    },

    // GET /api/auth/me
    async me(req, res, next) {
        try {
            const admin = await AdminModel.findById(req.admin.id);
            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
            }

            res.json({
                success: true,
                data: admin
            });

        } catch (err) {
            next(err);
        }
    },

};

module.exports = authController;