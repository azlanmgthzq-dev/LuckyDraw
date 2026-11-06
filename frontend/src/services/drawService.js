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

    // Returns { winner_index, total_winners, winner: {id,name,email}, prize: {...}, all_prizes_completed, ... }
    async draw(prizeId) {
        return check(await supabase.rpc('draw_winner', { p_prize_id: Number(prizeId) }));
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
