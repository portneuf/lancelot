/**
 * Signature Detector — orchestrates all SSA algorithms.
 *
 * Runs DBSCAN (existing), Hough, Annular, Radial, and Zonal
 * analysis on wafer defect data and returns unified results.
 * Can run in the main thread or via the spatial Web Worker.
 */

import { detectHoughLines } from './hough-transform.service';
import { detectAnnularSignatures } from './annular-filter.service';
import { detectRadialSignatures, detectDensityZones } from './radial-signature.service';
import { dbscan } from './cluster-detection.service';
import type { DefectRecord } from '@/core/models/defect';
import type { DetectedSignature } from '@/core/models/spatial-signature';
import type { HoughParams } from './hough-transform.service';
import type { AnnularParams } from './annular-filter.service';
import type { RadialParams, ZonalParams } from './radial-signature.service';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface DetectionConfig {
  enableDbscan: boolean;
  enableHough: boolean;
  enableAnnular: boolean;
  enableRadial: boolean;
  enableZonal: boolean;
  dbscanEpsilon?: number;
  dbscanMinPoints?: number;
  houghParams?: Partial<HoughParams>;
  annularParams?: Partial<AnnularParams>;
  radialParams?: Partial<RadialParams>;
  zonalParams?: Partial<ZonalParams>;
}

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  enableDbscan: true,
  enableHough: true,
  enableAnnular: true,
  enableRadial: true,
  enableZonal: true,
};

export interface DetectionResult {
  signatures: DetectedSignature[];
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

let nextId = 0;
function genId(): string {
  return `sig-${++nextId}-${Date.now().toString(36)}`;
}

export function detectSignatures(
  defects: readonly DefectRecord[],
  waferCenter: [number, number],
  waferRadius: number,
  config: Partial<DetectionConfig> = {},
): DetectionResult {
  const c: DetectionConfig = { ...DEFAULT_DETECTION_CONFIG, ...config };
  const start = performance.now();
  const signatures: DetectedSignature[] = [];

  // 1. DBSCAN Clustering
  if (c.enableDbscan) {
    const clusters = dbscan(
      defects as DefectRecord[],
      c.dbscanEpsilon ?? 5000,
      c.dbscanMinPoints ?? 3,
    );

    // Group defects by cluster
    const clusterMap = new Map<number, number[]>();
    for (let i = 0; i < defects.length; i++) {
      const label = clusters.labels[i];
      if (label < 0) continue; // noise
      if (!clusterMap.has(label)) clusterMap.set(label, []);
      clusterMap.get(label)!.push(defects[i].defectId);
    }

    for (const [clusterId, ids] of clusterMap) {
      if (ids.length < 3) continue;
      signatures.push({
        id: genId(),
        type: 'cluster',
        confidence: Math.min(1, ids.length / 20),
        algorithm: 'dbscan',
        defectIds: ids,
        label: `Cluster #${clusterId} (${ids.length} defects)`,
        params: { clusterId, size: ids.length },
      });
    }
  }

  // 2. Hough Transform (scratches/lines)
  if (c.enableHough) {
    const result = detectHoughLines(defects, waferCenter, waferRadius, c.houghParams);
    for (const line of result.lines) {
      signatures.push({
        id: genId(),
        type: 'scratch',
        confidence: Math.min(1, line.votes / 50),
        algorithm: 'hough',
        defectIds: line.defectIds,
        label: `Scratch ${line.angle.toFixed(0)}° (${line.defectIds.length} defects, ${(line.length / 1000).toFixed(1)}mm)`,
        params: {
          angle: line.angle,
          startPoint: line.startPoint,
          endPoint: line.endPoint,
          length: line.length,
          width: line.width,
        },
      });
    }
  }

  // 3. Annular Filter (rings/edge-rings)
  if (c.enableAnnular) {
    const result = detectAnnularSignatures(defects, waferCenter, waferRadius, c.annularParams);
    for (const ring of result.rings) {
      signatures.push({
        id: genId(),
        type: ring.type === 'edge-ring' ? 'edge-ring' : 'ring',
        confidence: Math.min(1, ring.relativeDensity / 5),
        algorithm: 'annular',
        defectIds: ring.defectIds,
        label: `${ring.type === 'edge-ring' ? 'Edge Ring' : 'Ring'} R=${(ring.innerRadius * 100).toFixed(0)}–${(ring.outerRadius * 100).toFixed(0)}% (${ring.defectIds.length} defects)`,
        params: {
          innerRadius: ring.innerRadius,
          outerRadius: ring.outerRadius,
          density: ring.density,
          relativeDensity: ring.relativeDensity,
          arcFraction: ring.arcFraction,
        },
      });
    }
  }

  // 4. Radial Detection
  if (c.enableRadial) {
    const result = detectRadialSignatures(defects, waferCenter, waferRadius, c.radialParams);
    for (const sig of result.signatures) {
      signatures.push({
        id: genId(),
        type: 'radial',
        confidence: Math.min(1, sig.relativeStrength / 5),
        algorithm: 'radial',
        defectIds: sig.defectIds,
        label: `Radial ${sig.angle.toFixed(0)}° (${sig.defectCount} defects)`,
        params: {
          angle: sig.angle,
          sectorWidth: sig.sectorWidth,
          relativeStrength: sig.relativeStrength,
        },
      });
    }
  }

  // 5. Zonal Density
  if (c.enableZonal) {
    const result = detectDensityZones(defects, waferCenter, waferRadius, c.zonalParams);
    for (const zone of result.zones) {
      signatures.push({
        id: genId(),
        type: 'area',
        confidence: Math.min(1, zone.totalDefects / 100),
        algorithm: 'zonal',
        defectIds: zone.defectIds,
        label: `Area Zone (${zone.cells.length} cells, ${zone.totalDefects} defects)`,
        params: {
          bounds: zone.bounds,
          cellCount: zone.cells.length,
        },
      });
    }
  }

  // Sort by confidence descending
  signatures.sort((a, b) => b.confidence - a.confidence);

  return {
    signatures,
    durationMs: performance.now() - start,
  };
}
