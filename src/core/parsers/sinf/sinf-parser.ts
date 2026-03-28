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
import { type RawSinfData, createEmptyRawSinfData } from './sinf-types';

export interface SinfParseResult {
  data: RawSinfData;
  warnings: ParseWarning[];
}

export function parseSinf(text: string): SinfParseResult {
  const data = createEmptyRawSinfData();
  const warnings: ParseWarning[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let headerDone = false;
  let rowIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Header lines contain ':'
    if (!headerDone && line.includes(':')) {
      const colonIdx = line.indexOf(':');
      const key = line.slice(0, colonIdx).trim().toUpperCase();
      const value = line.slice(colonIdx + 1).trim();

      switch (key) {
        case 'DEVICE': data.device = value; break;
        case 'LOT': data.lot = value; break;
        case 'WAFER': data.wafer = value; break;
        case 'FNLOC': data.fnloc = value.toUpperCase(); break;
        case 'ROWCT': data.rowct = parseInt(value, 10) || 0; break;
        case 'COLCT': data.colct = parseInt(value, 10) || 0; break;
        case 'BCEQU': data.bcequ = value.split(/\s+/).filter(Boolean); break;
        case 'REFPX': data.refpx = parseInt(value, 10) || 0; break;
        case 'REFPY': data.refpy = parseInt(value, 10) || 0; break;
        case 'DUTMS': data.dutms = value; break;
        case 'XDIES': data.xdies = parseFloat(value) || 0; break;
        case 'YDIES': data.ydies = parseFloat(value) || 0; break;
        default:
          warnings.push({
            code: 'SINF_UNKNOWN_HEADER',
            message: `Unknown SINF header: ${key}`,
            line: i + 1,
            severity: 'warning',
          });
      }
      continue;
    }

    // Row data: space-separated 2-char codes
    headerDone = true;
    const cells = line.split(/\s+/).filter(Boolean);
    if (cells.length > 0) {
      data.rows.push(cells);
      rowIndex++;
    }
  }

  // Validate
  if (data.rowct === 0 && data.rows.length > 0) {
    data.rowct = data.rows.length;
  }
  if (data.colct === 0 && data.rows.length > 0) {
    data.colct = Math.max(...data.rows.map((r) => r.length));
  }

  return { data, warnings };
}
