// drawService.js — Draw logic. Start + draw run as database functions
// (see supabase/supabase_setup.sql) so they are atomic and admin-only.
import { supabase, check } from './supabaseClient';

const drawService = {
    async startSession(eventId) {
        return check(await supabase.rpc('start_draw_session', { p_event_id: Number(eventId) }));
    },

    async endSession(eventId) {
        const rows = check(await supabase
            .from('draw_sessions')
            .update({ ended_at: new Date().toISOString() })
            .eq('event_id', eventId)
            .is('ended_at', null)
            .select());
        if (!rows.length) {
            const err = new Error('No active draw session found');
            err.response = { data: { message: err.message } };
            throw err;
        }
        return rows[0];
    },

    // draw_winner returns a one-row table:
    // [{ result_id, participant_id, participant_name, participant_phone, prize_title, prize_image, is_mystery, winner_index }]
    // Returns that row as a plain object, or null if nothing came back.
    async draw(prizeId) {
        const data = check(await supabase.rpc('draw_winner', { p_prize_id: Number(prizeId) }));
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return null;
        return {
            result_id: row.result_id,
            participant_id: row.participant_id,
            participant_name: row.participant_name,
            participant_phone: row.participant_phone,
            prize_title: row.prize_title,
            prize_image: row.prize_image,
            is_mystery: row.is_mystery,
            winner_index: row.winner_index,
        };
    },

    async getResults(eventId) {
        const rows = check(await supabase
            .from('draw_results')
            .select('id, prize_id, winner_index, drawn_at, participant_id, participants ( name, email ), prizes ( title, image_url, prize_order )')
            .eq('event_id', eventId));

        return rows
            .map(r => ({
                id: r.id,
                prize_id: r.prize_id,
                winner_index: r.winner_index,
                drawn_at: r.drawn_at,
                participant_id: r.participant_id,
                winner_name: r.participants?.name,
                winner_email: r.participants?.email,
                prize_title: r.prizes?.title,
                prize_image: r.prizes?.image_url,
                prize_order: r.prizes?.prize_order,
            }))
            .sort((a, b) => (a.prize_order - b.prize_order) || (a.winner_index - b.winner_index));
    },
};

export default drawService;
