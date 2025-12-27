"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { authAPI } from "@/lib/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter();
  const { access_token, refresh_token, isAuthenticated, setAuth, setLoading } =
    useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      setIsChecking(true);

      // Check if we have tokens
      const token = access_token || localStorage.getItem("access_token");
      const refresh = refresh_token || localStorage.getItem("refresh_token");

      if (!token || !refresh) {
        // No tokens, redirect to login
        const returnUrl =
          typeof window !== "undefined"
            ? encodeURIComponent(window.location.pathname)
            : "";
        router.push(
          `/auth/sign-in${returnUrl ? `?returnUrl=${returnUrl}` : ""}`,
        );
        return;
      }

      // Verify token by fetching current user
      try {
        const user = await authAPI.getCurrentUser();

        // Update auth store with fresh user data
        const storedToken = localStorage.getItem("access_token");
        const storedRefresh = localStorage.getItem("refresh_token");
        if (storedToken && storedRefresh) {
          setAuth(user, storedToken, storedRefresh);
        }

        setIsChecking(false);
      } catch {
        // Token invalid or expired, try to refresh
        try {
          const refreshToken = refresh || localStorage.getItem("refresh_token");
          if (refreshToken) {
            const response = await authAPI.refreshToken(refreshToken);
            setAuth(
              response.user,
              response.access_token,
              response.refresh_token,
            );
            setIsChecking(false);
          } else {
            throw new Error("No refresh token");
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          console.error("Auth check failed:", refreshError);
          const returnUrl =
            typeof window !== "undefined"
              ? encodeURIComponent(window.location.pathname)
              : "";
          router.push(
            `/auth/sign-in${returnUrl ? `?returnUrl=${returnUrl}` : ""}`,
          );
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [access_token, refresh_token, router, setAuth, setLoading]);

  if (isChecking) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
