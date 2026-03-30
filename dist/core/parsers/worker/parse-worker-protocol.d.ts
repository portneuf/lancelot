/**
 * Message protocol between the main thread and the parse Web Worker.
 */
import type { ParseProgress, ParseResult } from '../parser.interface';
/** Messages sent FROM main thread TO worker. */
export type WorkerRequest = {
    type: 'parse';
    text: string;
    fileName: string;
    fileSize: number;
    formatId?: string;
};
/** Messages sent FROM worker TO main thread. */
export type WorkerResponse = {
    type: 'progress';
    progress: ParseProgress;
} | {
    type: 'complete';
    result: ParseResult;
} | {
    type: 'error';
    message: string;
};
