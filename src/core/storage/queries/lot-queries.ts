/**
 * PostgreSQL lot/wafer query functions.
 */

import type { Db } from './db-types';
import type {
  LotFilter,
  Pagination,
  PagedResult,
  LotSummary,
  WaferSummary,
  ImportRecord,
} from '../storage-types';

function buildLotWhere(filter: LotFilter): string {
  const conds: string[] = [];
  if (filter.lotIds?.length) conds.push(`l.lot_id = ANY(ARRAY[${filter.lotIds.map((id) => `'${id}'`).join(',')}])`);
  if (filter.stepIds?.length) conds.push(`l.step_id = ANY(ARRAY[${filter.stepIds.map((id) => `'${id}'`).join(',')}])`);
  if (filter.setupIds?.length) conds.push(`l.setup_id = ANY(ARRAY[${filter.setupIds.map((id) => `'${id}'`).join(',')}])`);
  if (filter.inspectionStation) conds.push(`l.inspection_station ILIKE '%${filter.inspectionStation}%'`);
  return conds.length > 0 ? 'WHERE ' + conds.join(' AND ') : '';
}

export async function queryLots(
  sql: Db,
  filter: LotFilter,
  pagination: Pagination,
): Promise<PagedResult<LotSummary>> {
  const where = buildLotWhere(filter);

  const countResult = await sql.unsafe(
    `SELECT COUNT(DISTINCT ls.lot_id) as cnt FROM lot_statistics ls JOIN lots l ON l.id = ls.lot_id ${where}`,
  );
  const total = Number(countResult[0]?.cnt ?? 0);

  const rows = await sql.unsafe(
    `SELECT ls.* FROM lot_statistics ls JOIN lots l ON l.id = ls.lot_id ${where}
     ORDER BY ls.imported_at DESC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
  );

  const items: LotSummary[] = rows.map((r: Record<string, unknown>) => ({
    id: r.lot_id as string,
    lotId: r.lot_id_text as string,
    stepId: r.step_id as string ?? '',
    setupId: r.setup_id as string ?? '',
    inspectionStation: r.inspection_station as string ?? '',
    waferCount: Number(r.wafer_count),
    totalDefects: Number(r.total_defects),
    averageYield: Number(r.avg_yield ?? 0),
    importedAt: new Date(r.imported_at as string),
    sourceFile: r.source_file as string,
  }));

  return { items, total, offset: pagination.offset, limit: pagination.limit };
}

export async function queryWafers(sql: Db, lotId: string): Promise<WaferSummary[]> {
  const rows = await sql`
    SELECT w.id, w.wafer_id, w.slot, w.defect_count, w.yield
    FROM wafers w
    JOIN lots l ON w.lot_id = l.id
    WHERE l.lot_id = ${lotId}
    ORDER BY w.slot, w.wafer_id
  `;

  const result: WaferSummary[] = [];
  for (const r of rows) {
    // Get class distribution
    const classDist: Record<number, number> = {};
    const classRows = await sql`
      SELECT class_number, COUNT(*) as cnt
      FROM defects WHERE wafer_id = ${r.id}
      GROUP BY class_number
    `;
    for (const cr of classRows) {
      classDist[Number(cr.class_number)] = Number(cr.cnt);
    }

    result.push({
      id: r.id as string,
      waferId: r.wafer_id as string,
      slot: Number(r.slot ?? 0),
      defectCount: Number(r.defect_count),
      yield: Number(r.yield ?? 0),
      classDistribution: classDist,
    });
  }

  return result;
}

export async function getImportHistory(
  sql: Db,
  pagination: Pagination,
): Promise<PagedResult<ImportRecord>> {
  const countResult = await sql`SELECT COUNT(*) as cnt FROM imports`;
  const total = Number(countResult[0]?.cnt ?? 0);

  const rows = await sql`
    SELECT i.id, i.source_file, i.file_hash, i.imported_at,
           l.lot_id, COUNT(DISTINCT w.id) as wafer_count, SUM(w.defect_count) as defect_count
    FROM imports i
    LEFT JOIN lots l ON l.import_id = i.id
    LEFT JOIN wafers w ON w.lot_id = l.id
    GROUP BY i.id, l.lot_id
    ORDER BY i.imported_at DESC
    LIMIT ${pagination.limit} OFFSET ${pagination.offset}
  `;

  const items: ImportRecord[] = rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    sourceFile: r.source_file as string,
    fileHash: r.file_hash as string,
    importedAt: new Date(r.imported_at as string),
    lotId: r.lot_id as string ?? '',
    waferCount: Number(r.wafer_count ?? 0),
    defectCount: Number(r.defect_count ?? 0),
  }));

  return { items, total, offset: pagination.offset, limit: pagination.limit };
}
