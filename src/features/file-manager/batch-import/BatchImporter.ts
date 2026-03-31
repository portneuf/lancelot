/**
 * Batch importer — parses multiple KLARF/SINF files sequentially.
 *
 * Uses the existing parser registry (main-thread fallback only,
 * since running multiple workers in parallel risks memory spikes).
 * Reports progress per file and collects results.
 */

import { initializeRegistry } from '@/core/parsers';
import type { InspectionFile } from '@/core/models/inspection-file';

export interface BatchFileResult {
  fileName: string;
  success: boolean;
  data?: InspectionFile;
  error?: string;
  durationMs: number;
}

export interface BatchProgress {
  current: number;
  total: number;
  fileName: string;
  phase: 'reading' | 'parsing';
}

export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: BatchFileResult[];
  totalDurationMs: number;
}

/**
 * Import a batch of files. Calls onProgress for each file.
 * Returns after all files are processed (sequential, one at a time).
 */
export async function importBatch(
  files: File[],
  onProgress: (progress: BatchProgress) => void,
): Promise<BatchResult> {
  const registry = initializeRegistry();
  const results: BatchFileResult[] = [];
  const startTime = performance.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileStart = performance.now();

    onProgress({ current: i + 1, total: files.length, fileName: file.name, phase: 'reading' });

    try {
      const text = await file.text();

      onProgress({ current: i + 1, total: files.length, fileName: file.name, phase: 'parsing' });

      const adapter = registry.detect(file.name, text);
      if (!adapter) {
        results.push({
          fileName: file.name,
          success: false,
          error: 'No parser found',
          durationMs: performance.now() - fileStart,
        });
        continue;
      }

      const parseResult = adapter.parse(text);
      if (parseResult.success) {
        results.push({
          fileName: file.name,
          success: true,
          data: parseResult.data,
          durationMs: performance.now() - fileStart,
        });
      } else {
        results.push({
          fileName: file.name,
          success: false,
          error: parseResult.errors[0]?.message ?? 'Parse failed',
          durationMs: performance.now() - fileStart,
        });
      }
    } catch (err) {
      results.push({
        fileName: file.name,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - fileStart,
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: files.length,
    succeeded,
    failed,
    skipped: 0,
    results,
    totalDurationMs: performance.now() - startTime,
  };
}
