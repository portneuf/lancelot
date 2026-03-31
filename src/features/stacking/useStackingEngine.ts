/**
 * Stacking engine hook — computes aggregated heatmap data
 * from multiple wafers via the storage adapter.
 */

import { useMemo } from 'react';
import type { InspectionFile } from '@/core/models/inspection-file';
import type { AggregationMode, HeatmapCell } from '@/core/storage';

export interface StackingResult {
  cells: HeatmapCell[];
  waferCount: number;
  gridSize: number;
  aggregation: AggregationMode;
  maxValue: number;
}

/**
 * Compute stacked wafer map data from multiple files.
 * Runs entirely in-memory for immediate results.
 */
export function computeStacking(
  files: InspectionFile[],
  aggregation: AggregationMode,
  gridSize: number,
): StackingResult {
  const grid = new Array(gridSize * gridSize).fill(null).map(() => ({
    defects: 0,
    waferHits: new Set<number>(),
    classCounts: new Map<number, number>(),
  }));

  let waferDiameter = 300000;

  for (let wi = 0; wi < files.length; wi++) {
    const file = files[wi];
    waferDiameter = file.waferGeometry.waferDiameter;
    const [cx, cy] = file.waferGeometry.sampleCenterLocation;

    for (const d of file.defects) {
      const gx = Math.floor(((d.xAbs - cx + waferDiameter / 2) / waferDiameter) * gridSize);
      const gy = Math.floor(((d.yAbs - cy + waferDiameter / 2) / waferDiameter) * gridSize);
      if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) continue;
      const idx = gy * gridSize + gx;
      grid[idx].defects++;
      grid[idx].waferHits.add(wi);
      const cn = d.classNumber ?? 0;
      grid[idx].classCounts.set(cn, (grid[idx].classCounts.get(cn) ?? 0) + 1);
    }
  }

  const cellArea = (waferDiameter / gridSize) ** 2;
  const cells: HeatmapCell[] = [];
  let maxValue = 0;

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const g = grid[gy * gridSize + gx];
      if (g.defects === 0) continue;

      let value: number;
      switch (aggregation) {
        case 'density':
          value = g.defects / (cellArea / 1e6);
          break;
        case 'hit-count':
          value = g.waferHits.size;
          break;
        case 'class-dominance': {
          let maxClass = 0;
          let maxCount = 0;
          for (const [cn, count] of g.classCounts) {
            if (count > maxCount) { maxCount = count; maxClass = cn; }
          }
          value = maxClass;
          break;
        }
      }

      if (value > maxValue) maxValue = value;
      cells.push({ gridX: gx, gridY: gy, value });
    }
  }

  return { cells, waferCount: files.length, gridSize, aggregation, maxValue };
}

/**
 * React hook wrapper for computeStacking with memoization.
 */
export function useStackingEngine(
  files: InspectionFile[],
  aggregation: AggregationMode,
  gridSize: number,
): StackingResult {
  return useMemo(
    () => computeStacking(files, aggregation, gridSize),
    [files, aggregation, gridSize],
  );
}
