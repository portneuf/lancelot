/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 *
 * Groups spatially proximate defects into clusters based on neighborhood
 * density. Points that don't belong to any dense region are labelled noise (-1).
 */

import type { DefectRecord } from '@/core/models/defect';

export interface ClusterResult {
  /** Cluster label per defect (-1 = noise). */
  labels: number[];
  /** Total number of clusters found (excluding noise). */
  clusterCount: number;
  /** Map from clusterId to array of defect indices within that cluster. */
  clusters: Map<number, number[]>;
}

/**
 * Compute Euclidean distance between two defects using their absolute positions.
 */
function distance(a: DefectRecord, b: DefectRecord): number {
  const dx = a.xAbs - b.xAbs;
  const dy = a.yAbs - b.yAbs;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find all neighbor indices within `epsilon` of defect at `pointIdx`.
 * Simple O(n) scan per query — acceptable for typical wafer defect counts.
 */
function regionQuery(
  defects: DefectRecord[],
  pointIdx: number,
  epsilon: number,
): number[] {
  const neighbors: number[] = [];
  const point = defects[pointIdx];
  for (let i = 0; i < defects.length; i++) {
    if (distance(point, defects[i]) <= epsilon) {
      neighbors.push(i);
    }
  }
  return neighbors;
}

/**
 * DBSCAN: density-based spatial clustering of defect positions.
 *
 * @param defects  Array of defect records with xAbs/yAbs coordinates.
 * @param epsilon  Neighborhood radius in micrometers (default 5000).
 * @param minPoints  Minimum points to form a dense region (default 3).
 * @returns ClusterResult with labels, cluster count, and cluster membership map.
 */
export function dbscan(
  defects: DefectRecord[],
  epsilon: number = 5000,
  minPoints: number = 3,
): ClusterResult {
  const n = defects.length;
  const labels = new Array<number>(n).fill(-1); // -1 = unvisited / noise
  const visited = new Uint8Array(n); // 0 = not visited
  let currentCluster = -1;

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = 1;

    const neighbors = regionQuery(defects, i, epsilon);

    if (neighbors.length < minPoints) {
      // Mark as noise (remains -1)
      continue;
    }

    // Start a new cluster
    currentCluster++;
    labels[i] = currentCluster;

    // Expand cluster using a seed queue
    const queue = [...neighbors];
    let qIdx = 0;

    while (qIdx < queue.length) {
      const j = queue[qIdx++];

      if (!visited[j]) {
        visited[j] = 1;
        const jNeighbors = regionQuery(defects, j, epsilon);
        if (jNeighbors.length >= minPoints) {
          // Density-reachable — add new neighbors to queue
          for (const k of jNeighbors) {
            if (!visited[k]) {
              queue.push(k);
            }
          }
        }
      }

      // Assign to cluster if not yet assigned
      if (labels[j] === -1) {
        labels[j] = currentCluster;
      }
    }
  }

  // Build cluster membership map
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (labels[i] === -1) continue;
    const existing = clusters.get(labels[i]);
    if (existing) {
      existing.push(i);
    } else {
      clusters.set(labels[i], [i]);
    }
  }

  return {
    labels,
    clusterCount: currentCluster + 1,
    clusters,
  };
}
