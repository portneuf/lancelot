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
 * Detect linear defect patterns (scratches) using RANSAC.
 *
 * @param defects  Array of defect records with xAbs/yAbs coordinates.
 * @param minInliers  Minimum defects on a line to count as a scratch (default 5).
 * @param distanceThreshold  Max perpendicular distance from line in um (default 2000).
 * @param iterations  Number of RANSAC iterations (default 200).
 * @returns Array of detected ScratchLine objects sorted by inlier count descending.
 */
export declare function detectScratches(defects: DefectRecord[], minInliers?: number, distanceThreshold?: number, iterations?: number): ScratchLine[];
