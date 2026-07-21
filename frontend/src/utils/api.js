import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Flag and queue to prevent concurrent refresh race conditions
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Queue & Auto-Refresh Token on Expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 TOKEN_EXPIRED and request hasn't been retried
    if (
      error.response?.status === 401 &&
      (error.response?.data?.code === 'TOKEN_EXPIRED' || error.response?.data?.message === 'Token expired.') &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue concurrent requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          isRefreshing = false;
          processQueue(new Error('No refresh token available'), null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return reject(error);
        }

        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

        axios
          .post(`${baseURL}/api/auth/refresh`, { refreshToken })
          .then(({ data }) => {
            const { accessToken, refreshToken: newRefreshToken } = data;
            localStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }

            api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            processQueue(null, accessToken);
            resolve(api(originalRequest));
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
