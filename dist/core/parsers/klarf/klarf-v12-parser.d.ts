/**
 * KLARF v1.2 flat-format parser.
 *
 * Parses the semicolon-delimited keyword/value format into RawKlarfData.
 * Each entry is `Keyword value1 value2 ...;`
 *
 * Multi-row sections (DefectList, SummaryList, ClassLookup, etc.) are
 * handled by consuming subsequent entries that are purely numeric or
 * data rows belonging to the list.
 */
import type { ParseProgress } from '../parser.interface';
import type { ParseWarning } from '../../models/inspection-file';
import { type RawKlarfData } from './klarf-types';
export interface V12ParseResult {
    data: RawKlarfData;
    warnings: ParseWarning[];
}
/**
 * Parse KLARF v1.2 text into RawKlarfData.
 */
export declare function parseKlarfV12(text: string, onProgress?: (progress: ParseProgress) => void): V12ParseResult;
