import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { ChevronRight, File, Hexagon } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/portal/LancelotFileTree.tsx
/**
* File tree component for Portal Zone A (left panel).
*
* Implements TreePanelProps from @portneuf/portal-framework.
* Displays loaded inspection files as a tree: Lot → Wafer → summary.
*/ function LancelotFileTree({ width, collapsed, onItemSelect }) {
	const files = useFileStore((s) => s.files);
	const activeFileId = useFileStore((s) => s.activeFileId);
	const switchToFile = useFileStore((s) => s.switchToFile);
	if (collapsed) return /* @__PURE__ */ jsx("div", {
		className: "flex flex-col items-center gap-2 py-3",
		style: { width },
		children: [...files.entries()].map(([id]) => /* @__PURE__ */ jsx("button", {
			onClick: () => {
				switchToFile(id);
				onItemSelect?.(id);
			},
			className: cn("rounded p-1.5 transition-colors hover:bg-accent", activeFileId === id && "bg-primary/10 text-primary"),
			title: id,
			children: /* @__PURE__ */ jsx(File, { className: "h-4 w-4" })
		}, id))
	});
	if (files.size === 0) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center p-4 text-sm text-muted-foreground",
		style: { width },
		children: "No files loaded"
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col overflow-y-auto text-sm",
		style: { width },
		children: [/* @__PURE__ */ jsx("div", {
			className: "border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground",
			children: "Files"
		}), /* @__PURE__ */ jsx("div", {
			className: "flex flex-col py-1",
			children: [...files.entries()].map(([id, file]) => {
				const isActive = activeFileId === id;
				return /* @__PURE__ */ jsxs("button", {
					onClick: () => {
						switchToFile(id);
						onItemSelect?.(id);
					},
					className: cn("flex flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-accent", isActive && "bg-primary/10"),
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(ChevronRight, { className: cn("h-3 w-3 text-muted-foreground", isActive && "text-primary") }), /* @__PURE__ */ jsx("span", {
								className: cn("truncate font-medium", isActive && "text-primary"),
								children: file.source.fileName
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "ml-5 flex items-center gap-2 text-xs text-muted-foreground",
							children: [/* @__PURE__ */ jsx(Hexagon, { className: "h-3 w-3" }), /* @__PURE__ */ jsxs("span", { children: [
								file.identity.lotId,
								" / ",
								file.identity.waferId
							] })]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "ml-5 text-xs text-muted-foreground",
							children: [file.defects.length.toLocaleString(), " defects"]
						})
					]
				}, id);
			})
		})]
	});
}
//#endregion
export { LancelotFileTree as default };

//# sourceMappingURL=LancelotFileTree-XGngFF8C.js.map