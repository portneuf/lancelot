/**
 * DefectStorageAdapter — abstraction over inspection data persistence.
 *
 * Implementations:
 * - InMemoryStorageAdapter: operates on InspectionFile[] arrays (Phase 0)
 * - PostgresStorageAdapter: PostgreSQL via porsager/postgres (Phase 2)
 *
 * All query methods accept filter/pagination and return typed results.
 * The interface is framework-agnostic — no React or Zustand imports.
 */
import type { InspectionFile } from '../models/inspection-file';
import type { DatabaseConfig, MigrationResult, ImportResult, BatchImportResult, LotFilter, DefectFilter, Pagination, PagedResult, LotSummary, WaferSummary, ImportRecord, StoredDefectRecord, WaferMapData, StackedMapData, AggregationMode, ParetoEntry, YieldSummary, TrendMetric, TrendPoint, CorrelationPoint, ClassDistEntry, SPCDataSet, ClassificationResult, SpatialSignature } from './storage-types';
export interface DefectStorageAdapter {
    connect(config: DatabaseConfig): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    migrate(): Promise<MigrationResult>;
    importFile(file: InspectionFile): Promise<ImportResult>;
    importBatch(files: InspectionFile[]): Promise<BatchImportResult>;
    deleteImport(importId: string): Promise<void>;
    queryLots(filter: LotFilter, pagination: Pagination): Promise<PagedResult<LotSummary>>;
    queryWafers(lotId: string): Promise<WaferSummary[]>;
    getImportHistory(pagination: Pagination): Promise<PagedResult<ImportRecord>>;
    queryDefects(filter: DefectFilter, pagination: Pagination): Promise<PagedResult<StoredDefectRecord>>;
    getWaferDefects(waferId: string, filter?: DefectFilter): Promise<StoredDefectRecord[]>;
    getDefectCount(filter: DefectFilter): Promise<number>;
    getWaferMapData(waferId: string): Promise<WaferMapData | null>;
    getStackedWaferMapData(waferIds: string[], aggregation: AggregationMode, gridSize: number): Promise<StackedMapData>;
    getPareto(filter: DefectFilter, topN: number): Promise<ParetoEntry[]>;
    getYieldSummary(filter: LotFilter): Promise<YieldSummary>;
    getTrend(metric: TrendMetric, filter: LotFilter, groupBy: 'lot' | 'wafer' | 'day'): Promise<TrendPoint[]>;
    getCorrelation(xMetric: string, yMetric: string, filter: LotFilter): Promise<CorrelationPoint[]>;
    getSpatialDensity(waferId: string, gridSize: number): Promise<import('./storage-types').HeatmapCell[]>;
    getClassDistribution(filter: DefectFilter): Promise<ClassDistEntry[]>;
    getSPCData(metric: string, filter: LotFilter): Promise<SPCDataSet>;
    searchLots(query: string): Promise<LotSummary[]>;
    saveClassification(result: ClassificationResult): Promise<void>;
    getClassifications(waferId: string): Promise<ClassificationResult[]>;
    saveSignatures(signatures: SpatialSignature[]): Promise<void>;
    getSignatures(waferId: string): Promise<SpatialSignature[]>;
}
