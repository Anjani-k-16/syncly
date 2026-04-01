import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let queue = [];

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      if (refreshing) {
        return new Promise((res, rej) => queue.push({ res, rej })).then(() => api(orig));
      }
      refreshing = true;
      try {
        const rt = localStorage.getItem('refreshToken');
        if (!rt) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken: rt });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        queue.forEach(({ res }) => res());
        queue = [];
        return api(orig);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
