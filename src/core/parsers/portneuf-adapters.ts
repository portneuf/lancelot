/**
 * Bridges Lancelot's FileFormatAdapter to @portneuf/plugin-system's FormatAdapter<T>.
 *
 * This file creates wrapper adapters that conform to the Portal's
 * FormatAdapter interface while delegating to Lancelot's existing parsers.
 * No existing parser code is modified.
 */

import type { FormatAdapter, FormatDescriptor, ParseResult as PortneufParseResult } from '@portneuf/plugin-system';
import type { FileFormatAdapter } from './parser.interface';
import type { InspectionFile } from '../models/inspection-file';
import { KlarfAdapter } from './klarf';
import { SinfAdapter } from './sinf';

function bridgeAdapter(adapter: FileFormatAdapter): FormatAdapter<InspectionFile> {
  const descriptor: FormatDescriptor = {
    id: adapter.descriptor.id,
    name: adapter.descriptor.name,
    extensions: adapter.descriptor.extensions,
    mimeTypes: adapter.descriptor.mimeTypes ?? [],
    binary: false,
  };

  return {
    descriptor,

    probe(header: string | ArrayBuffer): number {
      if (typeof header !== 'string') return 0;
      return adapter.probe(header);
    },

    parse(input: string | ArrayBuffer, onProgress?): PortneufParseResult<InspectionFile> {
      if (typeof input !== 'string') {
        return { success: false, errors: [{ message: 'Binary input not supported', code: 'BINARY_NOT_SUPPORTED' }] };
      }

      const start = performance.now();
      const result = adapter.parse(input, onProgress ? (p) => {
        onProgress({ loaded: p.fraction, total: 1, stage: p.phase });
      } : undefined);

      const parseTimeMs = performance.now() - start;

      if (result.success) {
        return {
          success: true,
          data: result.data,
          warnings: result.warnings.map((w) => ({ line: w.line, message: w.message })),
          metadata: { parseTimeMs, fileSize: input.length },
        };
      }

      return {
        success: false,
        errors: result.errors.map((e) => ({
          line: e.line,
          column: e.column,
          message: e.message,
          code: e.code,
        })),
        warnings: result.warnings.map((w) => ({ line: w.line, message: w.message })),
      };
    },
  };
}

export const lancelotFormatAdapters: FormatAdapter<InspectionFile>[] = [
  bridgeAdapter(new KlarfAdapter()),
  bridgeAdapter(new SinfAdapter()),
];
