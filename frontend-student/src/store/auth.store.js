import { create } from 'zustand';
import { authApi } from '@/api/student.api';
import { bootstrapSession } from '@/utils/authBootstrap';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authError: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
      authError: null,
    }),

  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
    }),

  fetchMe: async ({ silent = false } = {}) => {
    if (!silent) {
      set({ isLoading: true, authError: null });
    }

    try {
      const result = await bootstrapSession(
        () => authApi.me(),
        (user) => user.role === 'student',
      );
      set({
        user: result.user,
        isAuthenticated: result.isAuthenticated,
        isLoading: false,
        authError: null,
      });
      return result.user;
    } catch {
      const current = get();
      set({
        user: current.user,
        isAuthenticated: current.isAuthenticated && Boolean(current.user),
        isLoading: false,
        authError:
          'We could not verify your session right now. Check your connection and refresh the page.',
      });
      return current.user;
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
        authError: null,
      });
    }
  },
}));
