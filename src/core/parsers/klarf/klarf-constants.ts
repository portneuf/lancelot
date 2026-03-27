/**
 * KLARF format constants: keywords, known column names, and enumerations.
 *
 * Covers both v1.2 (flat keyword;value) and v1.8 (Record/Field/List) formats.
 */

/** Top-level keywords recognized in KLARF v1.2 flat format. */
export const KLARF_KEYWORDS = [
  'FileVersion',
  'FileTimestamp',
  'InspectionStationID',
  'SampleType',
  'ResultTimestamp',
  'LotID',
  'SampleSize',
  'DeviceID',
  'SetupID',
  'StepID',
  'WaferID',
  'Slot',
  'SampleOrientationMarkType',
  'OrientationMarkLocation',
  'DiePitch',
  'DieOrigin',
  'SampleCenterLocation',
  'DefectRecordSpec',
  'DefectList',
  'SummarySpec',
  'SummaryList',
  'ClassLookup',
  'ClusterClassificationList',
  'SampleTestPlan',
  'AreaPerTest',
  'EndOfFile',
] as const;

export type KlarfKeyword = (typeof KLARF_KEYWORDS)[number];

/** Well-known defect column names (from DefectRecordSpec). */
export const KNOWN_DEFECT_COLUMNS = [
  'DEFECTID',
  'XREL',
  'YREL',
  'XINDEX',
  'YINDEX',
  'XSIZE',
  'YSIZE',
  'DEFECTAREA',
  'DSIZE',
  'CLASSNUMBER',
  'TEST',
  'CLUSTERNUMBER',
  'IMAGECOUNT',
  'IMAGELIST',
  'ROUGHBINNUMBER',
  'FINEBINNUMBER',
  'REVIEWCLASSNUMBER',
  'DEFECTSIZE',
] as const;

/** Core defect columns mapped to DefectRecord fields. */
export const CORE_COLUMN_MAP: Record<string, string> = {
  DEFECTID: 'defectId',
  XREL: 'xRel',
  YREL: 'yRel',
  XINDEX: 'xIndex',
  YINDEX: 'yIndex',
  DSIZE: 'size',
  DEFECTSIZE: 'size',
  CLASSNUMBER: 'classNumber',
  CLUSTERNUMBER: 'clusterNumber',
  TEST: 'test',
  IMAGECOUNT: 'imageCount',
};

/** Orientation mark types. */
export const ORIENTATION_MARK_TYPES = ['NOTCH', 'FLAT', 'NONE'] as const;

/** Orientation mark locations. */
export const ORIENTATION_MARK_LOCATIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

/** Sample types. */
export const SAMPLE_TYPES = ['WAFER', 'FILM', 'SUBSTRATE'] as const;
