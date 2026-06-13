import { create } from 'zustand';
import { authApi } from '@/api/auth.api';

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
    }),

  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.me();
      set({
        user: data.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return data.data.user;
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return null;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
