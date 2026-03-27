import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PlatformAdapter } from './platform.interface';
import { createPlatformAdapter } from './index';

const PlatformContext = createContext<PlatformAdapter | null>(null);

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  const [platform, setPlatform] = useState<PlatformAdapter | null>(null);

  useEffect(() => {
    createPlatformAdapter().then(setPlatform);
  }, []);

  if (!platform) return null; // Loading platform adapter

  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformAdapter {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within a <PlatformProvider>');
  }
  return ctx;
}
