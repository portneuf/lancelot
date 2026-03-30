import type { ReactNode } from 'react';
export interface LancelotMode {
    mode: 'standalone' | 'portal';
    basePath: string;
}
interface LancelotModeProviderProps extends LancelotMode {
    children: ReactNode;
}
export declare function LancelotModeProvider({ mode, basePath, children }: LancelotModeProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useLancelotMode(): LancelotMode;
export {};
