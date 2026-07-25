import { create } from 'zustand';
import api from '../utils/api';

const getInitialUser = () => {
  try {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const useAuthStore = create((set) => ({
  user: getInitialUser(),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isAuthenticated: true, loading: false, error: null });
      return user;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      const saved = localStorage.getItem('user');
      if (saved) {
        const user = JSON.parse(saved);
        await api.post('/api/auth/logout', { userId: user.id }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, loading: false, error: null });
    }
  },

  clearError: () => set({ error: null }),

  fetchMe: async () => {
    try {
      const res = await api.get('/api/users/me');
      if (res.data) {
        const updatedUser = {
          ...res.data,
          id: res.data._id
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
        return updatedUser;
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err);
    }
  },
  
  updateProfile: (updatedUserData) => {
    const saved = localStorage.getItem('user');
    if (saved) {
      const currentUser = JSON.parse(saved);
      const newUser = { ...currentUser, ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(newUser));
      set({ user: newUser });
    }
  }
}));

export default useAuthStore;
