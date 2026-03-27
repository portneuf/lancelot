/**
 * Coordinate transformation utilities for semiconductor wafer inspection.
 *
 * Converts between die-relative coordinates and absolute wafer coordinates
 * using the wafer geometry (die pitch, die origin, sample center).
 */

import type { DefectRecord } from '../models/defect';
import type { WaferGeometry } from '../models/wafer';

/**
 * Compute the absolute wafer position for a defect given the wafer geometry.
 *
 * The absolute position is calculated as:
 *   xAbs = sampleCenterLocation.x + (xIndex * diePitch.x) + dieOrigin.x + xRel
 *   yAbs = sampleCenterLocation.y + (yIndex * diePitch.y) + dieOrigin.y + yRel
 *
 * @param defect   - A defect record with xRel, yRel, xIndex, yIndex populated.
 * @param geometry - The wafer geometry containing pitch, origin, and center.
 * @returns An object with the computed xAbs and yAbs values in micrometers.
 */
export function computeAbsolutePosition(
  defect: Pick<DefectRecord, 'xRel' | 'yRel' | 'xIndex' | 'yIndex'>,
  geometry: WaferGeometry,
): { xAbs: number; yAbs: number } {
  const [pitchX, pitchY] = geometry.diePitch;
  const [originX, originY] = geometry.dieOrigin;
  const [centerX, centerY] = geometry.sampleCenterLocation;

  const xAbs = centerX + defect.xIndex * pitchX + originX + defect.xRel;
  const yAbs = centerY + defect.yIndex * pitchY + originY + defect.yRel;

  return { xAbs, yAbs };
}

/**
 * Populate the xAbs and yAbs fields on a DefectRecord in place.
 *
 * This is a convenience wrapper around computeAbsolutePosition that
 * mutates the defect record directly.
 *
 * @param defect   - The defect record to update.
 * @param geometry - The wafer geometry.
 * @returns The same defect record, with xAbs and yAbs set.
 */
export function applyAbsolutePosition(
  defect: DefectRecord,
  geometry: WaferGeometry,
): DefectRecord {
  const { xAbs, yAbs } = computeAbsolutePosition(defect, geometry);
  defect.xAbs = xAbs;
  defect.yAbs = yAbs;
  return defect;
}

/**
 * Batch-compute absolute positions for an array of defects.
 *
 * Mutates each defect record in place for efficiency on large datasets.
 *
 * @param defects  - Array of defect records.
 * @param geometry - The wafer geometry.
 * @returns The same array, with all xAbs/yAbs fields populated.
 */
export function applyAbsolutePositions(
  defects: DefectRecord[],
  geometry: WaferGeometry,
): DefectRecord[] {
  const [pitchX, pitchY] = geometry.diePitch;
  const [originX, originY] = geometry.dieOrigin;
  const [centerX, centerY] = geometry.sampleCenterLocation;

  for (const defect of defects) {
    defect.xAbs = centerX + defect.xIndex * pitchX + originX + defect.xRel;
    defect.yAbs = centerY + defect.yIndex * pitchY + originY + defect.yRel;
  }

  return defects;
}
