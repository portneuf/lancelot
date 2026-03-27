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

  // Station
  stationVendor?: string;
  stationModel?: string;
  stationEquipmentId?: string;

  // Sample
  sampleType?: string;
  lotId: string;
  deviceId: string;
  setupId?: string;
  stepId?: string;
  waferId: string;
  slot?: number;

  // Geometry
  sampleSize: [number, number];
  diePitch: [number, number];
  dieOrigin: [number, number];
  sampleCenterLocation: [number, number];
  orientationMarkType?: string;
  orientationMarkLocation?: string;

  // Defects
  defectRecordSpec: string[];
  defectRecordCount: number;
  defects: number[][];

  // Summary
  summarySpec: string[];
  summaryRecordCount: number;
  summaries: number[][];

  // Class lookup
  classLookup: RawClassLookupEntry[];

  // Test plan
  testPlan: [number, number][];

  // Area per test
  areaPerTest?: number;

  // Cluster classification
  clusterClassifications: number[][];
}

export interface RawClassLookupEntry {
  classNumber: number;
  className: string;
  classCode?: string;
}

/** Create a default/empty RawKlarfData structure. */
export function createEmptyRawKlarfData(): RawKlarfData {
  return {
    fileVersion: [1, 2],
    lotId: '',
    deviceId: '',
    waferId: '',
    sampleSize: [1, 300000],
    diePitch: [0, 0],
    dieOrigin: [0, 0],
    sampleCenterLocation: [0, 0],
    defectRecordSpec: [],
    defectRecordCount: 0,
    defects: [],
    summarySpec: [],
    summaryRecordCount: 0,
    summaries: [],
    classLookup: [],
    testPlan: [],
    clusterClassifications: [],
  };
}
