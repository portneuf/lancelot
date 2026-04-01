/**
 * Hough Transform for line detection in wafer defect patterns.
 *
 * Complements the existing RANSAC scratch detector:
 * - Hough is better for detecting multiple parallel scratches
 * - RANSAC is better for single dominant scratches
 *
 * The algorithm discretizes the (theta, rho) parameter space into an
 * accumulator array, votes for each defect point, and extracts peaks.
 */

import type { DefectRecord } from '@/core/models/defect';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HoughParams {
  /** Angle resolution in degrees (default: 1). */
  angleResolution: number;
  /** Distance resolution in micrometers (default: 500). */
  distResolution: number;
  /** Minimum votes for a line (default: 15). */
  threshold: number;
  /** Minimum line length in micrometers (default: 5000). */
  minLineLength: number;
  /** Maximum gap between points on a line in micrometers (default: 3000). */
  maxLineGap: number;
}

export interface HoughLine {
  /** Angle in degrees [0, 180). */
  angle: number;
  /** Perpendicular distance from origin in micrometers. */
  distance: number;
  /** Defect IDs lying on this line. */
  defectIds: number[];
  /** Start point [x, y] in micrometers. */
  startPoint: [number, number];
  /** End point [x, y] in micrometers. */
  endPoint: [number, number];
  /** Line length in micrometers. */
  length: number;
  /** Estimated width (spread around the line) in micrometers. */
  width: number;
  /** Number of votes in the accumulator. */
  votes: number;
}

export interface HoughResult {
  lines: HoughLine[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_HOUGH_PARAMS: HoughParams = {
  angleResolution: 1,
  distResolution: 500,
  threshold: 15,
  minLineLength: 5000,
  maxLineGap: 3000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEG_TO_RAD = Math.PI / 180;

function pointToLineDistance(
  px: number, py: number,
  theta: number, rho: number,
): number {
  const cosT = Math.cos(theta * DEG_TO_RAD);
  const sinT = Math.sin(theta * DEG_TO_RAD);
  return Math.abs(px * cosT + py * sinT - rho);
}

// ---------------------------------------------------------------------------
// Main algorithm
// ---------------------------------------------------------------------------

/**
 * Run Hough Transform on defect points to detect linear patterns.
 */
export function detectHoughLines(
  defects: readonly DefectRecord[],
  waferCenter: [number, number],
  waferRadius: number,
  params: Partial<HoughParams> = {},
): HoughResult {
  const p: HoughParams = { ...DEFAULT_HOUGH_PARAMS, ...params };

  if (defects.length < p.threshold) {
    return { lines: [] };
  }

  // Normalize coordinates relative to wafer center
  const points = defects.map((d) => ({
    x: d.xAbs - waferCenter[0],
    y: d.yAbs - waferCenter[1],
    id: d.defectId,
  }));

  // Accumulator dimensions
  const numAngles = Math.ceil(180 / p.angleResolution);
  const maxDist = waferRadius * 1.1;
  const numDists = Math.ceil((2 * maxDist) / p.distResolution) + 1;
  const distOffset = maxDist; // shift so rho >= 0 in accumulator

  // Precompute sin/cos tables
  const cosTable = new Float64Array(numAngles);
  const sinTable = new Float64Array(numAngles);
  for (let ai = 0; ai < numAngles; ai++) {
    const theta = ai * p.angleResolution * DEG_TO_RAD;
    cosTable[ai] = Math.cos(theta);
    sinTable[ai] = Math.sin(theta);
  }

  // Vote
  const accumulator = new Int32Array(numAngles * numDists);

  for (const pt of points) {
    for (let ai = 0; ai < numAngles; ai++) {
      const rho = pt.x * cosTable[ai] + pt.y * sinTable[ai];
      const di = Math.round((rho + distOffset) / p.distResolution);
      if (di >= 0 && di < numDists) {
        accumulator[ai * numDists + di]++;
      }
    }
  }

  // Extract peaks above threshold with non-maximum suppression
  const peaks: Array<{ ai: number; di: number; votes: number }> = [];

  for (let ai = 0; ai < numAngles; ai++) {
    for (let di = 0; di < numDists; di++) {
      const votes = accumulator[ai * numDists + di];
      if (votes < p.threshold) continue;

      // Check 3x3 neighborhood for NMS
      let isMax = true;
      for (let da = -1; da <= 1 && isMax; da++) {
        for (let dd = -1; dd <= 1 && isMax; dd++) {
          if (da === 0 && dd === 0) continue;
          const na = (ai + da + numAngles) % numAngles;
          const nd = di + dd;
          if (nd >= 0 && nd < numDists && accumulator[na * numDists + nd] > votes) {
            isMax = false;
          }
        }
      }

      if (isMax) {
        peaks.push({ ai, di, votes });
      }
    }
  }

  // Sort by votes descending
  peaks.sort((a, b) => b.votes - a.votes);

  // Convert peaks to lines
  const lines: HoughLine[] = [];
  const usedDefects = new Set<number>();

  for (const peak of peaks) {
    const theta = peak.ai * p.angleResolution;
    const rho = peak.di * p.distResolution - distOffset;
    const tolerance = p.distResolution * 1.5;

    // Find inlier defects for this line
    const inliers: Array<{ x: number; y: number; id: number; proj: number }> = [];
    for (const pt of points) {
      if (usedDefects.has(pt.id)) continue;
      const dist = pointToLineDistance(pt.x, pt.y, theta, rho);
      if (dist <= tolerance) {
        // Project point onto line for ordering
        const sinT = Math.sin(theta * DEG_TO_RAD);
        const cosT = Math.cos(theta * DEG_TO_RAD);
        const proj = -pt.x * sinT + pt.y * cosT;
        inliers.push({ ...pt, proj });
      }
    }

    if (inliers.length < p.threshold) continue;

    // Sort by projection to find endpoints
    inliers.sort((a, b) => a.proj - b.proj);

    // Check for gaps — split into segments if needed
    const segments: typeof inliers[] = [[]];
    segments[0].push(inliers[0]);
    for (let i = 1; i < inliers.length; i++) {
      const gap = Math.abs(inliers[i].proj - inliers[i - 1].proj);
      if (gap > p.maxLineGap) {
        segments.push([]);
      }
      segments[segments.length - 1].push(inliers[i]);
    }

    for (const seg of segments) {
      if (seg.length < 3) continue;

      const first = seg[0];
      const last = seg[seg.length - 1];
      const length = Math.sqrt(
        (last.x - first.x) ** 2 + (last.y - first.y) ** 2,
      );

      if (length < p.minLineLength) continue;

      // Compute width as RMS distance from the line
      let sumSqDist = 0;
      for (const pt of seg) {
        sumSqDist += pointToLineDistance(pt.x, pt.y, theta, rho) ** 2;
      }
      const width = Math.sqrt(sumSqDist / seg.length) * 2;

      // Mark defects as used
      for (const pt of seg) usedDefects.add(pt.id);

      lines.push({
        angle: theta,
        distance: rho,
        defectIds: seg.map((pt) => pt.id),
        startPoint: [first.x + waferCenter[0], first.y + waferCenter[1]],
        endPoint: [last.x + waferCenter[0], last.y + waferCenter[1]],
        length,
        width,
        votes: peak.votes,
      });
    }

    // Limit to top 20 lines
    if (lines.length >= 20) break;
  }

  return { lines };
}
