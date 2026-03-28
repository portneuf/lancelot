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

const DB_NAME = 'lancelot-db';
const DB_VERSION = 1;
const STORE_NAME = 'inspections';

/**
 * Opens (or creates) the IndexedDB database, returning a ready IDBDatabase handle.
 */
export async function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists an inspection history entry. If an entry with the same id already
 * exists it will be overwritten (put semantics).
 */
export async function saveInspection(entry: InspectionHistoryEntry): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(entry);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Returns all stored inspection history entries, sorted by openedAt descending
 * (most recent first).
 */
export async function getInspectionHistory(): Promise<InspectionHistoryEntry[]> {
  const db = await openDB();
  return new Promise<InspectionHistoryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      const entries = request.result as InspectionHistoryEntry[];
      entries.sort((a, b) => b.openedAt.localeCompare(a.openedAt));
      resolve(entries);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Deletes a single inspection history entry by id.
 */
export async function deleteInspection(id: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Removes all entries from the inspection history store.
 */
export async function clearHistory(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
