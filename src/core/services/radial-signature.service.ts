/**
 * Radial signature detection via angular histogram + peak detection.
 *
 * Detects directional defect patterns (radial streaks emanating from
 * a point, typically the wafer center or a contamination source).
 * Also includes zonal density detection for area signatures.
 */

import type { DefectRecord } from '@/core/models/defect';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RadialParams {
  /** Number of angular sectors in degrees (default: 10). */
  sectorWidth: number;
  /** Peak detection threshold as multiple of average (default: 2.5). */
  peakThreshold: number;
  /** Minimum defects in a sector to consider (default: 5). */
  minDefects: number;
}

export interface RadialSignature {
  /** Center angle of the sector in degrees [0, 360). */
  angle: number;
  /** Sector width in degrees. */
  sectorWidth: number;
  /** Number of defects in this sector. */
  defectCount: number;
  /** Ratio to average sector count. */
  relativeStrength: number;
  /** Defect IDs in this sector. */
  defectIds: number[];
}

export interface RadialResult {
  signatures: RadialSignature[];
  averagePerSector: number;
}

// ---------------------------------------------------------------------------
// Zonal density types
// ---------------------------------------------------------------------------

export interface ZonalParams {
  /** Grid size for density computation (default: 10). */
  gridSize: number;
  /** Density threshold as multiple of average (default: 3.0). */
  densityThreshold: number;
  /** Minimum cells in a zone (default: 2). */
  minCells: number;
}

export interface DensityZone {
  /** Cells belonging to this zone. */
  cells: Array<{ gx: number; gy: number; count: number }>;
  /** Total defects in the zone. */
  totalDefects: number;
  /** Bounding box in grid coordinates. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  /** Defect IDs in this zone. */
  defectIds: number[];
}

export interface ZonalResult {
  zones: DensityZone[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_RADIAL_PARAMS: RadialParams = {
  sectorWidth: 10,
  peakThreshold: 2.5,
  minDefects: 5,
};

export const DEFAULT_ZONAL_PARAMS: ZonalParams = {
  gridSize: 10,
  densityThreshold: 3.0,
  minCells: 2,
};

// ---------------------------------------------------------------------------
// Radial detection
// ---------------------------------------------------------------------------

export function detectRadialSignatures(
  defects: readonly DefectRecord[],
  waferCenter: [number, number],
  _waferRadius: number,
  params: Partial<RadialParams> = {},
): RadialResult {
  const p: RadialParams = { ...DEFAULT_RADIAL_PARAMS, ...params };

  if (defects.length === 0) {
    return { signatures: [], averagePerSector: 0 };
  }

  const [cx, cy] = waferCenter;
  const numSectors = Math.ceil(360 / p.sectorWidth);
  const bins: number[][] = Array.from({ length: numSectors }, () => []);

  for (const d of defects) {
    const dx = d.xAbs - cx;
    const dy = d.yAbs - cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const sector = Math.min(numSectors - 1, Math.floor(angle / p.sectorWidth));
    bins[sector].push(d.defectId);
  }

  const totalInBins = bins.reduce((s, b) => s + b.length, 0);
  const avgPerSector = totalInBins / numSectors;

  const signatures: RadialSignature[] = [];

  for (let i = 0; i < numSectors; i++) {
    const count = bins[i].length;
    if (count < p.minDefects) continue;

    const relativeStrength = avgPerSector > 0 ? count / avgPerSector : 0;
    if (relativeStrength < p.peakThreshold) continue;

    signatures.push({
      angle: i * p.sectorWidth + p.sectorWidth / 2,
      sectorWidth: p.sectorWidth,
      defectCount: count,
      relativeStrength,
      defectIds: bins[i],
    });
  }

  return { signatures, averagePerSector: avgPerSector };
}

// ---------------------------------------------------------------------------
// Zonal density detection (flood-fill based)
// ---------------------------------------------------------------------------

export function detectDensityZones(
  defects: readonly DefectRecord[],
  waferCenter: [number, number],
  waferRadius: number,
  params: Partial<ZonalParams> = {},
): ZonalResult {
  const p: ZonalParams = { ...DEFAULT_ZONAL_PARAMS, ...params };

  if (defects.length === 0) {
    return { zones: [] };
  }

  const [cx, cy] = waferCenter;
  const gs = p.gridSize;
  const cellSize = (waferRadius * 2) / gs;

  // Build density grid
  const grid: number[] = new Array(gs * gs).fill(0);
  const gridDefects: number[][] = Array.from({ length: gs * gs }, () => []);

  for (const d of defects) {
    const gx = Math.floor((d.xAbs - cx + waferRadius) / cellSize);
    const gy = Math.floor((d.yAbs - cy + waferRadius) / cellSize);
    if (gx < 0 || gx >= gs || gy < 0 || gy >= gs) continue;
    const idx = gy * gs + gx;
    grid[idx]++;
    gridDefects[idx].push(d.defectId);
  }

  // Compute average density
  const nonZeroCells = grid.filter((c) => c > 0).length;
  const avgDensity = nonZeroCells > 0
    ? grid.reduce((s, c) => s + c, 0) / nonZeroCells
    : 0;
  const threshold = avgDensity * p.densityThreshold;

  // Flood-fill to find connected high-density zones
  const visited = new Uint8Array(gs * gs);
  const zones: DensityZone[] = [];

  for (let y = 0; y < gs; y++) {
    for (let x = 0; x < gs; x++) {
      const idx = y * gs + x;
      if (visited[idx] || grid[idx] < threshold) continue;

      // BFS flood-fill
      const queue: Array<[number, number]> = [[x, y]];
      const cells: Array<{ gx: number; gy: number; count: number }> = [];
      const defectIds: number[] = [];
      visited[idx] = 1;

      while (queue.length > 0) {
        const [qx, qy] = queue.shift()!;
        const qi = qy * gs + qx;
        cells.push({ gx: qx, gy: qy, count: grid[qi] });
        defectIds.push(...gridDefects[qi]);

        // 4-connected neighbors
        for (const [nx, ny] of [[qx - 1, qy], [qx + 1, qy], [qx, qy - 1], [qx, qy + 1]]) {
          if (nx < 0 || nx >= gs || ny < 0 || ny >= gs) continue;
          const ni = ny * gs + nx;
          if (visited[ni] || grid[ni] < threshold) continue;
          visited[ni] = 1;
          queue.push([nx, ny]);
        }
      }

      if (cells.length < p.minCells) continue;

      const bounds = {
        minX: Math.min(...cells.map((c) => c.gx)),
        maxX: Math.max(...cells.map((c) => c.gx)),
        minY: Math.min(...cells.map((c) => c.gy)),
        maxY: Math.max(...cells.map((c) => c.gy)),
      };

      zones.push({
        cells,
        totalDefects: defectIds.length,
        bounds,
        defectIds,
      });
    }
  }

  return { zones };
}
