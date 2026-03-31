/**
 * StorageProvider — initializes and provides the DefectStorageAdapter.
 *
 * Default: InMemoryStorageAdapter (works without database).
 * When settings specify PostgreSQL mode, attempts to connect on mount
 * and falls back to InMemory on failure.
 *
 * Also wraps children with QueryClientProvider for @tanstack/react-query.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StorageContext } from './storage-context';
import { InMemoryStorageAdapter } from './in-memory-storage-adapter';
import { useSettingsStore } from '@/stores/settings-store';
import type { DefectStorageAdapter } from './storage-adapter.interface';
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
  const databaseMode = useSettingsStore((s) => s.databaseMode);
  const databaseConfig = useSettingsStore((s) => s.databaseConfig);
  const inMemory = useMemo(() => new InMemoryStorageAdapter(), []);
  const [adapter, setAdapter] = useState<DefectStorageAdapter>(inMemory);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (databaseMode !== 'remote') {
      setAdapter(inMemory);
      return;
    }

    if (connectingRef.current) return;
    connectingRef.current = true;

    (async () => {
      try {
        const { PostgresStorageAdapter } = await import('./postgres-storage-adapter');
        const pg = new PostgresStorageAdapter();
        await pg.connect({ type: 'remote', ...databaseConfig });
        await pg.migrate();
        setAdapter(pg);
        console.info('[Lancelot] Connected to PostgreSQL');
      } catch (err) {
        console.warn('[Lancelot] PostgreSQL connection failed, using in-memory:', err);
        setAdapter(inMemory);
      } finally {
        connectingRef.current = false;
      }
    })();
  }, [databaseMode, databaseConfig, inMemory]);

  return (
    <QueryClientProvider client={queryClient}>
      <StorageContext.Provider value={adapter}>
        {children}
      </StorageContext.Provider>
    </QueryClientProvider>
  );
}
