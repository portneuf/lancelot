/**
 * Color scale utilities for wafer map defect visualization.
 *
 * Provides categorical (class-based) and sequential (size-based) color scales.
 */
/** 8-color categorical palette for defect classes (visually distinct). */
export declare const CATEGORICAL_PALETTE: readonly ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#e11d48", "#65a30d"];
/**
 * Get a categorical color for a class number.
 */
export declare function getCategoricalColor(classNumber: number): string;
/**
 * Build a Map<classNumber, color> from class numbers.
 */
export declare function buildClassColorMap(classNumbers: number[]): Map<number, string>;
/**
 * Interpolate a sequential color scale from blue to red.
 *
 * @param t - Normalized value 0..1 (0 = min, 1 = max)
 * @returns CSS color string
 */
export declare function sequentialColor(t: number): string;
/**
 * Precompute a sequential color lookup table for fast rendering.
 *
 * @param steps - Number of discrete colors (default 256)
 * @returns Array of CSS color strings
 */
export declare function buildSequentialLUT(steps?: number): string[];
