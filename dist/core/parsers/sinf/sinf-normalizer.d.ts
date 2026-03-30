/**
 * SINF normalizer: transforms RawSinfData into InspectionFile.
 *
 * SINF is a die-level format (no individual defects), so:
 * - defects[] is empty
 * - dieMap[] contains the bin status of each die
 * - waferGeometry is derived from die pitch and grid size
 */
import type { InspectionFile, ParseWarning } from '../../models/inspection-file';
import type { RawSinfData } from './sinf-types';
export interface SinfNormalizerInput {
    raw: RawSinfData;
    fileName: string;
    fileSize: number;
    warnings: ParseWarning[];
}
export declare function normalizeSinfData(input: SinfNormalizerInput): InspectionFile;
