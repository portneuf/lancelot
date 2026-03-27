/**
 * KLARF normalizer: transforms RawKlarfData into the format-agnostic InspectionFile.
 *
 * Responsibilities:
 *  - Map raw KLARF fields to domain model interfaces
 *  - Build DefectRecord objects with absolute coordinates
 *  - Construct the DieMap from defect data
 *  - Resolve class names from ClassLookup
 */

import type { InspectionFile, SourceInfo, ParseWarning, ClassLookupEntry, TestPlanEntry } from '../../models/inspection-file';
import type { InspectionIdentity } from '../../models/lot';
import type { WaferGeometry, DieMapEntry } from '../../models/wafer';
import type { OrientationMarkType, OrientationMarkLocation } from '../../models/wafer';
import type { InspectionSetup } from '../../models/equipment';
import type { DefectRecord, DefectColumnSchema } from '../../models/defect';
import type { SummaryRecord, SummaryColumnSchema } from '../../models/summary';
import type { RawKlarfData } from './klarf-types';
import { CORE_COLUMN_MAP } from './klarf-constants';

export interface NormalizerInput {
  raw: RawKlarfData;
  fileName: string;
  fileSize: number;
  warnings: ParseWarning[];
}

/**
 * Normalize raw KLARF data into an InspectionFile.
 */
