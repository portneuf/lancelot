/**
 * Convenience hook for accessing the active InspectionFile.
 *
 * Reads from file-store (Zustand). This is the backward-compatible
 * path used by all existing views. New adapter-based views can use
 * useStorage() + useQuery() directly for DB-backed queries.
 */
import type { InspectionFile } from '@/core/models/inspection-file';
interface ActiveFileResult {
    file: InspectionFile | null;
    fileId: string | null;
    isLoading: boolean;
}
export declare function useActiveFile(): ActiveFileResult;
export {};
