/**
 * Raw intermediate types produced by the KLARF parser before normalization.
 *
 * These represent the KLARF file content as-parsed, before mapping to the
 * format-agnostic InspectionFile domain model.
 */
export interface RawKlarfData {
    fileVersion: [number, number];
    fileTimestamp?: string;
    resultTimestamp?: string;
    stationVendor?: string;
    stationModel?: string;
    stationEquipmentId?: string;
    sampleType?: string;
    lotId: string;
    deviceId: string;
    setupId?: string;
    stepId?: string;
    waferId: string;
    slot?: number;
    sampleSize: [number, number];
    diePitch: [number, number];
    dieOrigin: [number, number];
    sampleCenterLocation: [number, number];
    orientationMarkType?: string;
    orientationMarkLocation?: string;
    defectRecordSpec: string[];
    defectRecordCount: number;
    defects: number[][];
    summarySpec: string[];
    summaryRecordCount: number;
    summaries: number[][];
    classLookup: RawClassLookupEntry[];
    testPlan: [number, number][];
    areaPerTest?: number;
    clusterClassifications: number[][];
}
export interface RawClassLookupEntry {
    classNumber: number;
    className: string;
    classCode?: string;
}
/** Create a default/empty RawKlarfData structure. */
export declare function createEmptyRawKlarfData(): RawKlarfData;
