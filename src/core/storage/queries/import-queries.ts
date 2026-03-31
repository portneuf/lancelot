/**
 * PostgreSQL import (ingestion) queries.
 *
 * Handles inserting parsed InspectionFile data into the database
 * with batch inserts for defects (10k per batch).
 */

import type { Db } from './db-types';
import type { InspectionFile } from '../../models/inspection-file';
import type { ImportResult } from '../storage-types';

const BATCH_SIZE = 10_000;

function sha256Placeholder(file: InspectionFile): string {
  let h = 0;
  const s = file.source.fileName + file.identity.lotId + file.identity.waferId + file.defects.length;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

export async function importFileToDb(sql: Db, file: InspectionFile): Promise<ImportResult> {
  const startTime = performance.now();
  const fileHash = sha256Placeholder(file);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (sql as any).begin(async (tx: any) => {
      // 1. Import record
      const [imp] = await tx`
        INSERT INTO imports (source_file, file_hash, file_version)
        VALUES (${file.source.fileName}, ${fileHash}, ${file.source.formatVersion})
        ON CONFLICT (file_hash) DO UPDATE SET imported_at = NOW()
        RETURNING id
      `;

      // 2. Lot
      const station = `${file.inspectionSetup.stationId.vendor} ${file.inspectionSetup.stationId.model} ${file.inspectionSetup.stationId.equipmentId}`;
      const [lot] = await tx`
        INSERT INTO lots (import_id, lot_id, inspection_station, setup_id, step_id, result_timestamp)
        VALUES (${imp.id}, ${file.identity.lotId}, ${station}, ${file.inspectionSetup.setupId ?? null}, ${file.identity.stepId ?? null}, ${file.identity.resultTimestamp ?? null})
        ON CONFLICT (import_id, lot_id) DO UPDATE SET step_id = EXCLUDED.step_id
        RETURNING id
      `;

      // 3. Class lookups
      if (file.classLookup.length > 0) {
        const rows = file.classLookup.map((c) => ({
          lot_id: lot.id,
          class_number: c.classNumber,
          class_name: c.className,
        }));
        await tx`
          INSERT INTO class_lookups ${tx(rows)}
          ON CONFLICT (lot_id, class_number) DO UPDATE SET class_name = EXCLUDED.class_name
        `;
      }

      // 4. Wafer
      const geo = file.waferGeometry;
      const [w] = await tx`
        INSERT INTO wafers (lot_id, wafer_id, slot, sample_size_x, sample_size_y,
                            die_pitch_x, die_pitch_y, die_origin_x, die_origin_y,
                            center_x, center_y, orientation, orientation_loc, defect_count)
        VALUES (${lot.id}, ${file.identity.waferId}, ${file.identity.slot ?? null},
                ${geo.sampleSizeRaw[0]}, ${geo.sampleSizeRaw[1]},
                ${geo.diePitch[0]}, ${geo.diePitch[1]},
                ${geo.dieOrigin[0]}, ${geo.dieOrigin[1]},
                ${geo.sampleCenterLocation[0]}, ${geo.sampleCenterLocation[1]},
                ${geo.orientationMarkType ?? null}, ${geo.orientationMarkLocation ?? null},
                ${file.defects.length})
        ON CONFLICT (lot_id, wafer_id) DO UPDATE SET defect_count = EXCLUDED.defect_count
        RETURNING id
      `;

      // 5. Test plan
      if (file.testPlan.length > 0) {
        const tpRows = file.testPlan.map((tp) => ({
          wafer_id: w.id,
          x_index: tp.xIndex,
          y_index: tp.yIndex,
        }));
        await tx`
          INSERT INTO sample_test_plans ${tx(tpRows)}
          ON CONFLICT (wafer_id, x_index, y_index) DO NOTHING
        `;
      }

      // 6. Defects (batched)
      for (let i = 0; i < file.defects.length; i += BATCH_SIZE) {
        const batch = file.defects.slice(i, i + BATCH_SIZE).map((d) => ({
          wafer_id: w.id,
          defect_id: d.defectId,
          x_rel: d.xRel,
          y_rel: d.yRel,
          x_index: d.xIndex,
          y_index: d.yIndex,
          x_size: (d.extra['XSIZE'] as number | undefined) ?? null,
          y_size: (d.extra['YSIZE'] as number | undefined) ?? null,
          defect_area: (d.extra['DEFECTAREA'] as number | undefined) ?? null,
          d_size: d.size ?? null,
          class_number: d.classNumber ?? 0,
          test_id: d.test ?? null,
          cluster_number: d.clusterNumber ?? null,
        }));
        await tx`
          INSERT INTO defects ${tx(batch)}
          ON CONFLICT (wafer_id, defect_id) DO NOTHING
        `;
      }

      // 7. Refresh materialized views
      try {
        await tx`REFRESH MATERIALIZED VIEW CONCURRENTLY lot_statistics`;
        await tx`REFRESH MATERIALIZED VIEW CONCURRENTLY defect_class_pareto`;
      } catch {
        try {
          await tx`REFRESH MATERIALIZED VIEW lot_statistics`;
          await tx`REFRESH MATERIALIZED VIEW defect_class_pareto`;
        } catch {
          // Ignore — views refresh on next import
        }
      }

      return {
        success: true,
        importId: imp.id as string,
        lotId: file.identity.lotId,
        waferCount: 1,
        defectCount: file.defects.length,
        warnings: file.source.warnings.map((w) => w.message),
        errors: [],
        durationMs: performance.now() - startTime,
      };
    });
  } catch (err) {
    return {
      success: false,
      importId: '',
      lotId: file.identity.lotId,
      waferCount: 0,
      defectCount: 0,
      warnings: [],
      errors: [err instanceof Error ? err.message : String(err)],
      durationMs: performance.now() - startTime,
    };
  }
}
