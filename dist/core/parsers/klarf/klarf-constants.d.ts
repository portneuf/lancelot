/**
 * KLARF format constants: keywords, known column names, and enumerations.
 *
 * Covers both v1.2 (flat keyword;value) and v1.8 (Record/Field/List) formats.
 */
/** Top-level keywords recognized in KLARF v1.2 flat format. */
export declare const KLARF_KEYWORDS: readonly ["FileVersion", "FileTimestamp", "InspectionStationID", "SampleType", "ResultTimestamp", "LotID", "SampleSize", "DeviceID", "SetupID", "StepID", "WaferID", "Slot", "SampleOrientationMarkType", "OrientationMarkLocation", "DiePitch", "DieOrigin", "SampleCenterLocation", "DefectRecordSpec", "DefectList", "SummarySpec", "SummaryList", "ClassLookup", "ClusterClassificationList", "SampleTestPlan", "AreaPerTest", "EndOfFile"];
export type KlarfKeyword = (typeof KLARF_KEYWORDS)[number];
/** Well-known defect column names (from DefectRecordSpec). */
export declare const KNOWN_DEFECT_COLUMNS: readonly ["DEFECTID", "XREL", "YREL", "XINDEX", "YINDEX", "XSIZE", "YSIZE", "DEFECTAREA", "DSIZE", "CLASSNUMBER", "TEST", "CLUSTERNUMBER", "IMAGECOUNT", "IMAGELIST", "ROUGHBINNUMBER", "FINEBINNUMBER", "REVIEWCLASSNUMBER", "DEFECTSIZE"];
/** Core defect columns mapped to DefectRecord fields. */
export declare const CORE_COLUMN_MAP: Record<string, string>;
/** Orientation mark types. */
export declare const ORIENTATION_MARK_TYPES: readonly ["NOTCH", "FLAT", "NONE"];
/** Orientation mark locations. */
export declare const ORIENTATION_MARK_LOCATIONS: readonly ["UP", "DOWN", "LEFT", "RIGHT"];
/** Sample types. */
export declare const SAMPLE_TYPES: readonly ["WAFER", "FILM", "SUBSTRATE"];
