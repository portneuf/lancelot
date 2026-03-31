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
import type { InspectionFile, ClassLookupEntry } from '../models/inspection-file';
import type { DefectRecord } from '../models/defect';
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

// ============================================================
// Internal storage entry
// ============================================================

interface StoredFile {
  importId: string;
  file: InspectionFile;
  importedAt: Date;
  fileHash: string;
}

// ============================================================
// Helpers
// ============================================================

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < Math.min(s.length, 4096); i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function matchesLotFilter(file: InspectionFile, filter: LotFilter): boolean {
  if (filter.lotIds?.length && !filter.lotIds.includes(file.identity.lotId)) return false;
  if (filter.stepIds?.length && file.identity.stepId && !filter.stepIds.includes(file.identity.stepId)) return false;
  if (filter.setupIds?.length && file.inspectionSetup.setupId && !filter.setupIds.includes(file.inspectionSetup.setupId)) return false;
  if (filter.inspectionStation) {
    const station = `${file.inspectionSetup.stationId.vendor} ${file.inspectionSetup.stationId.model} ${file.inspectionSetup.stationId.equipmentId}`;
    if (!station.includes(filter.inspectionStation)) return false;
  }
  return true;
}

function matchesDefectFilter(d: DefectRecord, filter: DefectFilter): boolean {
  if (filter.classNumbers?.length && d.classNumber != null && !filter.classNumbers.includes(d.classNumber)) return false;
  if (filter.minSize != null && (d.size ?? 0) < filter.minSize) return false;
  if (filter.maxSize != null && (d.size ?? 0) > filter.maxSize) return false;
  if (filter.testIds?.length && d.test != null && !filter.testIds.includes(d.test)) return false;
  if (filter.spatialRegion) {
    const r = filter.spatialRegion;
    if (d.xAbs < r.xMin || d.xAbs > r.xMax || d.yAbs < r.yMin || d.yAbs > r.yMax) return false;
  }
  return true;
}

function defectToStored(waferId: string, d: DefectRecord): StoredDefectRecord {
  return {
    id: `${waferId}-${d.defectId}`,
    waferId,
    defectId: d.defectId,
    xRel: d.xRel,
    yRel: d.yRel,
    xIndex: d.xIndex,
    yIndex: d.yIndex,
    xSize: d.extra['XSIZE'] as number | undefined,
    ySize: d.extra['YSIZE'] as number | undefined,
    defectArea: d.extra['DEFECTAREA'] as number | undefined,
    dSize: d.size,
    classNumber: d.classNumber ?? 0,
    testId: d.test,
    clusterNumber: d.clusterNumber,
    imageCount: d.imageCount ?? 0,
  };
}

function paginate<T>(items: T[], pagination: Pagination): PagedResult<T> {
  return {
    items: items.slice(pagination.offset, pagination.offset + pagination.limit),
    total: items.length,
    offset: pagination.offset,
    limit: pagination.limit,
  };
}

function className(classLookup: ClassLookupEntry[], classNumber: number): string {
  return classLookup.find((c) => c.classNumber === classNumber)?.className ?? `Class ${classNumber}`;
}

// ============================================================
// Adapter
// ============================================================

export class InMemoryStorageAdapter implements DefectStorageAdapter {
  private files = new Map<string, StoredFile>();
  private classifications = new Map<string, ClassificationResult[]>();
  private signatures = new Map<string, SpatialSignature[]>();
  private connected = false;

  // --- Lifecycle ---

  async connect(_config: DatabaseConfig): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async migrate(): Promise<MigrationResult> {
    return { applied: 0, skipped: 0, errors: [] };
  }

  // --- Data Ingestion ---

  async importFile(file: InspectionFile): Promise<ImportResult> {
    const start = performance.now();
    const hash = simpleHash(file.source.fileName + file.identity.lotId + file.identity.waferId);
    const importId = `mem-${hash}-${Date.now()}`;

    this.files.set(importId, {
      importId,
      file,
      importedAt: new Date(),
      fileHash: hash,
    });

    return {
      success: true,
      importId,
      lotId: file.identity.lotId,
      waferCount: 1,
      defectCount: file.defects.length,
      warnings: file.source.warnings.map((w) => w.message),
      errors: [],
      durationMs: performance.now() - start,
    };
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
    this.files.delete(importId);
  }

