/**
 * Spatial signature types for SSA (Spatial Signature Analysis).
 *
 * A SpatialSignature represents a detected pattern on the wafer,
 * identified by one of the SSA algorithms (DBSCAN, Hough, Annular,
 * Radial, Zonal).
 */

export type SignatureType = 'cluster' | 'scratch' | 'ring' | 'edge-ring' | 'radial' | 'area';

export interface DetectedSignature {
  /** Unique ID for this detection. */
  id: string;
  /** Type of spatial signature. */
  type: SignatureType;
  /** Detection confidence [0, 1]. */
  confidence: number;
  /** Algorithm that produced this detection. */
  algorithm: 'dbscan' | 'hough' | 'annular' | 'radial' | 'zonal';
  /** Defect IDs belonging to this signature. */
  defectIds: number[];
  /** Human-readable label. */
  label: string;
  /** Type-specific parameters for rendering overlays. */
  params: Record<string, unknown>;
}
