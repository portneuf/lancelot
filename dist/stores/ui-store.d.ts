export interface UIState {
    activeNavSection: string;
    panelSizes: Record<string, number[]>;
    statusMessage: string | null;
    setActiveNavSection: (section: string) => void;
    setPanelSizes: (panelId: string, sizes: number[]) => void;
    setStatusMessage: (message: string | null) => void;
}
export declare const useUIStore: import("zustand").UseBoundStore<import("zustand").StoreApi<UIState>>;
