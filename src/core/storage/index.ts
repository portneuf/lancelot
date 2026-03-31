export type { DefectStorageAdapter } from './storage-adapter.interface';
export { InMemoryStorageAdapter } from './in-memory-storage-adapter';
export { PostgresStorageAdapter } from './postgres-storage-adapter';
export { StorageContext, useStorage, getStorageSingleton } from './storage-context';
export { StorageProvider } from './StorageProvider';
export type {
  DatabaseConfig,
  MigrationResult,
  Pagination,
  PagedResult,
  LotFilter,
  DefectFilter,
  AggregationMode,
  TrendMetric,
  ImportResult,
  BatchImportResult,
  LotSummary,
  WaferSummary,
  ImportRecord,
  StoredDefectRecord,
  WaferMapData,
  StackedMapData,
  HeatmapCell,
  ParetoEntry,
  YieldSummary,
  TrendPoint,
  CorrelationPoint,
  ClassDistEntry,
  SPCDataSet,
  ClassificationResult,
  SignatureType,
  SpatialSignature,
} from './storage-types';
