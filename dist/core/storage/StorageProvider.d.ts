/**
 * StorageProvider — initializes and provides the DefectStorageAdapter.
 *
 * Default: InMemoryStorageAdapter (works without database).
 * When settings specify a PostgreSQL connection, it will attempt to
 * connect with PostgresStorageAdapter and fall back to InMemory on failure.
 *
 * Also wraps children with QueryClientProvider for @tanstack/react-query.
 */
import type { ReactNode } from 'react';
interface StorageProviderProps {
    children: ReactNode;
}
export declare function StorageProvider({ children }: StorageProviderProps): import("react/jsx-runtime").JSX.Element;
export {};
