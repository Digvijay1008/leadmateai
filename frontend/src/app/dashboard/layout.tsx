import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-100 dark:bg-[#0a0f1c] font-body text-slate-900 dark:text-slate-100 flex relative">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col relative z-0">
          <TopBar />
          <main className="p-8 flex-1 mt-20">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

