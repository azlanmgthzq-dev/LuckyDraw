-- ============================================
-- LUCKY DRAW SYSTEM - DATABASE SCHEMA
-- Version 1.0 | March 2026
-- ============================================

-- ADMINS
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    event_date DATE,
    status VARCHAR(20) DEFAULT 'draft',
    registration_open BOOLEAN DEFAULT FALSE,
    registration_duration_minutes INT,
    registration_closes_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PARTICIPANTS
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_pre_registered BOOLEAN DEFAULT FALSE,
    checked_in BOOLEAN DEFAULT FALSE,
    is_eligible BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PRIZES
CREATE TABLE IF NOT EXISTS prizes (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    image_url TEXT,
    prize_order INT NOT NULL,
    selection_method VARCHAR(20) DEFAULT 'random',
    winner_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SCRIPTED WINNERS (per slot)
CREATE TABLE IF NOT EXISTS scripted_winners (
    id SERIAL PRIMARY KEY,
    prize_id INT NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
    participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    winner_index INT NOT NULL,
    UNIQUE(prize_id, winner_index),
    UNIQUE(prize_id, participant_id)
);

-- DRAW SESSIONS
CREATE TABLE IF NOT EXISTS draw_sessions (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- DRAW RESULTS
CREATE TABLE IF NOT EXISTS draw_results (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    prize_id INT NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
    participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    draw_session_id INT REFERENCES draw_sessions(id),
    winner_index INT NOT NULL,
    drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prize_id, participant_id),
    UNIQUE(prize_id, winner_index)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_prizes_event ON prizes(event_id);
CREATE INDEX IF NOT EXISTS idx_draw_results_event ON draw_results(event_id);
CREATE INDEX IF NOT EXISTS idx_draw_results_prize ON draw_results(prize_id);