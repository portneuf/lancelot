import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/portal/StatusBarSlots.tsx
/**
* StatusBar slot components for the Portal's status bar.
*
* These are lightweight components that read from Zustand stores
* and render compact info for the Portal's bottom bar.
*/ function FileInfoSlot() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const loadingState = useFileStore((s) => s.loadingState);
	const file = activeFileId ? files.get(activeFileId) : null;
	if (!file) {
		if (loadingState === "parsing") return /* @__PURE__ */ jsx("span", { children: "Parsing..." });
		if (loadingState === "reading") return /* @__PURE__ */ jsx("span", { children: "Reading..." });
		return /* @__PURE__ */ jsx("span", { children: "No file loaded" });
	}
	return /* @__PURE__ */ jsxs("span", { children: [
		file.source.fileName,
		" | ",
		file.identity.lotId,
		" / ",
		file.identity.waferId
	] });
}
function DefectCountSlot() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
	const file = activeFileId ? files.get(activeFileId) : null;
	if (!file) return null;
	const total = file.defects.length;
	return /* @__PURE__ */ jsxs("span", { children: [
		filteredDefectIds != null ? `${filteredDefectIds.size.toLocaleString()} / ${total.toLocaleString()}` : total.toLocaleString(),
		" ",
		"defects"
	] });
}
//#endregion
export { DefectCountSlot, FileInfoSlot };

//# sourceMappingURL=StatusBarSlots-cLN6H0rc.js.map