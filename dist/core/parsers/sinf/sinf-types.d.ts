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
    fnloc: string;
    rowct: number;
    colct: number;
    bcequ: string[];
    refpx: number;
    refpy: number;
    dutms: string;
    xdies: number;
    ydies: number;
    rows: string[][];
}
export declare function createEmptyRawSinfData(): RawSinfData;
