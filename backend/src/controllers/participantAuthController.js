const ParticipantModel = require('../models/participantModel');
const EventModel = require('../models/eventModel');
const DrawModel = require('../models/drawModel');
const pool = require('../config/database');

const participantAuthController = {

    // POST /api/participant/register
    async register(req, res, next) {
        try {
            const { name, email, phone, event_id } = req.body;

            if (!name || !phone || !event_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Nama, nombor telefon dan event diperlukan'
                });
            }

            const event = await EventModel.findById(event_id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event tidak ditemui / Event not found'
                });
            }

            if (!event.registration_open) {
                return res.status(400).json({
                    success: false,
                    message: 'Pendaftaran belum dibuka atau telah ditutup / Registration is not open'
                });
            }

            const activeSession = await DrawModel.getActiveSession(event_id);
            if (activeSession) {
                return res.status(400).json({
                    success: false,
                    message: 'Sesi cabutan telah bermula. Pendaftaran ditutup / Draw session has started'
                });
            }

            // Check duplicate phone for this event
            const existingPhone = await pool.query(
                'SELECT * FROM participants WHERE event_id = $1 AND phone = $2',
                [event_id, phone]
            );
            if (existingPhone.rows[0]) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombor telefon ini telah didaftarkan untuk event ini'
                });
            }

            if (email) {
                const existingEmail = await ParticipantModel.findByEmail(event_id, email);
                if (existingEmail) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email ini telah didaftarkan untuk event ini'
                    });
                }
            }

            const participant = await ParticipantModel.create(
                event_id, name, email || null, phone
            );

            res.status(201).json({
                success: true,
                message: 'Pendaftaran berjaya! / Registration successful!',
                data: {
                    id: participant.id,
                    name: participant.name,
                    phone: participant.phone,
                    email: participant.email,
                    event_id: participant.event_id
                }
            });

        } catch (err) {
            next(err);
        }
    },

    // POST /api/participant/login
    async login(req, res, next) {
        try {
            const { name, phone } = req.body;

            if (!name || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'Nama dan nombor telefon diperlukan'
                });
            }

            const result = await pool.query(
                `SELECT * FROM participants 
                 WHERE phone = $1 AND LOWER(name) = LOWER($2)
                 ORDER BY registered_at DESC
                 LIMIT 1`,
                [phone, name]
            );

            const participant = result.rows[0];

            if (!participant) {
                return res.status(401).json({
                    success: false,
                    message: 'Nama atau nombor telefon tidak sah / Invalid name or phone number'
                });
            }

            res.json({
                success: true,
                message: 'Log masuk berjaya / Login successful',
                data: {
                    id: participant.id,
                    name: participant.name,
                    phone: participant.phone,
                    email: participant.email,
                    event_id: participant.event_id
                }
            });

        } catch (err) {
            next(err);
        }
    },

    // GET /api/participant/events/completed
    async getCompletedEvents(req, res, next) {
        try {
            const result = await pool.query(
                `SELECT 
                    e.id,
                    e.name,
                    e.description,
                    e.event_date,
                    e.status,
                    (
                        SELECT json_agg(
                            json_build_object(
                                'prize_order', pr.prize_order,
                                'prize_title', pr.title,
                                'prize_image', pr.image_url,
                                'winners', (
                                    SELECT json_agg(
                                        json_build_object(
                                            'winner_index', dr.winner_index,
                                            'name', p.name,
                                            'drawn_at', dr.drawn_at
                                        ) ORDER BY dr.winner_index ASC
                                    )
                                    FROM draw_results dr
                                    JOIN participants p ON dr.participant_id = p.id
                                    WHERE dr.prize_id = pr.id
                                )
                            ) ORDER BY pr.prize_order ASC
                        )
                        FROM prizes pr
                        WHERE pr.event_id = e.id
                    ) as prizes
                FROM events e
                WHERE e.status IN ('ready', 'completed')
                AND e.is_archived = FALSE
                AND EXISTS (
                    SELECT 1 FROM draw_sessions ds 
                    WHERE ds.event_id = e.id 
                    AND ds.ended_at IS NOT NULL
                )
                ORDER BY e.event_date DESC`
            );

            res.json({
                success: true,
                data: result.rows
            });

        } catch (err) {
            next(err);
        }
    },

    // GET /api/participant/active-event
    async getActiveEvent(req, res, next) {
        try {
            const result = await pool.query(
                `SELECT id, name, description, event_date, registration_open, registration_closes_at
                 FROM events
                 WHERE registration_open = TRUE
                 AND is_archived = FALSE
                 ORDER BY created_at DESC
                 LIMIT 1`
            );

            const event = result.rows[0];

            if (event) {
                const session = await DrawModel.getActiveSession(event.id);
                if (session) {
                    return res.json({ success: true, data: null });
                }
            }

            res.json({
                success: true,
                data: event || null
            });

        } catch (err) {
            next(err);
        }
    },

    // GET /api/participant/event/:eventId
    // Public — fetch event info by ID for the registration page
    async getEventById(req, res, next) {
        try {
            const { eventId } = req.params;

            const result = await pool.query(
                `SELECT id, name, description, event_date, registration_open
                 FROM events
                 WHERE id = $1 AND is_archived = FALSE`,
                [eventId]
            );

            const event = result.rows[0];
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event tidak ditemui / Event not found'
                });
            }

            // Check if draw has started
            const session = await DrawModel.getActiveSession(eventId);

            res.json({
                success: true,
                data: {
                    ...event,
                    draw_started: !!session
                }
            });

        } catch (err) {
            next(err);
        }
    },
};

module.exports = participantAuthController;