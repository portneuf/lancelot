export interface DefectFilterCriteria {
    classNumbers: Set<number>;
    sizeRange: [number | null, number | null];
    numericRanges: Record<string, [number | null, number | null]>;
    selectedDies: Set<string>;
    searchText: string;
    testNumbers: Set<number>;
}
export interface InspectionState {
    activeWaferIndex: number;
    selectedDefectIds: Set<number>;
    highlightedDefectId: number | null;
    hoveredDie: {
        xIndex: number;
        yIndex: number;
    } | null;
    filters: DefectFilterCriteria;
    filteredDefectIds: Set<number> | null;
    setActiveWafer: (index: number) => void;
    selectDefects: (ids: number[]) => void;
    highlightDefect: (id: number | null) => void;
    setHoveredDie: (die: {
        xIndex: number;
        yIndex: number;
    } | null) => void;
    updateFilters: (filters: Partial<DefectFilterCriteria>) => void;
    clearFilters: () => void;
    resetSelection: () => void;
    setFilteredDefectIds: (ids: Set<number> | null) => void;
}
export declare const useInspectionStore: import("zustand").UseBoundStore<import("zustand").StoreApi<InspectionState>>;
