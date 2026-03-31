/**
 * PostgreSQL implementation of DefectStorageAdapter.
 *
 * Uses porsager/postgres for lightweight, type-safe queries.
 * All imports run in transactions with batched inserts.
 */

import postgres from 'postgres';
import type { Db } from './queries/db-types';
import type { DefectStorageAdapter } from './storage-adapter.interface';
import type { InspectionFile } from '../models/inspection-file';
import type {
  DatabaseConfig,
  MigrationResult,
  ImportResult,
  BatchImportResult,
  LotFilter,
  DefectFilter,
  Pagination,
  PagedResult,
  LotSummary,
  WaferSummary,
  ImportRecord,
  StoredDefectRecord,
  WaferMapData,
  StackedMapData,
  AggregationMode,
  ParetoEntry,
  YieldSummary,
  TrendMetric,
  TrendPoint,
  CorrelationPoint,
  ClassDistEntry,
  SPCDataSet,
  HeatmapCell,
  ClassificationResult,
  SpatialSignature,
} from './storage-types';
import { runMigrations } from './migrations/runner';
import { importFileToDb } from './queries/import-queries';
import * as lotQ from './queries/lot-queries';
import * as defectQ from './queries/defect-queries';
import * as analyticsQ from './queries/analytics-queries';

// Inline SQL for migrations (embedded because .sql files aren't in the bundle)
import schema001 from './migrations/001_initial_schema.sql?raw';
import views002 from './migrations/002_materialized_views.sql?raw';

export class PostgresStorageAdapter implements DefectStorageAdapter {
  private sql: Db | null = null;
  private _connected = false;