  // --- Lot / Wafer Queries ---

  private allFiles(): StoredFile[] {
    return [...this.files.values()];
  }

  private filesMatchingLot(filter: LotFilter): StoredFile[] {
    return this.allFiles().filter((sf) => matchesLotFilter(sf.file, filter));
  }

  async queryLots(filter: LotFilter, pagination: Pagination): Promise<PagedResult<LotSummary>> {
    const grouped = new Map<string, StoredFile[]>();
    for (const sf of this.filesMatchingLot(filter)) {
      const key = sf.file.identity.lotId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(sf);
    }

    const lots: LotSummary[] = [...grouped.entries()].map(([lotId, sfs]) => {
      const first = sfs[0].file;
      const totalDefects = sfs.reduce((s, sf) => s + sf.file.defects.length, 0);
      return {
        id: lotId,
        lotId,
        stepId: first.identity.stepId ?? '',
        setupId: first.inspectionSetup.setupId ?? '',
        inspectionStation: `${first.inspectionSetup.stationId.vendor} ${first.inspectionSetup.stationId.model}`,
        waferCount: sfs.length,
        totalDefects,
        averageYield: 0,
        importedAt: sfs[0].importedAt,
        sourceFile: first.source.fileName,
      };
    });

    return paginate(lots, pagination);
  }

  async queryWafers(lotId: string): Promise<WaferSummary[]> {
    return this.allFiles()
      .filter((sf) => sf.file.identity.lotId === lotId)
      .map((sf) => {
        const classDist: Record<number, number> = {};
        for (const d of sf.file.defects) {
          const cn = d.classNumber ?? 0;
          classDist[cn] = (classDist[cn] ?? 0) + 1;
        }
        return {
          id: sf.importId,
          waferId: sf.file.identity.waferId,
          slot: sf.file.identity.slot ?? 0,
          defectCount: sf.file.defects.length,
          yield: 0,
          classDistribution: classDist,
        };
      });
  }

