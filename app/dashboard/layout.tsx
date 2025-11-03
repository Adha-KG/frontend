import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - PDF Management System',
  description: 'AI-Assisted Student Helper Dashboard',
  keywords: 'PDF, AI, student, helper, dashboard, management',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout min-h-screen">
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}