  async connect(config: DatabaseConfig): Promise<void> {
    this.sql = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? 'require' : false,
      max: config.connectionPoolSize ?? 5,
      idle_timeout: 30,
      transform: postgres.toCamel,
    });
    // Health check
    await this.sql`SELECT 1`;
    this._connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
    }
    this._connected = false;
  }

  isConnected(): boolean {
    return this._connected;
  }

  async migrate(): Promise<MigrationResult> {
    if (!this.sql) throw new Error('Not connected');
    const migrationSqls = new Map<string, string>();
    migrationSqls.set('001_initial_schema', schema001);
    migrationSqls.set('002_materialized_views', views002);
    return runMigrations(this.sql as unknown as Parameters<typeof runMigrations>[0], migrationSqls);
  }

  private get db(): Db {
    if (!this.sql) throw new Error('Not connected');
    return this.sql;
  }

  // --- Ingestion ---

  async importFile(file: InspectionFile): Promise<ImportResult> {
    return importFileToDb(this.db, file);
  }

  async importBatch(files: InspectionFile[]): Promise<BatchImportResult> {
    const start = performance.now();
    const results: ImportResult[] = [];
    for (const f of files) {
      results.push(await this.importFile(f));
    }
    return {
      total: files.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
      totalDurationMs: performance.now() - start,
    };
  }

  async deleteImport(importId: string): Promise<void> {
    await this.db`DELETE FROM imports WHERE id = ${importId}`;
  }

  // --- Lot / Wafer ---

  async queryLots(filter: LotFilter, pagination: Pagination): Promise<PagedResult<LotSummary>> {
    return lotQ.queryLots(this.db, filter, pagination);
  }

  async queryWafers(lotId: string): Promise<WaferSummary[]> {
    return lotQ.queryWafers(this.db, lotId);
  }

  async getImportHistory(pagination: Pagination): Promise<PagedResult<ImportRecord>> {
    return lotQ.getImportHistory(this.db, pagination);
  }

  // --- Defects ---

  async queryDefects(filter: DefectFilter, pagination: Pagination): Promise<PagedResult<StoredDefectRecord>> {
    return defectQ.queryDefects(this.db, filter, pagination);
  }

  async getWaferDefects(waferId: string, filter?: DefectFilter): Promise<StoredDefectRecord[]> {
    return defectQ.getWaferDefects(this.db, waferId, filter);
  }

  async getDefectCount(filter: DefectFilter): Promise<number> {
    return defectQ.getDefectCount(this.db, filter);
  }

  // --- Wafer Map ---

  async getWaferMapData(waferId: string): Promise<WaferMapData | null> {
    return analyticsQ.getWaferMapData(this.db, waferId);
  }

  async getStackedWaferMapData(waferIds: string[], aggregation: AggregationMode, gridSize: number): Promise<StackedMapData> {
    return analyticsQ.getStackedWaferMapData(this.db, waferIds, aggregation, gridSize);
  }

  // --- Analytics ---

  async getPareto(filter: DefectFilter, topN: number): Promise<ParetoEntry[]> {
    return analyticsQ.getPareto(this.db, filter, topN);
  }

  async getYieldSummary(filter: LotFilter): Promise<YieldSummary> {
    return analyticsQ.getYieldSummary(this.db, filter);
  }

  async getTrend(metric: TrendMetric, filter: LotFilter, groupBy: 'lot' | 'wafer' | 'day'): Promise<TrendPoint[]> {
    return analyticsQ.getTrend(this.db, metric, filter, groupBy);
  }

  async getCorrelation(xMetric: string, yMetric: string, filter: LotFilter): Promise<CorrelationPoint[]> {
    return analyticsQ.getCorrelation(this.db, xMetric, yMetric, filter);
  }

  async getSpatialDensity(waferId: string, gridSize: number): Promise<HeatmapCell[]> {
    return analyticsQ.getSpatialDensity(this.db, waferId, gridSize);
  }

  async getClassDistribution(filter: DefectFilter): Promise<ClassDistEntry[]> {
    return analyticsQ.getClassDistribution(this.db, filter);
  }

  async getSPCData(metric: string, filter: LotFilter): Promise<SPCDataSet> {
    return analyticsQ.getSPCData(this.db, metric, filter);
  }

  // --- Search ---

  async searchLots(query: string): Promise<LotSummary[]> {
    const result = await lotQ.queryLots(this.db, {}, { offset: 0, limit: 50 });
    const q = query.toLowerCase();
    return result.items.filter(
      (lot) =>
        lot.lotId.toLowerCase().includes(q) ||
        lot.stepId.toLowerCase().includes(q) ||
        lot.sourceFile.toLowerCase().includes(q),
    );
  }

  // --- AI Classification ---

  async saveClassification(result: ClassificationResult): Promise<void> {
    await this.db`
      INSERT INTO ai_classifications (wafer_id, model_name, model_version, predicted_class,
                                       confidence, all_scores, human_override, overridden_at)
      SELECT w.id, ${result.modelName}, ${result.modelVersion}, ${result.predictedClass},
             ${result.confidence}, ${JSON.stringify(result.allScores)}::jsonb,
             ${result.humanOverride ?? null}, ${result.overriddenAt ?? null}
      FROM wafers w WHERE w.wafer_id = ${result.waferId}
    `;
  }

  async getClassifications(waferId: string): Promise<ClassificationResult[]> {
    const rows = await this.db`
      SELECT ac.*, w.wafer_id
      FROM ai_classifications ac
      JOIN wafers w ON ac.wafer_id = w.id
      WHERE w.wafer_id = ${waferId}
      ORDER BY ac.classified_at DESC
    `;
    return rows.map((r: Record<string, unknown>) => ({
      waferId: r.wafer_id as string,
      modelName: r.model_name as string,
      modelVersion: r.model_version as string,
      predictedClass: r.predicted_class as string,
      confidence: Number(r.confidence),
      allScores: r.all_scores as Record<string, number>,
      classifiedAt: new Date(r.classified_at as string),
      humanOverride: r.human_override as string | undefined,
      overriddenAt: r.overridden_at ? new Date(r.overridden_at as string) : undefined,
    }));
  }

  // --- Spatial Signatures ---

  async saveSignatures(sigs: SpatialSignature[]): Promise<void> {
    for (const sig of sigs) {
      await this.db`
        INSERT INTO spatial_signatures (wafer_id, signature_type, confidence, parameters,
                                         defect_ids, algorithm)
        SELECT w.id, ${sig.signatureType}, ${sig.confidence},
               ${JSON.stringify(sig.parameters)}::jsonb,
               ${sig.defectIds}::uuid[], ${sig.algorithm}
        FROM wafers w WHERE w.wafer_id = ${sig.waferId}
      `;
    }
  }

  async getSignatures(waferId: string): Promise<SpatialSignature[]> {
    const rows = await this.db`
      SELECT ss.*, w.wafer_id
      FROM spatial_signatures ss
      JOIN wafers w ON ss.wafer_id = w.id
      WHERE w.wafer_id = ${waferId}
      ORDER BY ss.confidence DESC
    `;
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      waferId: r.wafer_id as string,
      signatureType: r.signature_type as SpatialSignature['signatureType'],
      confidence: Number(r.confidence),
      parameters: r.parameters as Record<string, unknown>,
      defectIds: (r.defect_ids as string[]) ?? [],
      detectedAt: new Date(r.detected_at as string),
      algorithm: r.algorithm as string,
    }));
  }
}
