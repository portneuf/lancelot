/**
 * Storage adapter access for both standalone and portal mode.
 *
 * In standalone mode: StorageProvider wraps the app with React Context + QueryClientProvider.
 * In portal mode: a module-level singleton is used since portal components are
 * lazy-loaded independently (no shared React tree wrapper).
 *
 * The useStorage() hook works in both modes transparently.
 */

import { createContext, useContext } from 'react';
import type { DefectStorageAdapter } from './storage-adapter.interface';
import { InMemoryStorageAdapter } from './in-memory-storage-adapter';

export const StorageContext = createContext<DefectStorageAdapter | null>(null);

// Module-level singleton for portal mode (components share this instance
// even without a common React Context parent, same pattern as Zustand stores).
let _singleton: DefectStorageAdapter | null = null;

export function getStorageSingleton(): DefectStorageAdapter {
  if (!_singleton) {
    _singleton = new InMemoryStorageAdapter();
  }
  return _singleton;
}

export function useStorage(): DefectStorageAdapter {
  const fromContext = useContext(StorageContext);
  if (fromContext) return fromContext;
  // Fallback to singleton (portal mode — no provider in tree)
  return getStorageSingleton();
}
