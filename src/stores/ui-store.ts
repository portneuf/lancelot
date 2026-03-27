import { create } from 'zustand';

export interface UIState {
  activeNavSection: string;
  panelSizes: Record<string, number[]>;
  statusMessage: string | null;

  setActiveNavSection: (section: string) => void;
  setPanelSizes: (panelId: string, sizes: number[]) => void;
  setStatusMessage: (message: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeNavSection: 'file',
  panelSizes: {},
  statusMessage: null,

  setActiveNavSection: (section) => set({ activeNavSection: section }),
  setPanelSizes: (panelId, sizes) =>
    set((state) => ({
      panelSizes: { ...state.panelSizes, [panelId]: sizes },
    })),
  setStatusMessage: (message) => set({ statusMessage: message }),
}));
