const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({
        message: '🎉 Lucky Draw API is running!',
        version: '1.0.0',
        status: 'OK'
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/events/:eventId/participants', require('./routes/participants'));
app.use('/api/events/:eventId/prizes', require('./routes/prizes'));
app.use('/api/prizes', require('./routes/prizes'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api', require('./routes/draw'));
app.use('/api/participant', require('./routes/participantAuth'));



// Error handler
const errorHandler = require('./middleware/errorHandler');
const pool = require('./config/database');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;