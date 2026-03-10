import api from './api';

const participantPortalService = {

    async register(data) {
        const response = await api.post('/participant/register', data);
        return response.data.data;
    },

    async login(name, phone) {
        const response = await api.post('/participant/login', { name, phone });
        return response.data.data;
    },

    async getActiveEvent() {
        const response = await api.get('/participant/active-event');
        return response.data.data; // null if no active event
    },

    async getCompletedEvents() {
        const response = await api.get('/participant/events/completed');
        return response.data.data;
    },

    // Session helpers — simpan dalam sessionStorage (cleared bila tab tutup)
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
    }
};

export default participantPortalService;