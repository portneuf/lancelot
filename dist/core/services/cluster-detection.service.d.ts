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
 * DBSCAN: density-based spatial clustering of defect positions.
 *
 * @param defects  Array of defect records with xAbs/yAbs coordinates.
 * @param epsilon  Neighborhood radius in micrometers (default 5000).
 * @param minPoints  Minimum points to form a dense region (default 3).
 * @returns ClusterResult with labels, cluster count, and cluster membership map.
 */
export declare function dbscan(defects: DefectRecord[], epsilon?: number, minPoints?: number): ClusterResult;
