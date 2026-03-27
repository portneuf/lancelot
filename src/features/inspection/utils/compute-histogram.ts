/**
 * Compute histogram bin counts for a set of numeric values.
 *
 * @param values - The raw numeric values to bin
 * @param min - Lower bound of the histogram range
 * @param max - Upper bound of the histogram range
 * @param binCount - Number of bins (default 30)
 * @returns Array of bin counts, length === binCount
 */
export function computeHistogramBins(
  values: number[],
  min: number,
  max: number,
  binCount = 30,
): number[] {
  if (values.length === 0 || min >= max) {
    return new Array(binCount).fill(0);
  }

  const bins = new Array<number>(binCount).fill(0);
  const range = max - min;
  const binWidth = range / binCount;

  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    bins[idx]++;
  }

  return bins;
}
