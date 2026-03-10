import api from './api';

const eventService = {

    async getAll() {
        const response = await api.get('/events');
        return response.data.data;
    },
    
    async archive(id) {
        const response = await api.put(`/events/${id}/archive`);
        return response.data.data;
      },

    async getById(id) {
        const response = await api.get(`/events/${id}`);
        return response.data.data;
    },

    async create(data) {
        const response = await api.post('/events', data);
        return response.data.data;
    },

    async update(id, data) {
        const response = await api.put(`/events/${id}`, data);
        return response.data.data;
    },

    async openRegistration(id, duration_minutes) {
        const response = await api.post(`/events/${id}/registration/open`, { duration_minutes });
        return response.data.data;
    },

    async closeRegistration(id) {
        const response = await api.post(`/events/${id}/registration/close`);
        return response.data.data;
    },

};

export default eventService;