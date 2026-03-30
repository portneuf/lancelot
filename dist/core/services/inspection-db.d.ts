/**
 * IndexedDB wrapper for persisting inspection file history.
 *
 * Database: "lancelot-db", version 1
 * Object store: "inspections" with keyPath "id"
 *
 * Uses the native IndexedDB API with no external libraries.
 */
export interface InspectionHistoryEntry {
    /** Unique identifier (typically fileId used elsewhere). */
    id: string;
    /** Original file name. */
    fileName: string;
    /** Lot identifier from the parsed inspection data. */
    lotId: string;
    /** Wafer identifier from the parsed inspection data. */
    waferId: string;
    /** Device identifier from the parsed inspection data. */
    deviceId: string;
    /** Total number of defects in the file. */
    defectCount: number;
    /** ISO 8601 timestamp of when the file was opened. */
    openedAt: string;
    /** File size in bytes. */
    fileSize: number;
    /** Format identifier (e.g. "klarf"). */
    format: string;
}
/**
 * Opens (or creates) the IndexedDB database, returning a ready IDBDatabase handle.
 */
export declare function openDB(): Promise<IDBDatabase>;
/**
 * Persists an inspection history entry. If an entry with the same id already
 * exists it will be overwritten (put semantics).
 */
export declare function saveInspection(entry: InspectionHistoryEntry): Promise<void>;
/**
 * Returns all stored inspection history entries, sorted by openedAt descending
 * (most recent first).
 */
export declare function getInspectionHistory(): Promise<InspectionHistoryEntry[]>;
/**
 * Deletes a single inspection history entry by id.
 */
export declare function deleteInspection(id: string): Promise<void>;
/**
 * Removes all entries from the inspection history store.
 */
export declare function clearHistory(): Promise<void>;
