/**
 * Storage adapter access for both standalone and portal mode.
 *
 * In standalone mode: StorageProvider wraps the app with React Context + QueryClientProvider.
 * In portal mode: a module-level singleton is used since portal components are
 * lazy-loaded independently (no shared React tree wrapper).
 *
 * The useStorage() hook works in both modes transparently.
 */
import type { DefectStorageAdapter } from './storage-adapter.interface';
export declare const StorageContext: import("react").Context<DefectStorageAdapter | null>;
export declare function getStorageSingleton(): DefectStorageAdapter;
export declare function useStorage(): DefectStorageAdapter;
