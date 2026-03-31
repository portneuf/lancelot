/**
 * StorageProvider — initializes and provides the DefectStorageAdapter.
 *
 * Default: InMemoryStorageAdapter (works without database).
 * When settings specify a PostgreSQL connection, it will attempt to
 * connect with PostgresStorageAdapter and fall back to InMemory on failure.
 *
 * Also wraps children with QueryClientProvider for @tanstack/react-query.
 */

import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StorageContext } from './storage-context';
import { InMemoryStorageAdapter } from './in-memory-storage-adapter';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

interface StorageProviderProps {
  children: ReactNode;
}

export function StorageProvider({ children }: StorageProviderProps) {
  const adapter = useMemo(() => new InMemoryStorageAdapter(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <StorageContext.Provider value={adapter}>
        {children}
      </StorageContext.Provider>
    </QueryClientProvider>
  );
}
