import { create } from 'zustand';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  twoFactorEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requires2FA: boolean;
  pending2FAUserId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  requires2FA: false,
  pending2FAUserId: null,

  login: async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    if (response.data.requires2FA) {
      set({
        requires2FA: true,
        pending2FAUserId: response.data.userId,
      });
    } else {
      set({
        user: response.data.user,
        isAuthenticated: true,
        requires2FA: false,
        pending2FAUserId: null,
      });
    }
  },

  register: async (email: string, password: string) => {
    const response = await authApi.register(email, password);
    set({
      user: response.data.user,
      isAuthenticated: true,
    });
  },

  verify2FA: async (code: string) => {
    const userId = get().pending2FAUserId;
    if (!userId) throw new Error('No pending 2FA verification');
    
    const response = await authApi.verify2FA(userId, code);
    set({
      user: response.data.user,
      isAuthenticated: true,
      requires2FA: false,
      pending2FAUserId: null,
    });
  },

  logout: async () => {
    await authApi.logout();
    set({
      user: null,
      isAuthenticated: false,
      requires2FA: false,
      pending2FAUserId: null,
    });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response = await authApi.getMe();
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
