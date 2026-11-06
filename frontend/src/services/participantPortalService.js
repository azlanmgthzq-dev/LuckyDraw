// participantPortalService.js — Public participant portal (no login).
// Uses database functions so anon users never read the tables directly.
import { supabase, check } from './supabaseClient';

const participantPortalService = {
    // Event info for /daftar/:eventId (includes draw_started)
    async getEventById(eventId) {
        const data = check(await supabase.rpc('get_public_event', { p_event_id: Number(eventId) }));
        if (!data) throw new Error('Event tidak ditemui / Event not found');
        return data;
    },

    // Event open for registration, or null
    async getActiveEvent() {
        return check(await supabase.rpc('get_active_event'));
    },

    async register({ event_id, name, phone, email }) {
        return check(await supabase.rpc('register_participant', {
            p_event_id: Number(event_id),
            p_name: name,
            p_phone: phone,
            p_email: email || null,
        }));
    },

    async login(name, phone) {
        return check(await supabase.rpc('participant_login', { p_name: name, p_phone: phone }));
    },

    // VIP check-in: returns { status: 'success' | 'already', name }
    async checkIn(eventId, email, code) {
        return check(await supabase.rpc('participant_checkin', {
            p_event_id: Number(eventId),
            p_email: email,
            p_code: code,
        }));
    },

    // { id, name, checked_in, win: null | { prize_title, prize_image, winner_index } }
    async getWin(eventId, email, code) {
        return check(await supabase.rpc('get_participant_win', {
            p_event_id: Number(eventId),
            p_email: email,
            p_code: code,
        }));
    },

    // Calls onNewResult() when a draw result is saved for this participant
    subscribeToWin(participantId, onNewResult) {
        const channel = supabase
            .channel(`win-${participantId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'draw_results', filter: `participant_id=eq.${participantId}` },
                () => onNewResult()
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    },

    async getCompletedEvents() {
        return check(await supabase.rpc('get_completed_events')) ?? [];
    },

    // Session helpers — sessionStorage (cleared when tab closes)
    saveSession(participant) {
        sessionStorage.setItem('participant', JSON.stringify(participant));
    },

    getSession() {
        const data = sessionStorage.getItem('participant');
        return data ? JSON.parse(data) : null;
    },

    clearSession() {
        sessionStorage.removeItem('participant');
    },

    isLoggedIn() {
        return !!sessionStorage.getItem('participant');
    },
};

export default participantPortalService;
