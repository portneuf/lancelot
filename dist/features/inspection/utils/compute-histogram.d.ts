/**
 * Compute histogram bin counts for a set of numeric values.
 *
 * @param values - The raw numeric values to bin
 * @param min - Lower bound of the histogram range
 * @param max - Upper bound of the histogram range
 * @param binCount - Number of bins (default 30)
 * @returns Array of bin counts, length === binCount
 */
export declare function computeHistogramBins(values: number[], min: number, max: number, binCount?: number): number[];
