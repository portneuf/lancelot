/**
 * KLARF file format adapter.
 *
 * Implements the FileFormatAdapter interface for KLA Results Files.
 * Supports both v1.2 (flat keyword/value) and v1.8 (hierarchical Record/Field/List).
 */
import type { FileFormatAdapter, FileFormatDescriptor, ParseResult, ParseProgress } from '../parser.interface';
export declare class KlarfAdapter implements FileFormatAdapter {
    readonly descriptor: FileFormatDescriptor;
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
    probe(header: string): number;
    /** Optional metadata set before parse(). */
    private _meta;
    /** Set file metadata before calling parse(). */
    withMeta(meta: {
        fileName: string;
        fileSize: number;
    }): this;
    /**
     * Parse KLARF file text into an InspectionFile.
     */
    parse(text: string, onProgress?: (progress: ParseProgress) => void): ParseResult;
}
