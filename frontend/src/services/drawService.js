import api from './api';

const drawService = {

  async startSession(eventId) {
    const response = await api.post(`/events/${eventId}/draw-session/start`);
    return response.data.data;
  },

  async endSession(eventId) {
    const response = await api.post(`/events/${eventId}/draw-session/end`);
    return response.data.data;
  },

  async draw(prizeId) {
    const response = await api.post(`/prizes/${prizeId}/draw`);
    return response.data.data;
  },

  async getResults(eventId) {
    const response = await api.get(`/events/${eventId}/results`);
    return response.data.data;
  },

};

export default drawService;