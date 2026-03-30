import { create } from "zustand";
//#region src/stores/inspection-store.ts
var initialFilters = {
	classNumbers: /* @__PURE__ */ new Set(),
	sizeRange: [null, null],
	numericRanges: {},
	selectedDies: /* @__PURE__ */ new Set(),
	searchText: "",
	testNumbers: /* @__PURE__ */ new Set()
};
var useInspectionStore = create()((set) => ({
	activeWaferIndex: 0,
	selectedDefectIds: /* @__PURE__ */ new Set(),
	highlightedDefectId: null,
	hoveredDie: null,
	filters: { ...initialFilters },
	filteredDefectIds: null,
	setActiveWafer: (index) => set({ activeWaferIndex: index }),
	selectDefects: (ids) => set({ selectedDefectIds: new Set(ids) }),
	highlightDefect: (id) => set({ highlightedDefectId: id }),
	setHoveredDie: (die) => set({ hoveredDie: die }),
	updateFilters: (patch) => set((state) => ({ filters: {
		...state.filters,
		...patch
	} })),
	clearFilters: () => set({ filters: { ...initialFilters } }),
	resetSelection: () => set({
		selectedDefectIds: /* @__PURE__ */ new Set(),
		highlightedDefectId: null,
		hoveredDie: null
	}),
	setFilteredDefectIds: (ids) => set({ filteredDefectIds: ids })
}));
//#endregion
export { useInspectionStore as t };

//# sourceMappingURL=inspection-store-B-pANMzv.js.map