/**
 * Auth store using Zustand
 */
import { create } from "zustand";
import { authService } from "../services/authService";
import type { User, LoginCredentials } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      await authService.login(credentials);
      set({ isAuthenticated: true, isLoading: false });
      // Load user data in background after login succeeds
      authService
        .getCurrentUser()
        .then((user) => {
          set({ user });
        })
        .catch((error) => {
          console.error("Failed to load user after login:", error);
        });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Login failed";
      set({ error: errorMessage, isLoading: false, isAuthenticated: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  loadUser: async () => {
    if (!authService.isAuthenticated()) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
