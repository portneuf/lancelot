/**
 * Wafer Feature Extraction for ML classification.
 *
 * Extracts a 57-dimensional feature vector from wafer defect data:
 * - 10 radial distribution bins (defect density per ring)
 * - 12 angular distribution bins (defect density per 30° sector)
 * - 25 grid density values (5×5 grid)
 * - 10 statistical features (entropy, centroid, spread, etc.)
 *
 * These features are fed into the WM-811K XGBoost classifier (ONNX).
 */

import type { DefectRecord } from '@/core/models/defect';
import { dbscan } from './cluster-detection.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaferFeatures {
  /** 10 bins: normalized defect count per radial ring. */
  radialDistribution: number[];
  /** 12 bins: normalized defect count per 30° angular sector. */
  angularDistribution: number[];
  /** 25 values: 5×5 grid normalized density. */
  gridDensity: number[];
  /** Shannon entropy of the spatial distribution. */
  entropy: number;
  /** Centroid X normalized to [-1, 1]. */
  centroidX: number;
  /** Centroid Y normalized to [-1, 1]. */
  centroidY: number;
  /** Standard deviation of distances from centroid. */
  spread: number;
  /** Eccentricity (ratio of major/minor axis spread). */
  eccentricity: number;
  /** Fraction of defects in the outer 20% ring. */
  edgeRatio: number;
  /** Number of DBSCAN clusters. */
  clusterCount: number;
  /** Size of the largest cluster. */
  maxClusterSize: number;
  /** Total defect count. */
  totalDefects: number;
}

// ---------------------------------------------------------------------------
// Feature extraction
// ---------------------------------------------------------------------------

export function extractFeatures(
  defects: readonly DefectRecord[],
  waferCenter: [number, number],
  waferRadius: number,
): WaferFeatures {
  const [cx, cy] = waferCenter;
  const n = defects.length;

  if (n === 0) {
    return {
      radialDistribution: new Array(10).fill(0),
      angularDistribution: new Array(12).fill(0),
      gridDensity: new Array(25).fill(0),
      entropy: 0, centroidX: 0, centroidY: 0, spread: 0,
      eccentricity: 0, edgeRatio: 0, clusterCount: 0,
      maxClusterSize: 0, totalDefects: 0,
    };
  }

  // Normalized coordinates
  const nx: number[] = [];
  const ny: number[] = [];
  const dists: number[] = [];
  const angles: number[] = [];

  for (const d of defects) {
    const dx = (d.xAbs - cx) / waferRadius; // [-1, 1]
    const dy = (d.yAbs - cy) / waferRadius;
    nx.push(dx);
    ny.push(dy);
    dists.push(Math.sqrt(dx * dx + dy * dy));
    let a = Math.atan2(dy, dx) * (180 / Math.PI);
    if (a < 0) a += 360;
    angles.push(a);
  }

  // 1. Radial distribution (10 bins, equal-width rings)
  const radial = new Array(10).fill(0);
  for (const dist of dists) {
    const bin = Math.min(9, Math.floor(dist * 10));
    radial[bin]++;
  }
  const radialNorm = radial.map((c) => c / n);

  // 2. Angular distribution (12 bins, 30° each)
  const angular = new Array(12).fill(0);
  for (const a of angles) {
    const bin = Math.min(11, Math.floor(a / 30));
    angular[bin]++;
  }
  const angularNorm = angular.map((c) => c / n);

  // 3. Grid density (5×5)
  const gridSize = 5;
  const grid = new Array(gridSize * gridSize).fill(0);
  for (let i = 0; i < n; i++) {
    const gx = Math.min(gridSize - 1, Math.max(0, Math.floor((nx[i] + 1) / 2 * gridSize)));
    const gy = Math.min(gridSize - 1, Math.max(0, Math.floor((ny[i] + 1) / 2 * gridSize)));
    grid[gy * gridSize + gx]++;
  }
  const gridNorm = grid.map((c) => c / n);

  // 4. Entropy (Shannon, using grid density as probability distribution)
  let entropy = 0;
  for (const p of gridNorm) {
    if (p > 0) entropy -= p * Math.log2(p);
  }

  // 5. Centroid
  const centroidX = nx.reduce((s, v) => s + v, 0) / n;
  const centroidY = ny.reduce((s, v) => s + v, 0) / n;

  // 6. Spread (std dev of distance from centroid)
  let sumSqDist = 0;
  for (let i = 0; i < n; i++) {
    sumSqDist += (nx[i] - centroidX) ** 2 + (ny[i] - centroidY) ** 2;
  }
  const spread = Math.sqrt(sumSqDist / n);

  // 7. Eccentricity (PCA-like: ratio of spreads along major/minor axes)
  let cov_xx = 0, cov_xy = 0, cov_yy = 0;
  for (let i = 0; i < n; i++) {
    const dx = nx[i] - centroidX;
    const dy = ny[i] - centroidY;
    cov_xx += dx * dx;
    cov_xy += dx * dy;
    cov_yy += dy * dy;
  }
  cov_xx /= n; cov_xy /= n; cov_yy /= n;

  const trace = cov_xx + cov_yy;
  const det = cov_xx * cov_yy - cov_xy * cov_xy;
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const lambda1 = trace / 2 + disc;
  const lambda2 = Math.max(0.0001, trace / 2 - disc);
  const eccentricity = Math.sqrt(lambda1 / lambda2);

  // 8. Edge ratio (fraction in outer 20% ring)
  const edgeCount = dists.filter((d) => d > 0.8).length;
  const edgeRatio = edgeCount / n;

  // 9. DBSCAN cluster features
  let clusterCount = 0;
  let maxClusterSize = 0;
  if (n >= 3) {
    const result = dbscan(defects as DefectRecord[], waferRadius * 0.05, 3);
    const clusterSizes = new Map<number, number>();
    for (const label of result.labels) {
      if (label < 0) continue;
      clusterSizes.set(label, (clusterSizes.get(label) ?? 0) + 1);
    }
    clusterCount = clusterSizes.size;
    maxClusterSize = clusterSizes.size > 0 ? Math.max(...clusterSizes.values()) : 0;
  }

  return {
    radialDistribution: radialNorm,
    angularDistribution: angularNorm,
    gridDensity: gridNorm,
    entropy,
    centroidX,
    centroidY,
    spread,
    eccentricity,
    edgeRatio,
    clusterCount,
    maxClusterSize,
    totalDefects: n,
  };
}

/**
 * Convert WaferFeatures to a flat Float32Array for ONNX inference.
 * Returns a 57-element array.
 */
export function featuresToArray(features: WaferFeatures): Float32Array {
  const arr = new Float32Array(57);
  let idx = 0;

  for (const v of features.radialDistribution) arr[idx++] = v;     // 10
  for (const v of features.angularDistribution) arr[idx++] = v;    // 12
  for (const v of features.gridDensity) arr[idx++] = v;            // 25
  arr[idx++] = features.entropy;                                    // 1
  arr[idx++] = features.centroidX;                                  // 1
  arr[idx++] = features.centroidY;                                  // 1
  arr[idx++] = features.spread;                                     // 1
  arr[idx++] = features.eccentricity;                               // 1
  arr[idx++] = features.edgeRatio;                                  // 1
  arr[idx++] = features.clusterCount;                               // 1
  arr[idx++] = features.maxClusterSize;                             // 1
  arr[idx++] = features.totalDefects;                               // 1
  // Total: 10 + 12 + 25 + 10 = 57

  return arr;
}

export const FEATURE_DIM = 57;
