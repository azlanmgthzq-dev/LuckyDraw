// eventService.js — Events via supabase-js (admin only, protected by RLS)
import { supabase, check } from './supabaseClient';

// Registration has no countdown; a far-future close time keeps time checks working
const FAR_FUTURE = '2099-12-31T23:59:59Z';

const eventService = {
    async getAll() {
        return check(await supabase
            .from('events')
            .select('*')
            .eq('is_archived', false)
            .order('created_at', { ascending: false }));
    },

    async getById(id) {
        return check(await supabase.from('events').select('*').eq('id', id).single());
    },

    async create({ name, description, event_date }) {
        return check(await supabase
            .from('events')
            .insert([{ name, description: description || null, event_date: event_date || null, status: 'draft' }])
            .select()
            .single());
    },

    async update(id, { name, description, event_date, status }) {
        const fields = Object.fromEntries(
            Object.entries({ name, description, event_date, status }).filter(([, v]) => v !== undefined)
        );
        return check(await supabase.from('events').update(fields).eq('id', id).select().single());
    },

    async openRegistration(id) {
        return check(await supabase
            .from('events')
            .update({ registration_open: true, registration_closes_at: FAR_FUTURE, status: 'registration' })
            .eq('id', id)
            .select()
            .single());
    },

    async closeRegistration(id) {
        return check(await supabase
            .from('events')
            .update({ registration_open: false, status: 'ready' })
            .eq('id', id)
            .select()
            .single());
    },

    async archive(id) {
        return check(await supabase.from('events').update({ is_archived: true }).eq('id', id).select().single());
    },
};

export default eventService;
