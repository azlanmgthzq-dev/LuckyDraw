-- ============================================================
-- LUCKY DRAW SYSTEM — SUPABASE SETUP
-- Run this in Supabase > SQL Editor AFTER backend/src/config/schema.sql
-- Safe to re-run.
--
-- What it does:
--   1. Admin check based on Supabase Auth email + admins table
--   2. Row Level Security: only admins can read/write tables directly
--   3. Public functions (anon) for participant registration / portal
--   4. Draw functions (admin) so the draw runs atomically in the DB
-- ============================================================

-- Admins now log in via Supabase Auth, so password_hash is optional
-- ALTER TABLE admins ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- ------------------------------------------------------------
-- 1. ADMIN CHECK
-- A logged-in Supabase user is an admin if their email is in `admins`.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM admins
        WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    );
$$;

-- ------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- No policy for anon = anon cannot touch tables directly.
-- ------------------------------------------------------------
ALTER TABLE admins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripted_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_results     ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['events','participants','prizes','scripted_winners','draw_sessions','draw_results']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS admin_all ON %I', t);
        EXECUTE format(
            'CREATE POLICY admin_all ON %I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', t);
    END LOOP;
END $$;

-- Admins may read their own row (used to confirm admin status after login)
DROP POLICY IF EXISTS admin_self ON admins;
CREATE POLICY admin_self ON admins FOR SELECT TO authenticated
    USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));

-- ------------------------------------------------------------
-- 3. PUBLIC FUNCTIONS (participants, no login)
-- ------------------------------------------------------------

-- Event info for /daftar/:eventId
CREATE OR REPLACE FUNCTION get_public_event(p_event_id INT)
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT json_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'event_date', e.event_date,
        'registration_open', e.registration_open,
        'registration_closes_at', e.registration_closes_at,
        'draw_started', EXISTS (
            SELECT 1 FROM draw_sessions ds
            WHERE ds.event_id = e.id AND ds.ended_at IS NULL
        )
    )
    FROM events e
    WHERE e.id = p_event_id AND e.is_archived = FALSE;
$$;

-- Event currently open for registration (null if none / draw started)
CREATE OR REPLACE FUNCTION get_active_event()
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT json_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'event_date', e.event_date,
        'registration_open', e.registration_open,
        'registration_closes_at', e.registration_closes_at
    )
    FROM events e
    WHERE e.registration_open = TRUE
      AND e.registration_closes_at > NOW()
      AND e.is_archived = FALSE
      AND NOT EXISTS (
          SELECT 1 FROM draw_sessions ds
          WHERE ds.event_id = e.id AND ds.ended_at IS NULL
      )
    ORDER BY e.registration_closes_at ASC
    LIMIT 1;
$$;