  async getImportHistory(pagination: Pagination): Promise<PagedResult<ImportRecord>> {
    const records: ImportRecord[] = this.allFiles().map((sf) => ({
      id: sf.importId,
      sourceFile: sf.file.source.fileName,
      fileHash: sf.fileHash,
      importedAt: sf.importedAt,
      lotId: sf.file.identity.lotId,
      waferCount: 1,
      defectCount: sf.file.defects.length,
    }));
    records.sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime());
    return paginate(records, pagination);
  }

  // --- Defect Queries ---

  private collectDefects(filter: DefectFilter): Array<{ sf: StoredFile; d: DefectRecord }> {
    const results: Array<{ sf: StoredFile; d: DefectRecord }> = [];
    for (const sf of this.filesMatchingLot(filter)) {
      if (filter.waferIds?.length && !filter.waferIds.includes(sf.file.identity.waferId)) continue;
      for (const d of sf.file.defects) {
        if (matchesDefectFilter(d, filter)) {
          results.push({ sf, d });
        }
      }
    }
    return results;
  }

  async queryDefects(filter: DefectFilter, pagination: Pagination): Promise<PagedResult<StoredDefectRecord>> {
    const all = this.collectDefects(filter).map(({ sf, d }) =>
      defectToStored(sf.file.identity.waferId, d),
    );
    return paginate(all, pagination);
  }

  async getWaferDefects(waferId: string, filter?: DefectFilter): Promise<StoredDefectRecord[]> {
    const sf = this.allFiles().find((s) => s.file.identity.waferId === waferId);
    if (!sf) return [];
    let defects = sf.file.defects;
    if (filter) {
      defects = defects.filter((d) => matchesDefectFilter(d, filter));
    }
    return defects.map((d) => defectToStored(waferId, d));
  }

  async getDefectCount(filter: DefectFilter): Promise<number> {
    return this.collectDefects(filter).length;
  }

  // --- Wafer Map Data ---

  async getWaferMapData(waferId: string): Promise<WaferMapData | null> {
    const sf = this.allFiles().find((s) => s.file.identity.waferId === waferId);
    if (!sf) return null;
    const f = sf.file;
    return {
      waferId,
      sampleSize: f.waferGeometry.sampleSizeRaw,
      diePitch: f.waferGeometry.diePitch,
      center: f.waferGeometry.sampleCenterLocation,
      orientation: f.waferGeometry.orientationMarkLocation ?? 'DOWN',
      defects: f.defects.map((d) => ({
        x: d.xAbs,
        y: d.yAbs,
        xIndex: d.xIndex,
        yIndex: d.yIndex,
        size: d.size ?? 0,
        classNumber: d.classNumber ?? 0,
        className: className(f.classLookup, d.classNumber ?? 0),
      })),
      sampleTestPlan: f.testPlan.map((tp) => [tp.xIndex, tp.yIndex] as [number, number]),
    };
  }

  async getStackedWaferMapData(
    waferIds: string[],
    aggregation: AggregationMode,
    gridSize: number,
  ): Promise<StackedMapData> {
    const cells: HeatmapCell[] = [];
    const grid = new Array(gridSize * gridSize).fill(null).map(() => ({
      defects: 0,
      waferHits: new Set<string>(),
      classCounts: new Map<number, number>(),
    }));

    let waferCount = 0;
    let waferDiameter = 300000;

    for (const waferId of waferIds) {
      const sf = this.allFiles().find((s) => s.file.identity.waferId === waferId);
      if (!sf) continue;
      waferCount++;
      waferDiameter = sf.file.waferGeometry.waferDiameter;
      const [cx, cy] = sf.file.waferGeometry.sampleCenterLocation;

      for (const d of sf.file.defects) {
        const gx = Math.floor(((d.xAbs - cx + waferDiameter / 2) / waferDiameter) * gridSize);
        const gy = Math.floor(((d.yAbs - cy + waferDiameter / 2) / waferDiameter) * gridSize);
        if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) continue;
        const idx = gy * gridSize + gx;
        grid[idx].defects++;
        grid[idx].waferHits.add(waferId);
        const cn = d.classNumber ?? 0;
        grid[idx].classCounts.set(cn, (grid[idx].classCounts.get(cn) ?? 0) + 1);
      }
    }

    const cellArea = (waferDiameter / gridSize) ** 2;

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const idx = gy * gridSize + gx;
        const g = grid[idx];
        if (g.defects === 0) continue;

        let value: number;
        const metadata: Record<string, unknown> = {};

        switch (aggregation) {
          case 'density':
            value = g.defects / (cellArea / 1e6);
            break;
          case 'hit-count':
            value = g.waferHits.size;
            break;
          case 'class-dominance': {
            let maxClass = 0;
            let maxCount = 0;
            for (const [cn, count] of g.classCounts) {
              if (count > maxCount) {
                maxCount = count;
                maxClass = cn;
              }
            }
            value = maxClass;
            metadata.count = maxCount;
            break;
          }
        }

        cells.push({ gridX: gx, gridY: gy, value, metadata });
      }
    }

    return { gridSize, waferCount, cells, aggregation };
  }

  // --- Analytical Queries ---

  async getPareto(filter: DefectFilter, topN: number): Promise<ParetoEntry[]> {
    const counts = new Map<number, number>();
    const matching = this.collectDefects(filter);
    for (const { d } of matching) {
      const cn = d.classNumber ?? 0;
      counts.set(cn, (counts.get(cn) ?? 0) + 1);
    }

    const firstFile = this.filesMatchingLot(filter)[0]?.file;
    const lookup = firstFile?.classLookup ?? [];

    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    const total = matching.length;
    let cumulative = 0;

    return sorted.map(([classNumber, count]) => {
      cumulative += count;
      return {
        classNumber,
        className: className(lookup, classNumber),
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        cumulativePercentage: total > 0 ? (cumulative / total) * 100 : 0,
      };
    });
  }

  async getYieldSummary(filter: LotFilter): Promise<YieldSummary> {
    const files = this.filesMatchingLot(filter);
    const totalWafers = files.length;
    const totalDefects = files.reduce((s, sf) => s + sf.file.defects.length, 0);
    const yieldByWafer = files.map((sf) => ({
      waferId: sf.file.identity.waferId,
      yield: 0,
      defectCount: sf.file.defects.length,
    }));

    return {
      totalWafers,
      totalDefects,
      averageDefectsPerWafer: totalWafers > 0 ? totalDefects / totalWafers : 0,
      averageYield: 0,
      minYield: 0,
      maxYield: 0,
      yieldByWafer,
    };
  }

  async getTrend(metric: TrendMetric, filter: LotFilter, groupBy: 'lot' | 'wafer' | 'day'): Promise<TrendPoint[]> {
    const files = this.filesMatchingLot(filter);
    const points: TrendPoint[] = [];

    if (groupBy === 'wafer') {
      for (const sf of files) {
        let value: number;
        switch (metric) {
          case 'defect-count':
            value = sf.file.defects.length;
            break;
          case 'defect-density':
            value = sf.file.defects.length;
            break;
          case 'yield':
            value = 0;
            break;
          case 'cluster-count':
            value = new Set(sf.file.defects.map((d) => d.clusterNumber).filter((c) => c != null)).size;
            break;
        }
        points.push({ label: sf.file.identity.waferId, value });
      }
    } else {
      // Group by lot or day — simplified for in-memory
      const grouped = new Map<string, StoredFile[]>();
      for (const sf of files) {
        const key = groupBy === 'lot'
          ? sf.file.identity.lotId
          : sf.importedAt.toISOString().slice(0, 10);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(sf);
      }
      for (const [label, sfs] of grouped) {
        const totalDefects = sfs.reduce((s, sf) => s + sf.file.defects.length, 0);
        points.push({ label, value: totalDefects });
      }
    }

    return points;
  }

  async getCorrelation(_xMetric: string, _yMetric: string, filter: LotFilter): Promise<CorrelationPoint[]> {
    const files = this.filesMatchingLot(filter);
    return files.map((sf) => ({
      x: sf.file.defects.length,
      y: sf.file.defects.length,
      label: sf.file.identity.waferId,
    }));
  }

  async getSpatialDensity(waferId: string, gridSize: number): Promise<HeatmapCell[]> {
    const data = await this.getStackedWaferMapData([waferId], 'density', gridSize);
    return data.cells;
  }

  async getClassDistribution(filter: DefectFilter): Promise<ClassDistEntry[]> {
    const pareto = await this.getPareto(filter, 100);
    return pareto.map((p) => ({
      classNumber: p.classNumber,
      className: p.className,
      count: p.count,
      percentage: p.percentage,
    }));
  }

  // --- SPC ---

  async getSPCData(_metric: string, filter: LotFilter): Promise<SPCDataSet> {
    const files = this.filesMatchingLot(filter);
    const values = files.map((sf) => sf.file.defects.length);

    const n = values.length;
    const mean = n > 0 ? values.reduce((s, v) => s + v, 0) / n : 0;
    const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);

    const ucl = mean + 3 * stdDev;
    const lcl = Math.max(0, mean - 3 * stdDev);

    const ooc: number[] = [];
    const points = files.map((sf, i) => {
      const v = sf.file.defects.length;
      if (v > ucl || v < lcl) ooc.push(i);
      return { label: sf.file.identity.waferId, value: v };
    });

    return { points, mean, stdDev, ucl, lcl, outOfControl: ooc };
  }

  // --- Search ---

  async searchLots(query: string): Promise<LotSummary[]> {
    const q = query.toLowerCase();
    const result = await this.queryLots({}, { offset: 0, limit: 1000 });
    return result.items.filter(
      (lot) =>
        lot.lotId.toLowerCase().includes(q) ||
        lot.stepId.toLowerCase().includes(q) ||
        lot.sourceFile.toLowerCase().includes(q),
    );
  }

  // --- AI Classification ---

  async saveClassification(result: ClassificationResult): Promise<void> {
    const existing = this.classifications.get(result.waferId) ?? [];
    existing.push(result);
    this.classifications.set(result.waferId, existing);
  }

  async getClassifications(waferId: string): Promise<ClassificationResult[]> {
    return this.classifications.get(waferId) ?? [];
  }

  // --- Spatial Signatures ---

  async saveSignatures(sigs: SpatialSignature[]): Promise<void> {
    for (const sig of sigs) {
      const existing = this.signatures.get(sig.waferId) ?? [];
      existing.push(sig);
      this.signatures.set(sig.waferId, existing);
    }
  }

  async getSignatures(waferId: string): Promise<SpatialSignature[]> {
    return this.signatures.get(waferId) ?? [];
  }
}
