/**
 * PostgreSQL implementation of DefectStorageAdapter.
 *
 * Uses porsager/postgres for lightweight, type-safe queries.
 * All imports run in transactions with batched inserts.
 */
import type { DefectStorageAdapter } from './storage-adapter.interface';
import type { InspectionFile } from '../models/inspection-file';
import type { DatabaseConfig, MigrationResult, ImportResult, BatchImportResult, LotFilter, DefectFilter, Pagination, PagedResult, LotSummary, WaferSummary, ImportRecord, StoredDefectRecord, WaferMapData, StackedMapData, AggregationMode, ParetoEntry, YieldSummary, TrendMetric, TrendPoint, CorrelationPoint, ClassDistEntry, SPCDataSet, HeatmapCell, ClassificationResult, SpatialSignature } from './storage-types';
export declare class PostgresStorageAdapter implements DefectStorageAdapter {
    private sql;
    private _connected;
    connect(config: DatabaseConfig): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    migrate(): Promise<MigrationResult>;
    private get db();
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
    getSpatialDensity(waferId: string, gridSize: number): Promise<HeatmapCell[]>;
    getClassDistribution(filter: DefectFilter): Promise<ClassDistEntry[]>;
    getSPCData(metric: string, filter: LotFilter): Promise<SPCDataSet>;
    searchLots(query: string): Promise<LotSummary[]>;
    saveClassification(result: ClassificationResult): Promise<void>;
    getClassifications(waferId: string): Promise<ClassificationResult[]>;
    saveSignatures(sigs: SpatialSignature[]): Promise<void>;
    getSignatures(waferId: string): Promise<SpatialSignature[]>;
}
