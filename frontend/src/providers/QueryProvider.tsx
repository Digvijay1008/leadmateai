'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { ToastProvider } from '@/components/ui/toast-provider';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Global stale time: 60s — per-hook overrides for KB (5min) and sessions (30s)
            staleTime: 60 * 1000,
            // Retry twice with exponential backoff before showing error state
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
            refetchOnWindowFocus: false,
            // Keeps previous data visible while new page loads (pagination UX)
            placeholderData: (prev: unknown) => prev,
          },
          mutations: {
            // Surface mutation errors to toast — hooks add their own onError handlers
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
