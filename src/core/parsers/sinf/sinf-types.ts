/**
 * Raw SINF data structures.
 *
 * SINF (Simplified INF) is a text-based wafer map format containing
 * die-level bin codes. Unlike KLARF, SINF does not contain defect-level
 * data - it maps each die position to a bin result code.
 */

export interface RawSinfData {
  device: string;
  lot: string;
  wafer: string;
  fnloc: string;         // Flat/notch location: U, D, L, R
  rowct: number;          // Number of rows in map
  colct: number;          // Number of columns in map
  bcequ: string[];        // Bin codes that are good die
  refpx: number;          // Reference die X position
  refpy: number;          // Reference die Y position
  dutms: string;          // Die units (um, mil, mm)
  xdies: number;          // Die step X size
  ydies: number;          // Die step Y size
  rows: string[][];       // 2D array of bin codes per die position
}

export function createEmptyRawSinfData(): RawSinfData {
  return {
    device: '',
    lot: '',
    wafer: '',
    fnloc: 'D',
    rowct: 0,
    colct: 0,
    bcequ: [],
    refpx: 0,
    refpy: 0,
    dutms: 'um',
    xdies: 0,
    ydies: 0,
    rows: [],
  };
}
