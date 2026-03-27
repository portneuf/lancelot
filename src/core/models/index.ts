/**
 * Barrel export for all domain model types.
 */

// Defect models
export type { DefectColumnSchema, DefectImage, DefectRecord } from './defect';

// Wafer models
export type { DieStatus, OrientationMarkType, OrientationMarkLocation } from './wafer';
export type { WaferGeometry, DieMapEntry } from './wafer';

// Lot / identity models
export type { InspectionIdentity } from './lot';

// Equipment models
export type { StationId, InspectionSetup } from './equipment';

// Summary models
export type { SummaryColumnSchema, SummaryRecord } from './summary';

// Inspection file (top-level aggregate)
export type {
  ParseWarning,
  SourceInfo,
  ClassLookupEntry,
  TestPlanEntry,
  InspectionFile,
} from './inspection-file';
