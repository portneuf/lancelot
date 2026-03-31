/**
 * PostgreSQL analytics query functions.
 * Pareto, Yield, Trend, Correlation, SPC, Class Distribution.
 */

import type { Db } from './db-types';
import type {
  DefectFilter,
  LotFilter,
  TrendMetric,
  ParetoEntry,
  YieldSummary,
  TrendPoint,
  CorrelationPoint,
  ClassDistEntry,
  SPCDataSet,
  HeatmapCell,
  WaferMapData,
  StackedMapData,
  AggregationMode,
} from '../storage-types';

export async function getPareto(sql: Db, filter: DefectFilter, topN: number): Promise<ParetoEntry[]> {
  const lotFilter = filter.lotIds?.length
    ? `WHERE p.lot_id IN (SELECT id FROM lots WHERE lot_id = ANY(ARRAY[${filter.lotIds.map((id) => `'${id}'`).join(',')}]))`
    : '';

  const rows = await sql.unsafe(
    `SELECT class_number, class_name, defect_count
     FROM defect_class_pareto p ${lotFilter}
     ORDER BY defect_count DESC LIMIT ${topN}`,
  );

  const total = rows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.defect_count), 0);
  let cumulative = 0;

  return rows.map((r: Record<string, unknown>) => {
    const count = Number(r.defect_count);
    cumulative += count;
    return {
      classNumber: Number(r.class_number),
      className: r.class_name as string,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      cumulativePercentage: total > 0 ? (cumulative / total) * 100 : 0,
    };
  });
}

export async function getYieldSummary(sql: Db, filter: LotFilter): Promise<YieldSummary> {
  const lotFilter = filter.lotIds?.length
    ? `WHERE l.lot_id = ANY(ARRAY[${filter.lotIds.map((id) => `'${id}'`).join(',')}])`
    : '';

  const rows = await sql.unsafe(
    `SELECT w.wafer_id, w.defect_count, w.yield
     FROM wafers w JOIN lots l ON w.lot_id = l.id ${lotFilter}
     ORDER BY w.wafer_id`,
  );

  const yieldByWafer = rows.map((r: Record<string, unknown>) => ({
    waferId: r.wafer_id as string,
    yield: Number(r.yield ?? 0),
    defectCount: Number(r.defect_count),
  }));

  const totalDefects = yieldByWafer.reduce((s, w) => s + w.defectCount, 0);
  const yields = yieldByWafer.map((w) => w.yield);

  return {
    totalWafers: yieldByWafer.length,
    totalDefects,
    averageDefectsPerWafer: yieldByWafer.length > 0 ? totalDefects / yieldByWafer.length : 0,
    averageYield: yields.length > 0 ? yields.reduce((s, v) => s + v, 0) / yields.length : 0,
    minYield: yields.length > 0 ? Math.min(...yields) : 0,
    maxYield: yields.length > 0 ? Math.max(...yields) : 0,
    yieldByWafer,
  };
}

export async function getTrend(
  sql: Db,
  _metric: TrendMetric,
  filter: LotFilter,
  groupBy: 'lot' | 'wafer' | 'day',
): Promise<TrendPoint[]> {
  const lotFilter = filter.lotIds?.length
    ? `WHERE l.lot_id = ANY(ARRAY[${filter.lotIds.map((id) => `'${id}'`).join(',')}])`
    : '';

  let query: string;
  if (groupBy === 'wafer') {
    query = `SELECT w.wafer_id as label, w.defect_count as value
             FROM wafers w JOIN lots l ON w.lot_id = l.id ${lotFilter}
             ORDER BY w.slot, w.wafer_id`;
  } else if (groupBy === 'lot') {
    query = `SELECT l.lot_id as label, SUM(w.defect_count) as value
             FROM wafers w JOIN lots l ON w.lot_id = l.id ${lotFilter}
             GROUP BY l.lot_id ORDER BY l.lot_id`;
  } else {
    query = `SELECT DATE(i.imported_at) as label, SUM(w.defect_count) as value
             FROM wafers w JOIN lots l ON w.lot_id = l.id
             JOIN imports i ON i.id = l.import_id ${lotFilter}
             GROUP BY DATE(i.imported_at) ORDER BY DATE(i.imported_at)`;
  }

  const rows = await sql.unsafe(query);
  return rows.map((r: Record<string, unknown>) => ({
    label: String(r.label),
    value: Number(r.value),
  }));
}

export async function getCorrelation(
  sql: Db,
  _xMetric: string,
  _yMetric: string,
  filter: LotFilter,
): Promise<CorrelationPoint[]> {
  const lotFilter = filter.lotIds?.length
    ? `WHERE l.lot_id = ANY(ARRAY[${filter.lotIds.map((id) => `'${id}'`).join(',')}])`
    : '';

  const rows = await sql.unsafe(
    `SELECT w.wafer_id as label, w.defect_count as x, w.defect_count as y
     FROM wafers w JOIN lots l ON w.lot_id = l.id ${lotFilter}`,
  );

  return rows.map((r: Record<string, unknown>) => ({
    x: Number(r.x),
    y: Number(r.y),
    label: r.label as string,
  }));
}

export async function getClassDistribution(sql: Db, filter: DefectFilter): Promise<ClassDistEntry[]> {
  const pareto = await getPareto(sql, filter, 100);
  return pareto.map((p) => ({
    classNumber: p.classNumber,
    className: p.className,
    count: p.count,
    percentage: p.percentage,
  }));
}