-- Public registration (same rules as the old Express API)
CREATE OR REPLACE FUNCTION register_participant(
    p_event_id INT, p_name TEXT, p_phone TEXT, p_email TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_event events;
    v_p participants;
BEGIN
    IF COALESCE(TRIM(p_name), '') = '' OR COALESCE(TRIM(p_phone), '') = '' OR p_event_id IS NULL THEN
        RAISE EXCEPTION 'Nama, nombor telefon dan event diperlukan';
    END IF;

    SELECT * INTO v_event FROM events WHERE id = p_event_id AND is_archived = FALSE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event tidak ditemui / Event not found';
    END IF;

    IF NOT v_event.registration_open THEN
        RAISE EXCEPTION 'Pendaftaran belum dibuka atau telah ditutup / Registration is not open';
    END IF;

    IF EXISTS (SELECT 1 FROM draw_sessions WHERE event_id = p_event_id AND ended_at IS NULL) THEN
        RAISE EXCEPTION 'Sesi cabutan telah bermula. Pendaftaran ditutup / Draw session has started';
    END IF;

    IF v_event.registration_closes_at IS NOT NULL AND NOW() > v_event.registration_closes_at THEN
        RAISE EXCEPTION 'Tempoh pendaftaran telah tamat / Registration period has ended';
    END IF;

    IF EXISTS (SELECT 1 FROM participants WHERE event_id = p_event_id AND phone = TRIM(p_phone)) THEN
        RAISE EXCEPTION 'Nombor telefon ini telah didaftarkan untuk event ini';
    END IF;

    IF NULLIF(TRIM(p_email), '') IS NOT NULL AND EXISTS (
        SELECT 1 FROM participants WHERE event_id = p_event_id AND email = TRIM(p_email)
    ) THEN
        RAISE EXCEPTION 'Email ini telah didaftarkan untuk event ini';
    END IF;

    INSERT INTO participants (event_id, name, email, phone, is_pre_registered, checked_in, is_eligible)
    VALUES (p_event_id, TRIM(p_name), NULLIF(TRIM(p_email), ''), TRIM(p_phone), FALSE, FALSE, TRUE)
    RETURNING * INTO v_p;

    RETURN json_build_object(
        'id', v_p.id, 'name', v_p.name, 'phone', v_p.phone,
        'email', v_p.email, 'event_id', v_p.event_id
    );
END;
$$;

-- Participant login (name + phone)
CREATE OR REPLACE FUNCTION participant_login(p_name TEXT, p_phone TEXT)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_p participants;
BEGIN
    SELECT * INTO v_p FROM participants
    WHERE phone = TRIM(p_phone) AND LOWER(name) = LOWER(TRIM(p_name))
    ORDER BY registered_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nama atau nombor telefon tidak sah / Invalid name or phone number';
    END IF;

    RETURN json_build_object(
        'id', v_p.id, 'name', v_p.name, 'phone', v_p.phone,
        'email', v_p.email, 'event_id', v_p.event_id
    );
END;
$$;

-- Finished events with winners (names only, no phone/email)
CREATE OR REPLACE FUNCTION get_completed_events()
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(json_agg(ev ORDER BY ev.event_date DESC), '[]'::json)
    FROM (
        SELECT
            e.id, e.name, e.description, e.event_date, e.status,
            (
                SELECT json_agg(json_build_object(
                    'prize_order', pr.prize_order,
                    'prize_title', pr.title,
                    'prize_image', pr.image_url,
                    'winners', (
                        SELECT json_agg(json_build_object(
                            'winner_index', dr.winner_index,
                            'name', p.name,
                            'drawn_at', dr.drawn_at
                        ) ORDER BY dr.winner_index ASC)
                        FROM draw_results dr
                        JOIN participants p ON p.id = dr.participant_id
                        WHERE dr.prize_id = pr.id
                    )
                ) ORDER BY pr.prize_order ASC)
                FROM prizes pr WHERE pr.event_id = e.id
            ) AS prizes
        FROM events e
        WHERE e.status IN ('ready', 'completed')
          AND e.is_archived = FALSE
          AND EXISTS (
              SELECT 1 FROM draw_sessions ds
              WHERE ds.event_id = e.id AND ds.ended_at IS NOT NULL
          )
    ) ev;
$$;

-- ------------------------------------------------------------
-- 4. DRAW FUNCTIONS (admin only)
-- ------------------------------------------------------------

-- Start draw session (returns existing one if already active)
CREATE OR REPLACE FUNCTION start_draw_session(p_event_id INT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_session draw_sessions;
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

    IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id) THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    SELECT * INTO v_session FROM draw_sessions
    WHERE event_id = p_event_id AND ended_at IS NULL
    ORDER BY started_at DESC LIMIT 1;
    IF FOUND THEN RETURN row_to_json(v_session); END IF;

    IF NOT EXISTS (SELECT 1 FROM prizes WHERE event_id = p_event_id) THEN
        RAISE EXCEPTION 'No prizes found. Please register prizes first';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM participants p
        WHERE p.event_id = p_event_id
          AND p.is_eligible = TRUE
          AND (p.is_pre_registered = FALSE OR p.checked_in = TRUE)
          AND NOT EXISTS (SELECT 1 FROM draw_results dr
                          WHERE dr.event_id = p_event_id AND dr.participant_id = p.id)
    ) THEN
        RAISE EXCEPTION 'Tiada peserta yang hadir dan layak / No eligible checked-in participants';
    END IF;

    -- Auto close registration
    UPDATE events SET registration_open = FALSE, status = 'ready'
    WHERE id = p_event_id AND registration_open = TRUE;

    INSERT INTO draw_sessions (event_id, started_at)
    VALUES (p_event_id, NOW())
    RETURNING * INTO v_session;

    RETURN row_to_json(v_session);
