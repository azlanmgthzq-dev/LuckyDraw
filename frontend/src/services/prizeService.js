import api from './api';

const prizeService = {

    async getAll(eventId) {
        const response = await api.get(`/events/${eventId}/prizes`);
        return response.data.data;
    },

    async create(eventId, data) {
        const response = await api.post(`/events/${eventId}/prizes`, data);
        return response.data.data;
    },

    async update(id, data) {
        const response = await api.put(`/prizes/${id}`, data);
        return response.data.data;
    },

    async delete(id) {
        await api.delete(`/prizes/${id}`);
    },

    async setScriptedWinner(prizeId, participantId, winnerIndex) {
        const response = await api.post(`/prizes/${prizeId}/scripted-winner`, {
            participant_id: participantId,
            winner_index: winnerIndex
        });
        return response.data.data;
    },

    async getScriptedWinners(prizeId) {
        const response = await api.get(`/prizes/${prizeId}/scripted-winner`);
        return response.data.data;
    },

};

export default prizeService;