export async function getSPCData(sql: Db, _metric: string, filter: LotFilter): Promise<SPCDataSet> {
  const lotFilter = filter.lotIds?.length
    ? `WHERE l.lot_id = ANY(ARRAY[${filter.lotIds.map((id) => `'${id}'`).join(',')}])`
    : '';

  const rows = await sql.unsafe(
    `SELECT w.wafer_id as label, w.defect_count as value
     FROM wafers w JOIN lots l ON w.lot_id = l.id ${lotFilter}
     ORDER BY w.slot, w.wafer_id`,
  );

  const values = rows.map((r: Record<string, unknown>) => Number(r.value));
  const n = values.length;
  const mean = n > 0 ? values.reduce((s, v) => s + v, 0) / n : 0;
  const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);
  const ucl = mean + 3 * stdDev;
  const lcl = Math.max(0, mean - 3 * stdDev);

  const ooc: number[] = [];
  const points = rows.map((r: Record<string, unknown>, i: number) => {
    const v = Number(r.value);
    if (v > ucl || v < lcl) ooc.push(i);
    return { label: r.label as string, value: v };
  });

  return { points, mean, stdDev, ucl, lcl, outOfControl: ooc };
}

export async function getWaferMapData(sql: Db, waferId: string): Promise<WaferMapData | null> {
  const waferRows = await sql`
    SELECT w.*, l.lot_id FROM wafers w
    JOIN lots l ON w.lot_id = l.id
    WHERE w.wafer_id = ${waferId} LIMIT 1
  `;
  if (waferRows.length === 0) return null;
  const w = waferRows[0];

  const defectRows = await sql`
    SELECT d.x_rel as x, d.y_rel as y, d.x_index, d.y_index,
           d.d_size as size, d.class_number,
           COALESCE(cl.class_name, 'Class ' || d.class_number) as class_name
    FROM defects d
    LEFT JOIN class_lookups cl ON cl.lot_id = (SELECT lot_id FROM wafers WHERE id = d.wafer_id)
      AND cl.class_number = d.class_number
    WHERE d.wafer_id = ${w.id}
    ORDER BY d.defect_id
  `;

  const tpRows = await sql`
    SELECT x_index, y_index FROM sample_test_plans
    WHERE wafer_id = ${w.id}
  `;

  return {
    waferId,
    sampleSize: [Number(w.sample_size_x), Number(w.sample_size_y)],
    diePitch: [Number(w.die_pitch_x), Number(w.die_pitch_y)],
    center: [Number(w.center_x), Number(w.center_y)],
    orientation: (w.orientation_loc as string) ?? 'DOWN',
    defects: defectRows.map((d: Record<string, unknown>) => ({
      x: Number(d.x),
      y: Number(d.y),
      xIndex: Number(d.x_index),
      yIndex: Number(d.y_index),
      size: Number(d.size ?? 0),
      classNumber: Number(d.class_number),
      className: d.class_name as string,
    })),
    sampleTestPlan: tpRows.map((r: Record<string, unknown>) => [Number(r.x_index), Number(r.y_index)] as [number, number]),
  };
}

export async function getSpatialDensity(sql: Db, waferId: string, gridSize: number): Promise<HeatmapCell[]> {
  const data = await getStackedWaferMapData(sql, [waferId], 'density', gridSize);
  return data.cells;
}

export async function getStackedWaferMapData(
  sql: Db,
  waferIds: string[],
  aggregation: AggregationMode,
  gridSize: number,
): Promise<StackedMapData> {
  // Get all defects with wafer geometry for the selected wafers
  const rows = await sql.unsafe(
    `SELECT d.x_rel, d.y_rel, d.x_index, d.y_index, d.class_number,
            w.wafer_id, w.center_x, w.center_y, w.sample_size_x
     FROM defects d
     JOIN wafers w ON d.wafer_id = w.id
     WHERE w.wafer_id = ANY(ARRAY[${waferIds.map((id) => `'${id}'`).join(',')}])`,
  );

  // Simple grid-based aggregation (same logic as InMemoryStorageAdapter)
  const grid = new Array(gridSize * gridSize).fill(null).map(() => ({
    defects: 0,
    waferHits: new Set<string>(),
    classCounts: new Map<number, number>(),
  }));

  const waferDiameter = rows.length > 0 ? Number(rows[0].sample_size_x) : 300000;

  for (const r of rows) {
    const cx = Number(r.center_x);
    const cy = Number(r.center_y);
    // Approximate absolute position from die-relative
    const xAbs = cx + Number(r.x_rel);
    const yAbs = cy + Number(r.y_rel);
    const gx = Math.floor(((xAbs - cx + waferDiameter / 2) / waferDiameter) * gridSize);
    const gy = Math.floor(((yAbs - cy + waferDiameter / 2) / waferDiameter) * gridSize);
    if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) continue;
    const idx = gy * gridSize + gx;
    grid[idx].defects++;
    grid[idx].waferHits.add(r.wafer_id as string);
    const cn = Number(r.class_number);
    grid[idx].classCounts.set(cn, (grid[idx].classCounts.get(cn) ?? 0) + 1);
  }

  const cellArea = (waferDiameter / gridSize) ** 2;
  const cells: HeatmapCell[] = [];

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const g = grid[gy * gridSize + gx];
      if (g.defects === 0) continue;

      let value: number;
      switch (aggregation) {
        case 'density': value = g.defects / (cellArea / 1e6); break;
        case 'hit-count': value = g.waferHits.size; break;
        case 'class-dominance': {
          let maxC = 0, maxN = 0;
          for (const [cn, count] of g.classCounts) { if (count > maxN) { maxN = count; maxC = cn; } }
          value = maxC;
          break;
        }
      }
      cells.push({ gridX: gx, gridY: gy, value });
    }
  }

  return { gridSize, waferCount: new Set(rows.map((r: Record<string, unknown>) => r.wafer_id)).size, cells, aggregation };
}
