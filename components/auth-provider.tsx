"use client";

import { useEffect } from "react";
import { initializeAuth } from "@/lib/api-client";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    // Initialize auth from localStorage on mount
    initializeAuth();
  }, []);

  return <>{children}</>;
}
