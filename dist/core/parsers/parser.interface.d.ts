/**
 * Parser interfaces for semiconductor inspection file formats.
 *
 * FileFormatAdapter is the primary abstraction: each supported file format
 * (e.g. KLA KLARF, Synopsys SINF) implements this interface. The adapter
 * can probe a file header to determine compatibility and parse the full
 * text into an InspectionFile.
 *
 * ParseResult is a discriminated union -- callers must check `success`
 * before accessing `data` or `errors`.
 */
import type { InspectionFile, ParseWarning } from '../models/inspection-file';
export interface ParseProgress {
    /** Fraction complete, from 0.0 to 1.0. */
    fraction: number;
    /** Human-readable phase description (e.g. "Reading defects", "Building die map"). */
    phase: string;
    /** Optional count of items processed so far. */
    itemCount?: number;
}
export interface ParseError {
    /** Machine-readable error code (e.g. "INVALID_HEADER", "UNEXPECTED_EOF"). */
    code: string;
    /** Human-readable error description. */
    message: string;
    /** Source file line number where the error occurred, if applicable. */
    line?: number;
    /** Source file column number where the error occurred, if applicable. */
    column?: number;
    /** Severity is always 'error' for fatal parsing issues. */
    severity: 'error';
}
/** Discriminated union for parse outcomes. */
export type ParseResult = {
    success: true;
    data: InspectionFile;
    warnings: ParseWarning[];
} | {
    success: false;
    errors: ParseError[];
    warnings: ParseWarning[];
};
export interface FileFormatDescriptor {
    /** Unique identifier for this format (e.g. "klarf", "sinf"). */
    id: string;
    /** Human-readable format name. */
    name: string;
    /** File extensions associated with this format (without dots, e.g. ["klarf", "000"]). */
    extensions: string[];
    /** Optional MIME types for this format. */
    mimeTypes?: string[];
}
/**
 * Adapter interface that each file format parser must implement.
 *
 * Lifecycle:
 *  1. Registry calls `probe(header)` with the first ~4 KB of file content.
 *  2. The adapter returns a confidence score (0 = no match, 1 = certain).
 *  3. If selected, `parse(text, onProgress?)` is called with the full file text.
 */
export interface FileFormatAdapter {
    /** Describes the file format this adapter handles. */
    readonly descriptor: FileFormatDescriptor;
    /**
     * Examine the beginning of a file and return a confidence score.
     *
     * @param header - The first ~4 KB of the file content.
     * @returns A number between 0 (no match) and 1 (certain match).
     */
    probe(header: string): number;
    /**
     * Parse the full file text into an InspectionFile.
     *
     * @param text - The complete file content as a string.
     * @param onProgress - Optional callback invoked to report parse progress.
     * @returns A ParseResult indicating success with data, or failure with errors.
     */
    parse(text: string, onProgress?: (progress: ParseProgress) => void): ParseResult;
}
