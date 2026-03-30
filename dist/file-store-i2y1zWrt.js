import { create } from "zustand";
//#region src/stores/file-store.ts
var useFileStore = create()((set) => ({
	files: /* @__PURE__ */ new Map(),
	activeFileId: null,
	loadingState: "idle",
	loadingProgress: 0,
	parseErrors: [],
	parseWarnings: [],
	recentFiles: [],
	setActiveFile: (id, file) => set((state) => {
		const files = new Map(state.files);
		files.set(id, file);
		return {
			files,
			activeFileId: id,
			loadingState: "complete",
			parseErrors: []
		};
	}),
	closeFile: (id) => set((state) => {
		const files = new Map(state.files);
		files.delete(id);
		return {
			files,
			activeFileId: state.activeFileId === id ? files.keys().next().value ?? null : state.activeFileId
		};
	}),
	switchToFile: (id) => set({ activeFileId: id }),
	setLoadingState: (loadingState) => set({ loadingState }),
	setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
	setParseErrors: (parseErrors) => set({
		parseErrors,
		loadingState: "error"
	}),
	setParseWarnings: (parseWarnings) => set({ parseWarnings }),
	addRecentFile: (entry) => set((state) => ({ recentFiles: [entry, ...state.recentFiles.filter((f) => f.name !== entry.name)].slice(0, 10) })),
	reset: () => set({
		files: /* @__PURE__ */ new Map(),
		activeFileId: null,
		loadingState: "idle",
		loadingProgress: 0,
		parseErrors: [],
		parseWarnings: []
	})
}));
//#endregion
export { useFileStore as t };

//# sourceMappingURL=file-store-i2y1zWrt.js.map