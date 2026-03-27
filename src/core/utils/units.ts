/**
 * Formatting utilities for coordinates, file sizes, and numeric values
 * used throughout the inspection viewer.
 *
 * Uses Intl.NumberFormat for locale-aware formatting where appropriate.
 */

// ---------------------------------------------------------------------------
// Coordinate formatting
// ---------------------------------------------------------------------------

const coordinateFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 3,
  useGrouping: false,
});

/**
 * Format a coordinate value in micrometers for display.
 *
 * @param value - Coordinate in micrometers.
 * @param unit  - Unit label to append (default: "um").
 * @returns Formatted string, e.g. "1234.567 um".
 */
export function formatCoordinate(value: number, unit = 'um'): string {
  return `${coordinateFormatter.format(value)} ${unit}`;
}

// ---------------------------------------------------------------------------
// File size formatting
// ---------------------------------------------------------------------------

const FILE_SIZE_UNITS: readonly [string, number][] = [
  ['GB', 1024 ** 3],
  ['MB', 1024 ** 2],
  ['KB', 1024],
  ['B', 1],
];

const fileSizeFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
  useGrouping: true,
});

/**
 * Format a byte count into a human-readable file size string.
 *
 * @param bytes - File size in bytes.
 * @returns Formatted string, e.g. "12.3 MB" or "456 B".
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) return '0 B';

  for (const [label, threshold] of FILE_SIZE_UNITS) {
    if (bytes >= threshold) {
      const scaled = bytes / threshold;
      return `${fileSizeFormatter.format(scaled)} ${label}`;
    }
  }

  return '0 B';
}

// ---------------------------------------------------------------------------
// Generic number formatting
// ---------------------------------------------------------------------------

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

/**
 * Format an integer count with grouping separators.
 *
 * @param value - The integer value.
 * @returns Formatted string, e.g. "1,234,567".
 */
export function formatCount(value: number): string {
  return integerFormatter.format(Math.round(value));
}

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

/**
 * Format a decimal value to two fixed decimal places.
 *
 * @param value - The numeric value.
 * @returns Formatted string, e.g. "1,234.56".
 */
export function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}
