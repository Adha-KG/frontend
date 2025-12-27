import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./api";

interface AuthState {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, access_token: string, refresh_token: string) => void;
  setUser: (user: User) => void;
  setTokens: (access_token: string, refresh_token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
} as const;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, access_token, refresh_token) => {
        // Store in localStorage for API client access
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
        set({
          user,
          access_token,
          refresh_token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setUser: (user) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
        set({ user });
      },

      setTokens: (access_token, refresh_token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
        }
        set({ access_token, refresh_token });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          // Also clear old token key for backward compatibility
          localStorage.removeItem("token");
          localStorage.removeItem("tokenType");
          localStorage.removeItem("username");
          localStorage.removeItem("userId");
        }
        set({
          user: null,
          access_token: null,
          refresh_token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Initialize auth state from localStorage on mount
if (typeof window !== "undefined") {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);

  if (accessToken && refreshToken && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.getState().setAuth(user, accessToken, refreshToken);
    } catch (error) {
      console.error("Failed to parse stored user data:", error);
      useAuthStore.getState().clearAuth();
    }
  }
}
