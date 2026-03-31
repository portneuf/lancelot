/**
 * In-memory implementation of DefectStorageAdapter.
 *
 * Operates on InspectionFile[] arrays — no database required.
 * This is the default adapter for web-only mode and the bridge
 * that lets new views (Gallery, Stacking) work immediately
 * while the PostgreSQL adapter is developed.
 *
 * All query methods iterate in-memory data. Pagination is
 * simulated with Array.slice(). Stacking computes on the fly.
 */
import type { DefectStorageAdapter } from './storage-adapter.interface';
import type { InspectionFile } from '../models/inspection-file';
import type { DatabaseConfig, MigrationResult, ImportResult, BatchImportResult, LotFilter, DefectFilter, Pagination, PagedResult, LotSummary, WaferSummary, ImportRecord, StoredDefectRecord, WaferMapData, StackedMapData, AggregationMode, ParetoEntry, YieldSummary, TrendMetric, TrendPoint, CorrelationPoint, ClassDistEntry, SPCDataSet, HeatmapCell, ClassificationResult, SpatialSignature } from './storage-types';
export declare class InMemoryStorageAdapter implements DefectStorageAdapter {
    private files;
    private classifications;
    private signatures;
    private connected;
    connect(_config: DatabaseConfig): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    migrate(): Promise<MigrationResult>;
    importFile(file: InspectionFile): Promise<ImportResult>;
    importBatch(files: InspectionFile[]): Promise<BatchImportResult>;
    deleteImport(importId: string): Promise<void>;
    private allFiles;
    private filesMatchingLot;
    queryLots(filter: LotFilter, pagination: Pagination): Promise<PagedResult<LotSummary>>;
    queryWafers(lotId: string): Promise<WaferSummary[]>;
    getImportHistory(pagination: Pagination): Promise<PagedResult<ImportRecord>>;
    private collectDefects;
    queryDefects(filter: DefectFilter, pagination: Pagination): Promise<PagedResult<StoredDefectRecord>>;
    getWaferDefects(waferId: string, filter?: DefectFilter): Promise<StoredDefectRecord[]>;
    getDefectCount(filter: DefectFilter): Promise<number>;
    getWaferMapData(waferId: string): Promise<WaferMapData | null>;
    getStackedWaferMapData(waferIds: string[], aggregation: AggregationMode, gridSize: number): Promise<StackedMapData>;
    getPareto(filter: DefectFilter, topN: number): Promise<ParetoEntry[]>;
    getYieldSummary(filter: LotFilter): Promise<YieldSummary>;
    getTrend(metric: TrendMetric, filter: LotFilter, groupBy: 'lot' | 'wafer' | 'day'): Promise<TrendPoint[]>;
    getCorrelation(_xMetric: string, _yMetric: string, filter: LotFilter): Promise<CorrelationPoint[]>;
    getSpatialDensity(waferId: string, gridSize: number): Promise<HeatmapCell[]>;
    getClassDistribution(filter: DefectFilter): Promise<ClassDistEntry[]>;
    getSPCData(_metric: string, filter: LotFilter): Promise<SPCDataSet>;
    searchLots(query: string): Promise<LotSummary[]>;
    saveClassification(result: ClassificationResult): Promise<void>;
    getClassifications(waferId: string): Promise<ClassificationResult[]>;
    saveSignatures(sigs: SpatialSignature[]): Promise<void>;
    getSignatures(waferId: string): Promise<SpatialSignature[]>;
}
