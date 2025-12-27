"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-utils";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    signOut(router);
  };

  return <Button onClick={handleLogout}>Logout</Button>;
}
