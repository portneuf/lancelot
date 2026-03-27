/**
 * KLARF file format adapter.
 *
 * Implements the FileFormatAdapter interface for KLA Results Files.
 * Supports v1.2 (flat keyword/value format). v1.8 support is planned.
 */

import type { FileFormatAdapter, FileFormatDescriptor, ParseResult, ParseProgress } from '../parser.interface';
import { detectKlarfVersion } from './klarf-tokenizer';
import { parseKlarfV12 } from './klarf-v12-parser';
import { normalizeKlarfData } from './klarf-normalizer';

export class KlarfAdapter implements FileFormatAdapter {
  readonly descriptor: FileFormatDescriptor = {
    id: 'klarf',
    name: 'KLARF (KLA Results File)',
    extensions: ['klarf', 'kla', '000', '001', '002', '003'],
    mimeTypes: ['text/plain'],
  };

  /**
   * Probe the file header to determine if this is a KLARF file.
   *
   * Returns 0..1 confidence:
   *  0.95 - starts with "Record FileRecord" (v1.8)
   *  0.90 - starts with "FileVersion" (v1.2)
   *  0.80 - contains "FileVersion" and "LotID"
   *  0.70 - contains "DefectRecordSpec"
   *  0 - no match
   */
  probe(header: string): number {
    const trimmed = header.trimStart();
    if (trimmed.startsWith('Record FileRecord')) return 0.95;
    if (trimmed.startsWith('FileVersion')) return 0.90;
    if (trimmed.includes('FileVersion') && trimmed.includes('LotID')) return 0.80;
    if (trimmed.includes('DefectRecordSpec')) return 0.70;
    return 0;
  }

  /** Optional metadata set before parse(). */
  private _meta: { fileName: string; fileSize: number } = { fileName: 'unknown.klarf', fileSize: 0 };

  /** Set file metadata before calling parse(). */
  withMeta(meta: { fileName: string; fileSize: number }): this {
    this._meta = meta;
    return this;
  }

  /**
   * Parse KLARF file text into an InspectionFile.
   */
  parse(
    text: string,
    onProgress?: (progress: ParseProgress) => void,
  ): ParseResult {
    try {
      const version = detectKlarfVersion(text);

      if (version === '1.8') {
        // v1.8 not yet implemented - return error
        return {
          success: false,
          errors: [{
            code: 'KLARF_V18_NOT_SUPPORTED',
            message: 'KLARF v1.8 hierarchical format is not yet supported. Please use v1.2 files.',
            severity: 'error',
          }],
          warnings: [],
        };
      }

      // Parse v1.2
      const { data: raw, warnings } = parseKlarfV12(text, onProgress);

      // Validate minimum required fields
      if (!raw.lotId && !raw.waferId) {
        return {
          success: false,
          errors: [{
            code: 'KLARF_MISSING_IDENTITY',
            message: 'KLARF file is missing LotID and WaferID. File may be corrupted or incomplete.',
            severity: 'error',
          }],
          warnings,
        };
      }

      // Normalize to domain model
      const inspectionFile = normalizeKlarfData({
        raw,
        fileName: this._meta.fileName,
        fileSize: this._meta.fileSize || text.length,
        warnings,
      });

      return {
        success: true,
        data: inspectionFile,
        warnings,
      };
    } catch (err) {
      return {
        success: false,
        errors: [{
          code: 'KLARF_PARSE_ERROR',
          message: `Unexpected error parsing KLARF file: ${err instanceof Error ? err.message : String(err)}`,
          severity: 'error',
        }],
        warnings: [],
      };
    }
  }
}
