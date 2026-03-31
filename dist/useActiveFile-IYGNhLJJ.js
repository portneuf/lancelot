import { t as useFileStore } from "./file-store-i2y1zWrt.js";
//#region src/hooks/useActiveFile.ts
/**
* Convenience hook for accessing the active InspectionFile.
*
* Reads from file-store (Zustand). This is the backward-compatible
* path used by all existing views. New adapter-based views can use
* useStorage() + useQuery() directly for DB-backed queries.
*/ function useActiveFile() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const loadingState = useFileStore((s) => s.loadingState);
	return {
		file: activeFileId ? files.get(activeFileId) ?? null : null,
		fileId: activeFileId,
		isLoading: loadingState === "reading" || loadingState === "parsing"
	};
}
//#endregion
export { useActiveFile as t };

//# sourceMappingURL=useActiveFile-IYGNhLJJ.js.map