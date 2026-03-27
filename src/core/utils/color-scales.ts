/**
 * Color scale utilities for wafer map defect visualization.
 *
 * Provides categorical (class-based) and sequential (size-based) color scales.
 */

/** 8-color categorical palette for defect classes (visually distinct). */
export const CATEGORICAL_PALETTE = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#ca8a04', // amber
  '#9333ea', // purple
  '#0891b2', // cyan
  '#e11d48', // rose
  '#65a30d', // lime
] as const;

/**
 * Get a categorical color for a class number.
 */
export function getCategoricalColor(classNumber: number): string {
  const idx = ((classNumber - 1) % CATEGORICAL_PALETTE.length + CATEGORICAL_PALETTE.length) % CATEGORICAL_PALETTE.length;
  return CATEGORICAL_PALETTE[idx];
}

/**
 * Build a Map<classNumber, color> from class numbers.
 */
export function buildClassColorMap(classNumbers: number[]): Map<number, string> {
  const map = new Map<number, string>();
  const unique = [...new Set(classNumbers)].sort((a, b) => a - b);
  unique.forEach((cn, i) => {
    map.set(cn, CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]);
  });
  return map;
}

/**
 * Interpolate a sequential color scale from blue to red.
 *
 * @param t - Normalized value 0..1 (0 = min, 1 = max)
 * @returns CSS color string
 */
export function sequentialColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));

  // Blue (0) -> Cyan (0.25) -> Green (0.5) -> Yellow (0.75) -> Red (1)
  let r: number, g: number, b: number;

  if (clamped < 0.25) {
    const s = clamped / 0.25;
    r = 0; g = Math.round(s * 200); b = Math.round(255 - s * 55);
  } else if (clamped < 0.5) {
    const s = (clamped - 0.25) / 0.25;
    r = 0; g = Math.round(200 + s * 55); b = Math.round(200 - s * 200);
  } else if (clamped < 0.75) {
    const s = (clamped - 0.5) / 0.25;
    r = Math.round(s * 255); g = 255; b = 0;
  } else {
    const s = (clamped - 0.75) / 0.25;
    r = 255; g = Math.round(255 - s * 255); b = 0;
  }

  return `rgb(${r},${g},${b})`;
}

/**
 * Precompute a sequential color lookup table for fast rendering.
 *
 * @param steps - Number of discrete colors (default 256)
 * @returns Array of CSS color strings
 */
export function buildSequentialLUT(steps = 256): string[] {
  return Array.from({ length: steps }, (_, i) => sequentialColor(i / (steps - 1)));
}
