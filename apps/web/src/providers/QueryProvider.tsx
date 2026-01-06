'use client';

import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { useState, type ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { queryKeys } from '@/lib/queries';
import { fetchBookings, fetchClaims, fetchPreferences } from '@/lib/api';

// Shared query client configuration
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep unused data in cache for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Show stale data while revalidating
        placeholderData: keepPreviousData,
        // Don't refetch on window focus by default
        refetchOnWindowFocus: false,
        // Retry failed requests up to 3 times
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const pathname = usePathname();

  // Prefetch data for common routes
  useEffect(() => {
    const prefetchCommonData = () => {
      // Prefetch bookings list (commonly accessed)
      void queryClient.prefetchQuery({
        queryKey: [...queryKeys.bookings, undefined],
        queryFn: () => fetchBookings(),
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch claims list
      void queryClient.prefetchQuery({
        queryKey: [...queryKeys.claims, undefined],
        queryFn: () => fetchClaims(),
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch user preferences
      void queryClient.prefetchQuery({
        queryKey: queryKeys.preferences,
        queryFn: () => fetchPreferences(),
        staleTime: 10 * 60 * 1000, // Preferences change less frequently
      });
    };

    // Only prefetch if user is likely authenticated (not on login/register pages)
    if (pathname && !pathname.includes('/login') && !pathname.includes('/register')) {
      prefetchCommonData();
    }
  }, [queryClient, pathname]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
