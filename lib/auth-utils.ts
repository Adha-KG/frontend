import { useAuthStore } from "./auth-store";
import { useRouter } from "next/navigation";

/**
 * Sign out the current user
 */
export function signOut(router?: ReturnType<typeof useRouter>) {
  const authStore = useAuthStore.getState();
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
