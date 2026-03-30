/**
 * KLARF normalizer: transforms RawKlarfData into the format-agnostic InspectionFile.
 *
 * Responsibilities:
 *  - Map raw KLARF fields to domain model interfaces
 *  - Build DefectRecord objects with absolute coordinates
 *  - Construct the DieMap from defect data
 *  - Resolve class names from ClassLookup
 */
import type { InspectionFile, ParseWarning } from '../../models/inspection-file';
import type { RawKlarfData } from './klarf-types';
export interface NormalizerInput {
    raw: RawKlarfData;
    fileName: string;
    fileSize: number;
    warnings: ParseWarning[];
}
/**
 * Normalize raw KLARF data into an InspectionFile.
 */
export declare function normalizeKlarfData(input: NormalizerInput): InspectionFile;
