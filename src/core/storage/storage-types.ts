/**
 * Types for the DefectStorageAdapter abstraction layer.
 *
 * These types define the query parameters, results, and domain objects
 * used by all storage adapter implementations (InMemory, PostgreSQL, etc.).
 * No React, Zustand, or UI framework imports — pure domain types.
 */

// ============================================================
// Configuration
// ============================================================

export interface DatabaseConfig {
  type: 'local' | 'remote';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  connectionPoolSize?: number;
}

// ============================================================
// Pagination
// ============================================================

export interface Pagination {
  offset: number;
  limit: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================================
// Filters
// ============================================================

export interface LotFilter {
  lotIds?: string[];
  stepIds?: string[];
  setupIds?: string[];
  inspectionStation?: string;
  importedAfter?: Date;
  importedBefore?: Date;
}

export interface DefectFilter extends LotFilter {
  waferIds?: string[];
  classNumbers?: number[];
  minSize?: number;
  maxSize?: number;
  testIds?: number[];
  spatialRegion?: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
}

// ============================================================
// Aggregation
// ============================================================

export type AggregationMode = 'density' | 'hit-count' | 'class-dominance';
export type TrendMetric = 'defect-count' | 'yield' | 'defect-density' | 'cluster-count';

// ============================================================
// Import Results
// ============================================================

export interface ImportResult {
  success: boolean;
  importId: string;
  lotId: string;
  waferCount: number;
  defectCount: number;
  warnings: string[];
  errors: string[];
  durationMs: number;
}

export interface BatchImportResult {
  total: number;
  succeeded: number;
  failed: number;
  results: ImportResult[];
  totalDurationMs: number;
}

export interface MigrationResult {
  applied: number;
  skipped: number;
  errors: string[];
}

// ============================================================
// Lot / Wafer Summaries
// ============================================================

export interface LotSummary {
  id: string;
  lotId: string;
  stepId: string;
  setupId: string;
  inspectionStation: string;
  waferCount: number;
  totalDefects: number;
  averageYield: number;
  importedAt: Date;
  sourceFile: string;
}

export interface WaferSummary {
  id: string;
  waferId: string;
  slot: number;
  defectCount: number;
  yield: number;
  classDistribution: Record<number, number>;
}

export interface ImportRecord {
  id: string;
  sourceFile: string;
  fileHash: string;
  importedAt: Date;
  lotId: string;
  waferCount: number;
  defectCount: number;
}

// ============================================================
// Analytics Results
// ============================================================

export interface ParetoEntry {
  classNumber: number;
  className: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface YieldSummary {
  totalWafers: number;
  totalDefects: number;
  averageDefectsPerWafer: number;
  averageYield: number;
  minYield: number;
  maxYield: number;
  yieldByWafer: Array<{ waferId: string; yield: number; defectCount: number }>;
}

export interface TrendPoint {
  label: string;
  value: number;
  timestamp?: Date;
}

export interface CorrelationPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ClassDistEntry {
  classNumber: number;
  className: string;
  count: number;
  percentage: number;
}

export interface SPCDataSet {
  points: Array<{
    label: string;
    value: number;
    timestamp?: Date;
  }>;
  mean: number;
  stdDev: number;
  ucl: number;
  lcl: number;
  outOfControl: number[];
}

// ============================================================
// Wafer Map Data
// ============================================================

export interface WaferMapData {
  waferId: string;
  sampleSize: [number, number];
  diePitch: [number, number];
  center: [number, number];
  orientation: string;
  defects: Array<{
    x: number;
    y: number;
    xIndex: number;
    yIndex: number;
    size: number;
    classNumber: number;
    className: string;
  }>;
  sampleTestPlan: Array<[number, number]>;
}

export interface StackedMapData {
  gridSize: number;
  waferCount: number;
  cells: HeatmapCell[];
  aggregation: AggregationMode;
}

export interface HeatmapCell {
  gridX: number;
  gridY: number;
  value: number;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Defect Record (DB-compatible, extends domain DefectRecord)
// ============================================================

export interface StoredDefectRecord {
  id: string;
  waferId: string;
  defectId: number;
  xRel: number;
  yRel: number;
  xIndex: number;
  yIndex: number;
  xSize?: number;
  ySize?: number;
  defectArea?: number;
  dSize?: number;
  classNumber: number;
  testId?: number;
  clusterNumber?: number;
  roughBin?: number;
  fineBin?: number;
  imageCount: number;
}

// ============================================================
// AI / Classification
// ============================================================

export interface ClassificationResult {
  waferId: string;
  modelName: string;
  modelVersion: string;
  predictedClass: string;
  confidence: number;
  allScores: Record<string, number>;
  classifiedAt: Date;
  humanOverride?: string;
  overriddenAt?: Date;
}

// ============================================================
// Spatial Signatures
// ============================================================

export type SignatureType = 'ring' | 'scratch' | 'cluster' | 'radial' | 'area';

export interface SpatialSignature {
  id: string;
  waferId: string;
  signatureType: SignatureType;
  confidence: number;
  parameters: Record<string, unknown>;
  defectIds: string[];
  detectedAt: Date;
  algorithm: string;
}
