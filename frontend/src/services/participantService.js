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

    async addVIP(eventId, data) {
        const response = await api.post(`/events/${eventId}/participants/preregister`, data);
        return response.data.data;
    },

    async checkIn(eventId, participantId) {
        const response = await api.post(`/events/${eventId}/participants/${participantId}/checkin`);
        return response.data.data;
    },

    async deleteOne(eventId, participantId) {
        const response = await api.delete(`/events/${eventId}/participants/${participantId}`);
        return response.data;
    },

    async deleteAll(eventId) {
        const response = await api.delete(`/events/${eventId}/participants/all`);
        return response.data;
    },

};

export default participantService;