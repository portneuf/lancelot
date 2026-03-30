import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { useEffect, useMemo } from "react";
//#region src/features/inspection/utils/read-field.ts
/**
* Read a field value from a DefectRecord by key.
* Checks core properties first, then falls back to the `extra` map.
*/ function readField(defect, key) {
	if (key in defect) return defect[key];
	return defect.extra[key];
}
//#endregion
//#region src/hooks/useFilteredDefects.ts
/**
* Global hook that computes filtered defects from the active file
* based on the current filter criteria in inspection-store.
*
* Used by all views (DefectTable, WaferMap, Analysis charts) to ensure
* consistent filtering across the entire application.
*/ function useFilteredDefects() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const filters = useInspectionStore((s) => s.filters);
	const setFilteredDefectIds = useInspectionStore((s) => s.setFilteredDefectIds);
	const file = activeFileId ? files.get(activeFileId) : void 0;
	const allDefects = file?.defects ?? [];
	const filteredDefects = useMemo(() => {
		let defects = allDefects;
		if (filters.classNumbers.size > 0) defects = defects.filter((d) => d.classNumber != null && filters.classNumbers.has(d.classNumber));
		for (const [key, range] of Object.entries(filters.numericRanges)) {
			const [min, max] = range;
			if (min == null && max == null) continue;
			defects = defects.filter((d) => {
				const val = readField(d, key);
				if (typeof val !== "number") return true;
				if (min != null && val < min) return false;
				if (max != null && val > max) return false;
				return true;
			});
		}
		if (filters.searchText) {
			const q = filters.searchText.toLowerCase();
			defects = defects.filter((d) => String(d.defectId).includes(q) || String(d.classNumber).includes(q) || (d.extra["_className"] ?? "").toString().toLowerCase().includes(q));
		}
		return defects;
	}, [allDefects, filters]);
	const totalCount = allDefects.length;
	const filteredCount = filteredDefects.length;
	const isFiltered = filteredCount < totalCount;
	useEffect(() => {
		if (isFiltered && filteredCount > 0) setFilteredDefectIds(new Set(filteredDefects.map((d) => d.defectId)));
		else setFilteredDefectIds(null);
	}, [
		filteredDefects,
		isFiltered,
		filteredCount,
		setFilteredDefectIds
	]);
	return {
		file,
		filteredDefects,
		totalCount,
		filteredCount,
		isFiltered
	};
}
//#endregion
export { readField as n, useFilteredDefects as t };

//# sourceMappingURL=useFilteredDefects-BmOCESYD.js.map