/**
 * KLARF v1.8 hierarchical parser.
 *
 * Parses the Record/Field/List format with brace-delimited nesting:
 *
 *   Record FileRecord {
 *     Field FileVersion "1.8";
 *     Record LotRecord {
 *       Field LotID "LOT001";
 *       Record WaferRecord {
 *         Field WaferID "W01";
 *         List DefectList {
 *           Columns { DEFECTID XREL YREL XINDEX YINDEX }
 *           Data {
 *             1 1523 2210 0 0
 *             2 9832 4500 1 0
 *           }
 *         }
 *       }
 *     }
 *   }
 */
import type { ParseProgress } from '../parser.interface';
import type { ParseWarning } from '../../models/inspection-file';
import { type RawKlarfData } from './klarf-types';
export interface V18ParseResult {
    data: RawKlarfData;
    warnings: ParseWarning[];
}
/**
 * Parse KLARF v1.8 text into RawKlarfData.
 */
export declare function parseKlarfV18(text: string, onProgress?: (progress: ParseProgress) => void): V18ParseResult;
