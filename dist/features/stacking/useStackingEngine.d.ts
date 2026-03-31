/**
 * Stacking engine hook — computes aggregated heatmap data
 * from multiple wafers via the storage adapter.
 */
import type { InspectionFile } from '@/core/models/inspection-file';
import type { AggregationMode, HeatmapCell } from '@/core/storage';
export interface StackingResult {
    cells: HeatmapCell[];
    waferCount: number;
    gridSize: number;
    aggregation: AggregationMode;
    maxValue: number;
}
/**
 * Compute stacked wafer map data from multiple files.
 * Runs entirely in-memory for immediate results.
 */
export declare function computeStacking(files: InspectionFile[], aggregation: AggregationMode, gridSize: number): StackingResult;
/**
 * React hook wrapper for computeStacking with memoization.
 */
export declare function useStackingEngine(files: InspectionFile[], aggregation: AggregationMode, gridSize: number): StackingResult;