END;
$$;

-- Draw next winner for a prize. winner_index is 1-based (same as before).
-- Eligible = is_eligible, present (QR registrant or checked-in VIP), and has not won yet.
-- A scripted winner for the slot always wins.
CREATE OR REPLACE FUNCTION draw_winner(p_prize_id INT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_prize prizes;
    v_session_id INT;
    v_drawn INT;
    v_next INT;
    v_scripted_id INT;
    v_winner participants;
    v_result draw_results;
    v_total INT;
    v_done INT;
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

    -- Lock the prize row so two clicks can't draw the same slot
    SELECT * INTO v_prize FROM prizes WHERE id = p_prize_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Prize not found'; END IF;

    SELECT id INTO v_session_id FROM draw_sessions
    WHERE event_id = v_prize.event_id AND ended_at IS NULL
    ORDER BY started_at DESC LIMIT 1;
    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'No active draw session. Please start session first';
    END IF;

    SELECT COUNT(*) INTO v_drawn FROM draw_results WHERE prize_id = p_prize_id;
    IF v_drawn >= v_prize.winner_count THEN
        RAISE EXCEPTION 'All winners for this prize have been drawn';
    END IF;
    v_next := v_drawn + 1;

    -- Scripted winner for this slot?
    SELECT participant_id INTO v_scripted_id FROM scripted_winners
    WHERE prize_id = p_prize_id AND winner_index = v_next;

    IF v_scripted_id IS NOT NULL THEN
        SELECT * INTO v_winner FROM participants WHERE id = v_scripted_id;
    ELSE
        -- Present = registered via QR (on site) or VIP who has checked in
        SELECT * INTO v_winner FROM participants p
        WHERE p.event_id = v_prize.event_id
          AND p.is_eligible = TRUE
          AND (p.is_pre_registered = FALSE OR p.checked_in = TRUE)
          AND NOT EXISTS (SELECT 1 FROM draw_results dr
                          WHERE dr.event_id = v_prize.event_id AND dr.participant_id = p.id)
        ORDER BY random()
        LIMIT 1;
    END IF;

    IF v_winner.id IS NULL THEN
        RAISE EXCEPTION 'Tiada peserta yang hadir dan layak / No eligible checked-in participants';
    END IF;

    INSERT INTO draw_results (event_id, prize_id, participant_id, draw_session_id, winner_index, drawn_at)
    VALUES (v_prize.event_id, p_prize_id, v_winner.id, v_session_id, v_next, NOW())
    RETURNING * INTO v_result;

    -- All prizes in this event fully drawn?
    SELECT COUNT(*) FILTER (WHERE COALESCE(d.cnt, 0) >= p.winner_count), COUNT(*)
    INTO v_done, v_total
    FROM prizes p
    LEFT JOIN (
        SELECT prize_id, COUNT(*) AS cnt FROM draw_results
        WHERE event_id = v_prize.event_id GROUP BY prize_id
    ) d ON d.prize_id = p.id
    WHERE p.event_id = v_prize.event_id;

    RETURN json_build_object(
        'draw_result_id', v_result.id,
        'winner_index', v_next,
        'total_winners', v_prize.winner_count,
        'winner', json_build_object('id', v_winner.id, 'name', v_winner.name, 'email', v_winner.email),
        'prize', json_build_object('id', v_prize.id, 'title', v_prize.title, 'image_url', v_prize.image_url),
        'drawn_at', v_result.drawn_at,
        'all_prizes_completed', v_done = v_total
    );
END;
$$;

-- ------------------------------------------------------------
-- PERMISSIONS
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION start_draw_session(INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION draw_winner(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION start_draw_session(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION draw_winner(INT) TO authenticated;

GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_event(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_active_event() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_participant(INT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION participant_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_completed_events() TO anon, authenticated;

-- ------------------------------------------------------------
-- 5. MYSTERY PRIZES + VIP CHECK-IN
-- ------------------------------------------------------------
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS is_mystery BOOLEAN DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS checkin_code VARCHAR(6);

-- 6-char code without look-alike characters (no 0/O, 1/I/L)
CREATE OR REPLACE FUNCTION gen_checkin_code()
RETURNS TEXT
LANGUAGE sql VOLATILE
AS $$
    SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::INT, 1), '')
    FROM generate_series(1, 6);
$$;

-- Every VIP gets a code automatically when added
CREATE OR REPLACE FUNCTION set_checkin_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_pre_registered AND NEW.checkin_code IS NULL THEN
        NEW.checkin_code := gen_checkin_code();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_checkin_code ON participants;
CREATE TRIGGER trg_set_checkin_code
    BEFORE INSERT OR UPDATE OF is_pre_registered ON participants
    FOR EACH ROW EXECUTE FUNCTION set_checkin_code();

-- Give existing VIPs a code
UPDATE participants SET checkin_code = gen_checkin_code()
WHERE is_pre_registered = TRUE AND checkin_code IS NULL;

-- Public VIP check-in with email + code.
-- Returns { status: 'success' | 'already', name }. Never exposes other data.
CREATE OR REPLACE FUNCTION participant_checkin(p_event_id INT, p_email TEXT, p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_p participants;
BEGIN
    SELECT p.* INTO v_p
    FROM participants p
    JOIN events e ON e.id = p.event_id AND e.is_archived = FALSE
    WHERE p.event_id = p_event_id
      AND p.is_pre_registered = TRUE
      AND LOWER(p.email) = LOWER(TRIM(p_email))
      AND p.checkin_code = UPPER(TRIM(p_code))
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Email atau kod tidak sah.';
    END IF;

    IF v_p.checked_in THEN
        RETURN json_build_object('status', 'already', 'name', v_p.name);
    END IF;

    UPDATE participants SET checked_in = TRUE WHERE id = v_p.id;
    RETURN json_build_object('status', 'success', 'name', v_p.name);
END;
$$;

GRANT EXECUTE ON FUNCTION participant_checkin(INT, TEXT, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 6. STORAGE — prize images (bucket "prizes")
-- Public bucket: anyone can view images via public URL.
-- Only admins (is_admin) can upload / replace / delete.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('prizes', 'prizes', TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read prizes bucket" ON storage.objects;
CREATE POLICY "Public read prizes bucket" ON storage.objects
    FOR SELECT TO anon, authenticated USING (bucket_id = 'prizes');

DROP POLICY IF EXISTS "Admin upload prizes" ON storage.objects;
CREATE POLICY "Admin upload prizes" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'prizes' AND public.is_admin());

DROP POLICY IF EXISTS "Admin update prizes" ON storage.objects;
CREATE POLICY "Admin update prizes" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'prizes' AND public.is_admin());

DROP POLICY IF EXISTS "Admin delete prizes" ON storage.objects;
CREATE POLICY "Admin delete prizes" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'prizes' AND public.is_admin());

-- ------------------------------------------------------------
-- 7. REALTIME — lobby updates live when a VIP checks in
-- RLS still applies: only admins receive participant changes.
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE participants;
    END IF;
END $$;

-- ------------------------------------------------------------
-- ADD AN ADMIN
-- 1. Supabase > Authentication > Users > Add user (email + password)
-- 2. Then run (same email):
--    INSERT INTO admins (name, email) VALUES ('Admin', 'you@example.com')
--    ON CONFLICT (email) DO NOTHING;
-- ------------------------------------------------------------
