"use client";

import { ProtectedRoute } from "@/components/protected-route";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="dashboard-layout min-h-screen">
        <main className="w-full">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
