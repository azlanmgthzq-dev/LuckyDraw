import api from './api';

const participantService = {

    async getAll(eventId) {
        const response = await api.get(`/events/${eventId}/participants`);
        return response.data.data;
    },

    async getCount(eventId) {
        const response = await api.get(`/events/${eventId}/participants/count`);
        return response.data.data.count;
    },

    async preRegister(eventId, data) {
        const response = await api.post(`/events/${eventId}/participants/preregister`, data);
        return response.data.data;
    },

    async checkIn(eventId, participantId) {
        const response = await api.post(`/events/${eventId}/participants/${participantId}/checkin`);
        return response.data.data;
    },

};

export default participantService;