/**
 * StorageProvider — initializes and provides the DefectStorageAdapter.
 *
 * Default: InMemoryStorageAdapter (works without database).
 * When settings specify PostgreSQL mode, attempts to connect on mount
 * and falls back to InMemory on failure.
 *
 * Also wraps children with QueryClientProvider for @tanstack/react-query.
 */
import type { ReactNode } from 'react';
interface StorageProviderProps {
    children: ReactNode;
}
export declare function StorageProvider({ children }: StorageProviderProps): import("react/jsx-runtime").JSX.Element;
export {};
