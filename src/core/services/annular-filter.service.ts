/**
 * Annular filter for ring and edge-ring signature detection.
 *
 * Divides the wafer into concentric rings and computes defect density
 * per ring. Rings with density significantly above average are flagged
 * as ring signatures. Edge-rings are identified when the outermost
 * rings are anomalously dense.
 */

import type { DefectRecord } from '@/core/models/defect';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnnularParams {
  /** Number of concentric rings (default: 20). */
  rings: number;
  /** Density threshold as multiple of average (default: 2.0). */
  densityThreshold: number;
  /** Minimum fraction of the ring arc that must be filled (default: 0.3). */
  minArcFraction: number;
}

export interface AnnularRing {
  /** Inner radius normalized to [0, 1] of wafer radius. */
  innerRadius: number;
  /** Outer radius normalized to [0, 1] of wafer radius. */
  outerRadius: number;
  /** Defect density (defects per mm²). */
  density: number;
  /** Ratio to overall average density. */
  relativeDensity: number;
  /** Fraction of the ring arc containing defects [0, 1]. */
  arcFraction: number;
  /** Defect IDs in this ring. */
  defectIds: number[];
  /** Classification of the ring. */
  type: 'full-ring' | 'partial-ring' | 'edge-ring';
}

export interface AnnularResult {
  rings: AnnularRing[];
  averageDensity: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_ANNULAR_PARAMS: AnnularParams = {
  rings: 20,
  densityThreshold: 2.0,
  minArcFraction: 0.3,
};

// ---------------------------------------------------------------------------
// Main algorithm
// ---------------------------------------------------------------------------

export function detectAnnularSignatures(
  defects: readonly DefectRecord[],
  waferCenter: [number, number],
  waferRadius: number,
  params: Partial<AnnularParams> = {},
): AnnularResult {
  const p: AnnularParams = { ...DEFAULT_ANNULAR_PARAMS, ...params };

  if (defects.length === 0) {
    return { rings: [], averageDensity: 0 };
  }

  const [cx, cy] = waferCenter;
  const numSectors = 36; // 10° sectors for arc fraction computation
  const ringWidth = waferRadius / p.rings;

  // Bin defects into rings and sectors
  const ringBins: Array<{
    defectIds: number[];
    sectorHits: Set<number>;
  }> = Array.from({ length: p.rings }, () => ({
    defectIds: [],
    sectorHits: new Set(),
  }));

  for (const d of defects) {
    const dx = d.xAbs - cx;
    const dy = d.yAbs - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ringIdx = Math.min(p.rings - 1, Math.floor(dist / ringWidth));

    ringBins[ringIdx].defectIds.push(d.defectId);

    // Sector for arc fraction
    const angle = Math.atan2(dy, dx);
    const sector = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * numSectors) % numSectors;
    ringBins[ringIdx].sectorHits.add(sector);
  }

  // Compute average density across the entire wafer
  const totalArea = Math.PI * (waferRadius / 1000) ** 2; // mm²
  const avgDensity = defects.length / totalArea;

  // Identify anomalous rings
  const result: AnnularRing[] = [];
  const edgeThreshold = p.rings * 0.8; // rings beyond 80% radius are "edge"

  for (let i = 0; i < p.rings; i++) {
    const bin = ringBins[i];
    if (bin.defectIds.length === 0) continue;

    const innerR = i * ringWidth;
    const outerR = (i + 1) * ringWidth;
    const ringArea = Math.PI * (outerR ** 2 - innerR ** 2) / 1e6; // mm²
    const density = ringArea > 0 ? bin.defectIds.length / ringArea : 0;
    const relativeDensity = avgDensity > 0 ? density / avgDensity : 0;
    const arcFraction = bin.sectorHits.size / numSectors;

    if (relativeDensity < p.densityThreshold) continue;
    if (arcFraction < p.minArcFraction) continue;

    const innerNorm = innerR / waferRadius;
    const outerNorm = outerR / waferRadius;

    let type: AnnularRing['type'];
    if (i >= edgeThreshold) {
      type = 'edge-ring';
    } else if (arcFraction >= 0.7) {
      type = 'full-ring';
    } else {
      type = 'partial-ring';
    }

    result.push({
      innerRadius: innerNorm,
      outerRadius: outerNorm,
      density,
      relativeDensity,
      arcFraction,
      defectIds: bin.defectIds,
      type,
    });
  }

  return { rings: result, averageDensity: avgDensity };
}
