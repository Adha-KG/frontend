import { useAuthStore } from "./auth-store";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase/client";

/**
 * Sign out the current user
 */
export async function signOut(router?: ReturnType<typeof useRouter>) {
  const authStore = useAuthStore.getState();

  // Clear Supabase session if it exists
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (error) {
    // If Supabase signout fails, continue with local cleanup
    console.warn("Failed to sign out from Supabase:", error);
  }

  // Clear local auth state
  authStore.clearAuth();

  // Redirect to login
  if (typeof window !== "undefined") {
    if (router) {
      router.push("/auth/sign-in");
    } else {
      window.location.href = "/auth/sign-in";
    }
  }
}
