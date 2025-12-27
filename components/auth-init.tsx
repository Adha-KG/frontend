"use client";

import { useEffect } from "react";
import { initializeAuth } from "@/lib/api-client";

export function AuthInit() {
  useEffect(() => {
    // Initialize auth from localStorage on app load
    initializeAuth();
  }, []);

  return null;
}
