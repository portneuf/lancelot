/**
 * SINF file format adapter.
 *
 * SINF (Simplified INF) is a die-level wafer map format containing
 * bin codes per die position. No defect-level data.
 */
import type { FileFormatAdapter, FileFormatDescriptor, ParseResult, ParseProgress } from '../parser.interface';
export declare class SinfAdapter implements FileFormatAdapter {
    readonly descriptor: FileFormatDescriptor;
    private _meta;
    withMeta(meta: {
        fileName: string;
        fileSize: number;
    }): this;
    probe(header: string): number;
    parse(text: string, onProgress?: (progress: ParseProgress) => void): ParseResult;
}