export function normalizeKlarfData(input: NormalizerInput): InspectionFile {
  const { raw, fileName, fileSize, warnings } = input;

  const source = buildSource(raw, fileName, fileSize, warnings);
  const identity = buildIdentity(raw);
  const waferGeometry = buildWaferGeometry(raw);
  const inspectionSetup = buildInspectionSetup(raw);
  const defectSchema = buildDefectSchema(raw.defectRecordSpec);
  const defects = buildDefects(raw, defectSchema, waferGeometry);
  const summarySchema = buildSummarySchema(raw.summarySpec);
  const summaries = buildSummaries(raw, summarySchema);
  const classLookup = buildClassLookup(raw);
  const testPlan = buildTestPlan(raw);
  const dieMap = buildDieMap(defects, testPlan);

  // Resolve class names on defects
  resolveClassNames(defects, classLookup);

  return {
    source,
    identity,
    waferGeometry,
    inspectionSetup,
    defects,
    defectSchema,
    dieMap,
    classLookup,
    summaries,
    summarySchema,
    testPlan,
  };
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildSource(
  raw: RawKlarfData,
  fileName: string,
  fileSize: number,
  warnings: ParseWarning[],
): SourceInfo {
  return {
    formatId: 'klarf',
    formatVersion: `${raw.fileVersion[0]}.${raw.fileVersion[1]}`,
    fileName,
    fileSize,
    parseTimestamp: new Date().toISOString(),
    warnings,
  };
}

function buildIdentity(raw: RawKlarfData): InspectionIdentity {
  return {
    lotId: raw.lotId,
    waferId: raw.waferId,
    slot: raw.slot,
    deviceId: raw.deviceId,
    stepId: raw.stepId,
    fileTimestamp: raw.fileTimestamp,
    resultTimestamp: raw.resultTimestamp,
  };
}

function buildWaferGeometry(raw: RawKlarfData): WaferGeometry {
  return {
    waferDiameter: raw.sampleSize[1],
    diePitch: raw.diePitch,
    dieOrigin: raw.dieOrigin,
    sampleCenterLocation: raw.sampleCenterLocation,
    orientationMarkType: raw.orientationMarkType as OrientationMarkType | undefined,
    orientationMarkLocation: raw.orientationMarkLocation as OrientationMarkLocation | undefined,
    sampleSizeRaw: raw.sampleSize,
  };
}

function buildInspectionSetup(raw: RawKlarfData): InspectionSetup {
  return {
    stationId: {
      vendor: raw.stationVendor ?? '',
      model: raw.stationModel ?? '',
      equipmentId: raw.stationEquipmentId ?? '',
    },
    setupId: raw.setupId,
  };
}

function buildDefectSchema(specColumns: string[]): DefectColumnSchema[] {
  return specColumns.map((name, index) => ({
    name,
    type: inferColumnType(name),
    index,
  }));
}

function inferColumnType(name: string): 'int32' | 'float' | 'string' | 'unknown' {
  const upper = name.toUpperCase();
  if (upper === 'DEFECTID' || upper === 'XINDEX' || upper === 'YINDEX' ||
      upper === 'CLASSNUMBER' || upper === 'TEST' || upper === 'CLUSTERNUMBER' ||
      upper === 'IMAGECOUNT' || upper === 'ROUGHBINNUMBER' || upper === 'FINEBINNUMBER') {
    return 'int32';
  }
  if (upper === 'XREL' || upper === 'YREL' || upper === 'XSIZE' || upper === 'YSIZE' ||
      upper === 'DEFECTAREA' || upper === 'DSIZE' || upper === 'DEFECTSIZE') {
    return 'float';
  }
  return 'unknown';
}

function buildDefects(
  raw: RawKlarfData,
  schema: DefectColumnSchema[],
  geometry: WaferGeometry,
): DefectRecord[] {
  const colMap = buildColumnIndexMap(schema);
  const defects: DefectRecord[] = [];

  for (const row of raw.defects) {
    const defect = buildDefectRecord(row, colMap, schema, geometry);
    if (defect) defects.push(defect);
  }

  return defects;
}

interface ColumnIndexMap {
  defectId: number;
  xRel: number;
  yRel: number;
  xIndex: number;
  yIndex: number;
  size: number;
  classNumber: number;
  clusterNumber: number;
  test: number;
  imageCount: number;
}

function buildColumnIndexMap(schema: DefectColumnSchema[]): ColumnIndexMap {
  const map: Record<string, number> = {};
  for (const col of schema) {
    const coreField = CORE_COLUMN_MAP[col.name];
    if (coreField) {
      map[coreField] = col.index;
    }
  }

  return {
    defectId: map['defectId'] ?? -1,
    xRel: map['xRel'] ?? -1,
    yRel: map['yRel'] ?? -1,
    xIndex: map['xIndex'] ?? -1,
    yIndex: map['yIndex'] ?? -1,
    size: map['size'] ?? -1,
    classNumber: map['classNumber'] ?? -1,
    clusterNumber: map['clusterNumber'] ?? -1,
    test: map['test'] ?? -1,
    imageCount: map['imageCount'] ?? -1,
  };
}

function buildDefectRecord(
  row: number[],
  colMap: ColumnIndexMap,
  schema: DefectColumnSchema[],
  geometry: WaferGeometry,
): DefectRecord | null {
  const val = (idx: number): number | undefined =>
    idx >= 0 && idx < row.length ? row[idx] : undefined;

  const defectId = val(colMap.defectId);
  const xRel = val(colMap.xRel) ?? 0;
  const yRel = val(colMap.yRel) ?? 0;
  const xIndex = val(colMap.xIndex) ?? 0;
  const yIndex = val(colMap.yIndex) ?? 0;

  // Compute absolute wafer position
  const xAbs = geometry.dieOrigin[0] + xIndex * geometry.diePitch[0] + xRel;
  const yAbs = geometry.dieOrigin[1] + yIndex * geometry.diePitch[1] + yRel;

  // Build extra fields (columns not in core map)
  const extra: Record<string, number | string> = {};
  for (const col of schema) {
    if (!CORE_COLUMN_MAP[col.name] && col.index < row.length) {
      extra[col.name] = row[col.index];
    }
  }

  return {
    defectId: defectId ?? 0,
    xRel,
    yRel,
    xIndex,
    yIndex,
    size: val(colMap.size),
    classNumber: val(colMap.classNumber),
    clusterNumber: val(colMap.clusterNumber),
    test: val(colMap.test),
    imageCount: val(colMap.imageCount),
    extra,
    xAbs,
    yAbs,
  };
}

function buildSummarySchema(specColumns: string[]): SummaryColumnSchema[] {
  return specColumns.map((name, index) => ({
    name,
    type: 'float' as const,
    index,
  }));
}

function buildSummaries(raw: RawKlarfData, schema: SummaryColumnSchema[]): SummaryRecord[] {
  return raw.summaries.map((row) => {
    const values: Record<string, number | string> = {};
    for (const col of schema) {
      if (col.index < row.length) {
        values[col.name] = row[col.index];
      }
    }
    return {
      testNumber: row[0] ?? 0,
      areaPerTest: raw.areaPerTest,
      values,
    };
  });
}

function buildClassLookup(raw: RawKlarfData): ClassLookupEntry[] {
  return raw.classLookup.map((entry) => ({
    classNumber: entry.classNumber,
    className: entry.className,
    classCode: entry.classCode,
  }));
}

function buildTestPlan(raw: RawKlarfData): TestPlanEntry[] {
  return raw.testPlan.map(([x, y]) => ({ xIndex: x, yIndex: y }));
}

/**
 * Build die map from defect positions and test plan.
 */
function buildDieMap(defects: DefectRecord[], testPlan: TestPlanEntry[]): DieMapEntry[] {
  // Count defects per die
  const dieDefectCount = new Map<string, number>();
  const allDies = new Set<string>();

  for (const defect of defects) {
    const key = `${defect.xIndex},${defect.yIndex}`;
    allDies.add(key);
    dieDefectCount.set(key, (dieDefectCount.get(key) ?? 0) + 1);
  }

  // Add test plan dies
  for (const tp of testPlan) {
    allDies.add(`${tp.xIndex},${tp.yIndex}`);
  }

  const testPlanSet = new Set(testPlan.map((tp) => `${tp.xIndex},${tp.yIndex}`));

  const dieMap: DieMapEntry[] = [];
  for (const key of allDies) {
    const [x, y] = key.split(',').map(Number);
    const defectCount = dieDefectCount.get(key) ?? 0;
    const inTestPlan = testPlanSet.has(key);

    dieMap.push({
      xIndex: x,
      yIndex: y,
      status: inTestPlan || defectCount > 0 ? 'tested' : 'untested',
      defectCount,
    });
  }

  return dieMap;
}

/**
 * Resolve class names on defect records from the class lookup table.
 */
function resolveClassNames(defects: DefectRecord[], classLookup: ClassLookupEntry[]): void {
  if (classLookup.length === 0) return;

  const lookupMap = new Map<number, string>();
  for (const entry of classLookup) {
    lookupMap.set(entry.classNumber, entry.className);
  }

  for (const defect of defects) {
    if (defect.classNumber != null) {
      defect.extra['_className'] = lookupMap.get(defect.classNumber) ?? '';
    }
  }
}
