/**
 * SINF file format adapter.
 *
 * SINF (Simplified INF) is a die-level wafer map format containing
 * bin codes per die position. No defect-level data.
 */

import type { FileFormatAdapter, FileFormatDescriptor, ParseResult, ParseProgress } from '../parser.interface';
import { parseSinf } from './sinf-parser';
import { normalizeSinfData } from './sinf-normalizer';

export class SinfAdapter implements FileFormatAdapter {
  readonly descriptor: FileFormatDescriptor = {
    id: 'sinf',
    name: 'SINF (Wafer Map)',
    extensions: ['sinf', 'inf'],
    mimeTypes: ['text/plain'],
  };

  probe(header: string): number {
    const upper = header.toUpperCase();
    // SINF files typically start with DEVICE: or LOT:
    if (upper.includes('DEVICE:') && upper.includes('ROWCT:')) return 0.90;
    if (upper.includes('FNLOC:') && upper.includes('COLCT:')) return 0.85;
    if (upper.includes('BCEQU:')) return 0.70;
    return 0;
  }

  parse(
    text: string,
    onProgress?: (progress: ParseProgress) => void,
  ): ParseResult {
    try {
      onProgress?.({ fraction: 0, phase: 'Parsing SINF' });

      const { data: raw, warnings } = parseSinf(text);

      onProgress?.({ fraction: 0.5, phase: 'Normalizing' });

      if (!raw.lot && !raw.wafer && !raw.device) {
        return {
          success: false,
          errors: [{
            code: 'SINF_MISSING_IDENTITY',
            message: 'SINF file is missing DEVICE, LOT, and WAFER headers.',
            severity: 'error',
          }],
          warnings,
        };
      }

      const file = normalizeSinfData({
        raw,
        fileName: 'unknown.sinf',
        fileSize: text.length,
        warnings,
      });

      onProgress?.({ fraction: 1, phase: 'Done' });

      return { success: true, data: file, warnings };
    } catch (err) {
      return {
        success: false,
        errors: [{
          code: 'SINF_PARSE_ERROR',
          message: `Error parsing SINF: ${err instanceof Error ? err.message : String(err)}`,
          severity: 'error',
        }],
        warnings: [],
      };
    }
  }
}
