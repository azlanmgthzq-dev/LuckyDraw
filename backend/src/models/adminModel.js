const pool = require('../config/database');

const AdminModel = {

    // Find admin by email
    async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM admins WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },

    // Find admin by id
    async findById(id) {
        const result = await pool.query(
            'SELECT id, name, email, created_at FROM admins WHERE id = $1',
            [id]
        );
        return result.rows[0];
    },

    // Create admin
    async create(name, email, passwordHash) {
        const result = await pool.query(
            `INSERT INTO admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );
        return result.rows[0];
    },

};

module.exports = AdminModel;