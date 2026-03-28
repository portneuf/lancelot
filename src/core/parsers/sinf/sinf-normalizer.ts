/**
 * SINF normalizer: transforms RawSinfData into InspectionFile.
 *
 * SINF is a die-level format (no individual defects), so:
 * - defects[] is empty
 * - dieMap[] contains the bin status of each die
 * - waferGeometry is derived from die pitch and grid size
 */

import type { InspectionFile, SourceInfo, ParseWarning, ClassLookupEntry } from '../../models/inspection-file';
import type { InspectionIdentity } from '../../models/lot';
import type { WaferGeometry, DieMapEntry, DieStatus } from '../../models/wafer';
import type { OrientationMarkLocation } from '../../models/wafer';
import type { InspectionSetup } from '../../models/equipment';
import type { RawSinfData } from './sinf-types';

export interface SinfNormalizerInput {
  raw: RawSinfData;
  fileName: string;
  fileSize: number;
  warnings: ParseWarning[];
}

const FNLOC_MAP: Record<string, OrientationMarkLocation> = {
  U: 'UP', D: 'DOWN', L: 'LEFT', R: 'RIGHT',
};

export function normalizeSinfData(input: SinfNormalizerInput): InspectionFile {
  const { raw, fileName, fileSize, warnings } = input;

  // Compute wafer diameter from grid
  const pitchX = raw.xdies || 5000;
  const pitchY = raw.ydies || 5000;
  const waferDiameter = Math.max(raw.colct * pitchX, raw.rowct * pitchY) * 1.15; // ~15% margin
  const center = waferDiameter / 2;

  const source: SourceInfo = {
    formatId: 'sinf',
    formatVersion: '1.0',
    fileName,
    fileSize,
    parseTimestamp: new Date().toISOString(),
    warnings,
  };

  const identity: InspectionIdentity = {
    lotId: raw.lot,
    waferId: raw.wafer,
    deviceId: raw.device,
  };

  const waferGeometry: WaferGeometry = {
    waferDiameter,
    diePitch: [pitchX, pitchY],
    dieOrigin: [0, 0],
    sampleCenterLocation: [center, center],
    orientationMarkType: 'NOTCH',
    orientationMarkLocation: FNLOC_MAP[raw.fnloc] ?? 'DOWN',
    sampleSizeRaw: [1, waferDiameter],
  };

  const inspectionSetup: InspectionSetup = {
    stationId: { vendor: 'SINF', model: 'WaferMap', equipmentId: '' },
  };

  // Build die map from row data
  const goodBins = new Set(raw.bcequ.map((b) => b.toUpperCase()));
  const dieMap: DieMapEntry[] = [];
  const binSet = new Set<string>();

  for (let row = 0; row < raw.rows.length; row++) {
    for (let col = 0; col < raw.rows[row].length; col++) {
      const binCode = raw.rows[row][col].toUpperCase();

      // Skip empty positions
      if (binCode === '__' || binCode === '..') continue;

      const xIndex = col - Math.floor(raw.colct / 2);
      const yIndex = row - Math.floor(raw.rowct / 2);

      let status: DieStatus;
      if (binCode === '@@') {
        status = 'untested';
      } else if (binCode === 'FF') {
        status = 'reference';
      } else if (goodBins.has(binCode)) {
        status = 'tested'; // pass
      } else {
        status = 'failed';
      }

      binSet.add(binCode);
      dieMap.push({
        xIndex,
        yIndex,
        status,
        binValue: parseInt(binCode, 16),
        defectCount: status === 'failed' ? 1 : 0,
      });
    }
  }

  // Build class lookup from bin codes
  const classLookup: ClassLookupEntry[] = Array.from(binSet)
    .filter((b) => b !== '__' && b !== '..' && b !== '@@')
    .sort()
    .map((binCode, i) => ({
      classNumber: i + 1,
      className: goodBins.has(binCode) ? `Pass (${binCode})` : `Fail (${binCode})`,
      classCode: binCode,
    }));

  return {
    source,
    identity,
    waferGeometry,
    inspectionSetup,
    defects: [],       // SINF has no defect-level data
    defectSchema: [],
    dieMap,
    classLookup,
    summaries: [],
    summarySchema: [],
    testPlan: dieMap.map((d) => ({ xIndex: d.xIndex, yIndex: d.yIndex })),
  };
}
