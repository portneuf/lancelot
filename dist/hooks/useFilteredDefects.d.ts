/**
 * Global hook that computes filtered defects from the active file
 * based on the current filter criteria in inspection-store.
 *
 * Used by all views (DefectTable, WaferMap, Analysis charts) to ensure
 * consistent filtering across the entire application.
 */
import type { DefectRecord } from '@/core/models/defect';
export declare function useFilteredDefects(): {
    file: import("../portal-entry").InspectionFile | undefined;
    filteredDefects: DefectRecord[];
    totalCount: number;
    filteredCount: number;
    isFiltered: boolean;
};
