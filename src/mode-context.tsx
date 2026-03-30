import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export interface LancelotMode {
  mode: 'standalone' | 'portal';
  basePath: string;
}

const defaultMode: LancelotMode = { mode: 'standalone', basePath: '/' };

const LancelotModeContext = createContext<LancelotMode>(defaultMode);

interface LancelotModeProviderProps extends LancelotMode {
  children: ReactNode;
}

export function LancelotModeProvider({ mode, basePath, children }: LancelotModeProviderProps) {
  return (
    <LancelotModeContext.Provider value={{ mode, basePath }}>
      {children}
    </LancelotModeContext.Provider>
  );
}

export function useLancelotMode(): LancelotMode {
  return useContext(LancelotModeContext);
}
