import api from './api';

const authService = {

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { token, data } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('admin', JSON.stringify(data));
    return data;
  },

  async me() {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    window.location.href = '/login';
  },

  getToken() {
    return localStorage.getItem('token');
  },

  getAdmin() {
    const admin = localStorage.getItem('admin');
    return admin ? JSON.parse(admin) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

};

export default authService;