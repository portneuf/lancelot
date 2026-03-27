import { create } from 'zustand';

export interface DefectFilterCriteria {
  classNumbers: Set<number>;
  sizeRange: [number | null, number | null];
  selectedDies: Set<string>;
  searchText: string;
  testNumbers: Set<number>;
}

export interface InspectionState {
  activeWaferIndex: number;
  selectedDefectIds: Set<number>;
  highlightedDefectId: number | null;
  hoveredDie: { xIndex: number; yIndex: number } | null;
  filters: DefectFilterCriteria;

  setActiveWafer: (index: number) => void;
  selectDefects: (ids: number[]) => void;
  highlightDefect: (id: number | null) => void;
  setHoveredDie: (die: { xIndex: number; yIndex: number } | null) => void;
  updateFilters: (filters: Partial<DefectFilterCriteria>) => void;
  clearFilters: () => void;
  resetSelection: () => void;
}

const initialFilters: DefectFilterCriteria = {
  classNumbers: new Set(),
  sizeRange: [null, null],
  selectedDies: new Set(),
  searchText: '',
  testNumbers: new Set(),
};

export const useInspectionStore = create<InspectionState>()((set) => ({
  activeWaferIndex: 0,
  selectedDefectIds: new Set(),
  highlightedDefectId: null,
  hoveredDie: null,
  filters: { ...initialFilters },

  setActiveWafer: (index) => set({ activeWaferIndex: index }),

  selectDefects: (ids) => set({ selectedDefectIds: new Set(ids) }),

  highlightDefect: (id) => set({ highlightedDefectId: id }),

  setHoveredDie: (die) => set({ hoveredDie: die }),

  updateFilters: (patch) =>
    set((state) => ({
      filters: { ...state.filters, ...patch },
    })),

  clearFilters: () => set({ filters: { ...initialFilters } }),

  resetSelection: () =>
    set({
      selectedDefectIds: new Set(),
      highlightedDefectId: null,
      hoveredDie: null,
    }),
}));
