/**
 * SINF file parser.
 *
 * SINF format structure:
 *   DEVICE:device_name
 *   LOT:lot_id
 *   WAFER:wafer_id
 *   FNLOC:D          (flat/notch location: U/D/L/R)
 *   ROWCT:25          (number of rows)
 *   COLCT:25          (number of columns)
 *   BCEQU:01 02 03    (good bin codes, space-separated)
 *   REFPX:12          (reference die X)
 *   REFPY:12          (reference die Y)
 *   DUTMS:um          (die units)
 *   XDIES:5000        (die pitch X)
 *   YDIES:5000        (die pitch Y)
 *   (row data: space-separated 2-char bin codes per row)
 *   __ __ 01 02 01 __ __
 *   __ 01 03 01 02 01 __
 *   ...
 */
import type { ParseWarning } from '../../models/inspection-file';
import { type RawSinfData } from './sinf-types';
export interface SinfParseResult {
    data: RawSinfData;
    warnings: ParseWarning[];
}
export declare function parseSinf(text: string): SinfParseResult;
