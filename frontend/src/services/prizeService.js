// prizeService.js — Prizes via supabase-js (admin only, protected by RLS)
import { supabase, check } from './supabaseClient';

// Keep only real prize columns and convert form strings to numbers
function toPrizeRow({ title, image_url, prize_order, selection_method, winner_count, is_mystery }) {
    const row = {
        title,
        image_url: image_url || null,
        is_mystery: is_mystery === undefined ? undefined : !!is_mystery,
        prize_order: prize_order === '' || prize_order == null ? undefined : Number(prize_order),
        selection_method,
        winner_count: winner_count === '' || winner_count == null ? undefined : Number(winner_count),
    };
    return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
}

const prizeService = {
    async getAll(eventId) {
        return check(await supabase
            .from('prizes')
            .select('*')
            .eq('event_id', eventId)
            .order('prize_order', { ascending: true }));
    },

    async create(eventId, payload) {
        return check(await supabase
            .from('prizes')
            .insert([{ selection_method: 'random', winner_count: 1, ...toPrizeRow(payload), event_id: eventId }])
            .select()
            .single());
    },

    async update(id, payload) {
        return check(await supabase.from('prizes').update(toPrizeRow(payload)).eq('id', id).select().single());
    },

    async delete(id) {
        check(await supabase.from('prizes').delete().eq('id', id));
    },

    // winnerIndex is 1-based (slot #1 = first winner drawn)
    async setScriptedWinner(prizeId, participantId, winnerIndex) {
        return check(await supabase
            .from('scripted_winners')
            .upsert(
                [{ prize_id: prizeId, participant_id: participantId, winner_index: winnerIndex }],
                { onConflict: 'prize_id,winner_index' }
            )
            .select()
            .single());
    },

    async clearScriptedWinners(prizeId) {
        check(await supabase.from('scripted_winners').delete().eq('prize_id', prizeId));
    },

    async getScriptedWinners(prizeId) {
        const rows = check(await supabase
            .from('scripted_winners')
            .select('*, participants ( name, email )')
            .eq('prize_id', prizeId)
            .order('winner_index', { ascending: true }));
        return rows.map(({ participants, ...sw }) => ({
            ...sw,
            name: participants?.name,
            email: participants?.email,
        }));
    },
};

export default prizeService;
