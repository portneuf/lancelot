/**
 * Batch importer — parses multiple KLARF/SINF files sequentially.
 *
 * Uses the existing parser registry (main-thread fallback only,
 * since running multiple workers in parallel risks memory spikes).
 * Reports progress per file and collects results.
 */
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
export declare function importBatch(files: File[], onProgress: (progress: BatchProgress) => void): Promise<BatchResult>;
