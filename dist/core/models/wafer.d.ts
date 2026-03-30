/**
 * Wafer geometry, die map, and orientation types for semiconductor inspection.
 *
 * WaferGeometry captures the physical dimensions and coordinate system of
 * the inspected wafer. DieMapEntry represents a single die's status and
 * defect count within the wafer map grid.
 */
/** Die-level inspection status. */
export type DieStatus = 'tested' | 'untested' | 'skipped' | 'failed' | 'reference';
/** Physical orientation mark type on the wafer edge. */
export type OrientationMarkType = 'NOTCH' | 'FLAT' | 'NONE';
/** Cardinal direction of the orientation mark relative to wafer center. */
export type OrientationMarkLocation = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export interface WaferGeometry {
    /** Wafer diameter in micrometers. */
    waferDiameter: number;
    /** Die pitch as [x, y] in micrometers. */
    diePitch: [number, number];
    /** Die origin offset as [x, y] in micrometers. */
    dieOrigin: [number, number];
    /** Sample center location as [x, y] in micrometers. */
    sampleCenterLocation: [number, number];
    /** Orientation mark type (notch, flat, or none). */
    orientationMarkType?: OrientationMarkType;
    /** Cardinal direction of the orientation mark. */
    orientationMarkLocation?: OrientationMarkLocation;
    /** Raw sample size as [width, height] in micrometers. */
    sampleSizeRaw: [number, number];
}
export interface DieMapEntry {
    /** Die X index on the wafer grid. */
    xIndex: number;
    /** Die Y index on the wafer grid. */
    yIndex: number;
    /** Inspection status of this die. */
    status: DieStatus;
    /** Optional bin value from binning/sorting. */
    binValue?: number;
    /** Number of defects detected in this die. */
    defectCount: number;
}
