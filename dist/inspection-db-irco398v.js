//#region src/core/services/inspection-db.ts
/**
* IndexedDB wrapper for persisting inspection file history.
*
* Database: "lancelot-db", version 1
* Object store: "inspections" with keyPath "id"
*
* Uses the native IndexedDB API with no external libraries.
*/ var DB_NAME = "lancelot-db";
var DB_VERSION = 1;
var STORE_NAME = "inspections";
/**
* Opens (or creates) the IndexedDB database, returning a ready IDBDatabase handle.
*/ async function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}
/**
* Persists an inspection history entry. If an entry with the same id already
* exists it will be overwritten (put semantics).
*/ async function saveInspection(entry) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).put(entry);
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
*/ async function getInspectionHistory() {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
		request.onsuccess = () => {
			db.close();
			const entries = request.result;
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
*/ async function deleteInspection(id) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).delete(id);
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
*/ async function clearHistory() {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).clear();
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
//#endregion
export { saveInspection as i, deleteInspection as n, getInspectionHistory as r, clearHistory as t };

//# sourceMappingURL=inspection-db-irco398v.js.map