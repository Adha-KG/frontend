import { authAPI } from "./api";
import { useAuthStore } from "./auth-store";

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Enhanced fetch with automatic token refresh on 401 errors
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const authStore = useAuthStore.getState();
  const accessToken =
    authStore.access_token || localStorage.getItem("access_token");

  // Add auth header if token exists
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  // Only set Content-Type for requests with a body (POST, PUT, PATCH, etc.)
  // This allows GET requests for downloads to work without Content-Type
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  // Make the request
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && accessToken) {
    // If we're already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
      await refreshPromise;
      // Retry with new token
      const newToken =
        useAuthStore.getState().access_token ||
        localStorage.getItem("access_token");
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    } else {
      // Start refresh process
      isRefreshing = true;
      refreshPromise = refreshAccessToken();

      try {
        await refreshPromise;
        // Retry original request with new token
        const newToken =
          useAuthStore.getState().access_token ||
          localStorage.getItem("access_token");
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`);
          response = await fetch(url, {
            ...options,
            headers,
          });
        } else {
          // Refresh failed, clear auth and redirect to login
          authStore.clearAuth();
          if (typeof window !== "undefined") {
            window.location.href = "/auth/sign-in";
          }
          throw new Error("Authentication failed. Please log in again.");
        }
      } catch (error) {
        // Refresh failed, clear auth and redirect to login
        authStore.clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/sign-in";
        }
        throw error;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }
  }

  return response;
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<void> {
  const authStore = useAuthStore.getState();
  const refreshToken =
    authStore.refresh_token || localStorage.getItem("refresh_token");

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    const response = await authAPI.refreshToken(refreshToken);
    authStore.setAuth(
      response.user,
      response.access_token,
      response.refresh_token,
    );
  } catch (error) {
    // Refresh failed, clear auth
    authStore.clearAuth();
    throw error;
  }
}

/**
 * Initialize auth state from localStorage on app load
 */
export function initializeAuth(): void {
  if (typeof window === "undefined") return;

  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");
  const userStr = localStorage.getItem("user");

  if (accessToken && refreshToken && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.getState().setAuth(user, accessToken, refreshToken);
    } catch (error) {
      console.error("Failed to initialize auth from storage:", error);
      useAuthStore.getState().clearAuth();
    }
  }
}
