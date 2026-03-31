/**
 * PostgreSQL defect query functions.
 */

import type { Db } from './db-types';
import type {
  DefectFilter,
  Pagination,
  PagedResult,
  StoredDefectRecord,
} from '../storage-types';

function buildDefectWhere(filter: DefectFilter): string {
  const conds: string[] = [];
  if (filter.waferIds?.length) conds.push(`w.wafer_id = ANY(ARRAY[${filter.waferIds.map((id) => `'${id}'`).join(',')}])`);
  if (filter.lotIds?.length) conds.push(`l.lot_id = ANY(ARRAY[${filter.lotIds.map((id) => `'${id}'`).join(',')}])`);
  if (filter.classNumbers?.length) conds.push(`d.class_number = ANY(ARRAY[${filter.classNumbers.join(',')}])`);
  if (filter.minSize != null) conds.push(`d.d_size >= ${filter.minSize}`);
  if (filter.maxSize != null) conds.push(`d.d_size <= ${filter.maxSize}`);
  if (filter.testIds?.length) conds.push(`d.test_id = ANY(ARRAY[${filter.testIds.join(',')}])`);
  if (filter.spatialRegion) {
    const r = filter.spatialRegion;
    conds.push(`d.x_index >= ${r.xMin} AND d.x_index <= ${r.xMax} AND d.y_index >= ${r.yMin} AND d.y_index <= ${r.yMax}`);
  }
  return conds.length > 0 ? 'AND ' + conds.join(' AND ') : '';
}

function rowToDefect(r: Record<string, unknown>): StoredDefectRecord {
  return {
    id: r.id as string,
    waferId: r.wafer_id as string,
    defectId: Number(r.defect_id),
    xRel: Number(r.x_rel),
    yRel: Number(r.y_rel),
    xIndex: Number(r.x_index),
    yIndex: Number(r.y_index),
    xSize: r.x_size != null ? Number(r.x_size) : undefined,
    ySize: r.y_size != null ? Number(r.y_size) : undefined,
    defectArea: r.defect_area != null ? Number(r.defect_area) : undefined,
    dSize: r.d_size != null ? Number(r.d_size) : undefined,
    classNumber: Number(r.class_number),
    testId: r.test_id != null ? Number(r.test_id) : undefined,
    clusterNumber: r.cluster_number != null ? Number(r.cluster_number) : undefined,
    imageCount: Number(r.image_count ?? 0),
  };
}

export async function queryDefects(
  sql: Db,
  filter: DefectFilter,
  pagination: Pagination,
): Promise<PagedResult<StoredDefectRecord>> {
  const where = buildDefectWhere(filter);

  const countResult = await sql.unsafe(
    `SELECT COUNT(*) as cnt FROM defects d
     JOIN wafers w ON d.wafer_id = w.id
     JOIN lots l ON w.lot_id = l.id
     WHERE 1=1 ${where}`,
  );
  const total = Number(countResult[0]?.cnt ?? 0);

  const rows = await sql.unsafe(
    `SELECT d.* FROM defects d
     JOIN wafers w ON d.wafer_id = w.id
     JOIN lots l ON w.lot_id = l.id
     WHERE 1=1 ${where}
     ORDER BY d.defect_id
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
  );

  return {
    items: rows.map((r: Record<string, unknown>) => rowToDefect(r)),
    total,
    offset: pagination.offset,
    limit: pagination.limit,
  };
}

export async function getWaferDefects(
  sql: Db,
  waferId: string,
  filter?: DefectFilter,
): Promise<StoredDefectRecord[]> {
  const extra = filter ? buildDefectWhere(filter) : '';

  const rows = await sql.unsafe(
    `SELECT d.* FROM defects d
     JOIN wafers w ON d.wafer_id = w.id
     JOIN lots l ON w.lot_id = l.id
     WHERE w.wafer_id = '${waferId}' ${extra}
     ORDER BY d.defect_id`,
  );

  return rows.map((r: Record<string, unknown>) => rowToDefect(r));
}

export async function getDefectCount(sql: Db, filter: DefectFilter): Promise<number> {
  const where = buildDefectWhere(filter);
  const result = await sql.unsafe(
    `SELECT COUNT(*) as cnt FROM defects d
     JOIN wafers w ON d.wafer_id = w.id
     JOIN lots l ON w.lot_id = l.id
     WHERE 1=1 ${where}`,
  );
  return Number(result[0]?.cnt ?? 0);
}
