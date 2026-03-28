/**
 * RANSAC-based scratch (linear pattern) detection for wafer defects.
 *
 * Scratches appear as linear alignments of defects on the wafer surface.
 * The algorithm randomly samples pairs of defects, fits a line, counts
 * inliers, and keeps the best-scoring lines above a threshold.
 */

import type { DefectRecord } from '@/core/models/defect';

export interface ScratchLine {
  /** Start X in micrometers. */
  startX: number;
  /** Start Y in micrometers. */
  startY: number;
  /** End X in micrometers. */
  endX: number;
  /** End Y in micrometers. */
  endY: number;
  /** Number of defects lying on (near) this line. */
  inlierCount: number;
  /** Angle of the line in degrees [0, 180). */
  angle: number;
  /** Length of the scratch in micrometers. */
  length: number;
}

/**
 * Perpendicular distance from a point to the line defined by two points.
 */
function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    // Degenerate: both points coincide
    return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  }
  // |cross product| / length
  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / Math.sqrt(lenSq);
}

/**
 * Compute angle of line in degrees [0, 180).
 */
function lineAngle(x1: number, y1: number, x2: number, y2: number): number {
  const rad = Math.atan2(y2 - y1, x2 - x1);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 180;
  if (deg >= 180) deg -= 180;
  return deg;
}

/**
 * Euclidean distance between two points.
 */
function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if two scratch lines are duplicates (similar angle and close proximity).
 */
function areDuplicates(a: ScratchLine, b: ScratchLine): boolean {
  // Angle difference must be small (within 10 degrees, accounting for wrap)
  let angleDiff = Math.abs(a.angle - b.angle);
  if (angleDiff > 90) angleDiff = 180 - angleDiff;
  if (angleDiff > 10) return false;

  // Midpoints must be close (within 20% of average length)
  const midAx = (a.startX + a.endX) / 2;
  const midAy = (a.startY + a.endY) / 2;
  const midBx = (b.startX + b.endX) / 2;
  const midBy = (b.startY + b.endY) / 2;
  const midDist = dist(midAx, midAy, midBx, midBy);
  const avgLen = (a.length + b.length) / 2;
  return midDist < avgLen * 0.3;
}

/**
 * Detect linear defect patterns (scratches) using RANSAC.
 *
 * @param defects  Array of defect records with xAbs/yAbs coordinates.
 * @param minInliers  Minimum defects on a line to count as a scratch (default 5).
 * @param distanceThreshold  Max perpendicular distance from line in um (default 2000).
 * @param iterations  Number of RANSAC iterations (default 200).
 * @returns Array of detected ScratchLine objects sorted by inlier count descending.
 */
export function detectScratches(
  defects: DefectRecord[],
  minInliers: number = 5,
  distanceThreshold: number = 2000,
  iterations: number = 200,
): ScratchLine[] {
  const n = defects.length;
  if (n < 2) return [];

  const candidates: ScratchLine[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    // Pick two distinct random defects
    const i = Math.floor(Math.random() * n);
    let j = Math.floor(Math.random() * (n - 1));
    if (j >= i) j++;

    const x1 = defects[i].xAbs;
    const y1 = defects[i].yAbs;
    const x2 = defects[j].xAbs;
    const y2 = defects[j].yAbs;

    // Skip if the two points are too close (degenerate line)
    if (dist(x1, y1, x2, y2) < 1) continue;

    // Count inliers and track extent along the line
    const inlierIndices: number[] = [];
    for (let k = 0; k < n; k++) {
      const d = pointToLineDistance(defects[k].xAbs, defects[k].yAbs, x1, y1, x2, y2);
      if (d <= distanceThreshold) {
        inlierIndices.push(k);
      }
    }

    if (inlierIndices.length < minInliers) continue;

    // Project inliers onto the line to find start/end extent
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    let tMin = Infinity;
    let tMax = -Infinity;
    for (const idx of inlierIndices) {
      const t =
        ((defects[idx].xAbs - x1) * dx + (defects[idx].yAbs - y1) * dy) / lenSq;
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    }

    const startX = x1 + dx * tMin;
    const startY = y1 + dy * tMin;
    const endX = x1 + dx * tMax;
    const endY = y1 + dy * tMax;

    candidates.push({
      startX,
      startY,
      endX,
      endY,
      inlierCount: inlierIndices.length,
      angle: lineAngle(startX, startY, endX, endY),
      length: dist(startX, startY, endX, endY),
    });
  }

  // Sort by inlier count descending
  candidates.sort((a, b) => b.inlierCount - a.inlierCount);

  // Remove duplicate / overlapping lines — keep the one with more inliers
  const merged: ScratchLine[] = [];
  for (const candidate of candidates) {
    let isDuplicate = false;
    for (const kept of merged) {
      if (areDuplicates(candidate, kept)) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      merged.push(candidate);
    }
  }

  return merged;
}
