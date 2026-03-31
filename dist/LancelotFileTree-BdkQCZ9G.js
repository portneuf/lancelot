import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { n as useFileOpen, t as GeneratorDialog } from "./GeneratorDialog-fgIc2bbn.js";
import { t as useLancelotNavigate } from "./useLancelotNavigate-NPMLiAHE.js";
import { useCallback, useState } from "react";
import { ChevronRight, File, FolderOpen, Hexagon, Upload } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/portal/LancelotFileTree.tsx
/**
* File tree component for Portal Zone A (left panel).
*
* Implements TreePanelProps from @portneuf/portal-framework.
* Displays loaded inspection files as a tree and provides
* file upload via button + drag & drop.
*/ function LancelotFileTree({ width, collapsed, onItemSelect }) {
	const files = useFileStore((s) => s.files);
	const activeFileId = useFileStore((s) => s.activeFileId);
	const switchToFile = useFileStore((s) => s.switchToFile);
	const loadingState = useFileStore((s) => s.loadingState);
	const { openFile, openFilePicker } = useFileOpen();
	const lancelotNavigate = useLancelotNavigate();
	const [dragOver, setDragOver] = useState(false);
	const handleDrop = useCallback((e) => {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) openFile(file);
	}, [openFile]);
	const handleDragOver = useCallback((e) => {
		e.preventDefault();
		setDragOver(true);
	}, []);
	const handleDragLeave = useCallback(() => {
		setDragOver(false);
	}, []);
	const isLoading = loadingState === "reading" || loadingState === "parsing";
	if (collapsed) return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col items-center gap-2 py-3",
		style: { width },
		children: [/* @__PURE__ */ jsx("button", {
			onClick: openFilePicker,
			className: "rounded p-1.5 transition-colors hover:bg-accent",
			title: "Open file",
			children: /* @__PURE__ */ jsx(FolderOpen, { className: "h-4 w-4" })
		}), [...files.entries()].map(([id]) => /* @__PURE__ */ jsx("button", {
			onClick: () => {
				switchToFile(id);
				onItemSelect?.(id);
			},
			className: cn("rounded p-1.5 transition-colors hover:bg-accent", activeFileId === id && "bg-primary/10 text-primary"),
			title: id,
			children: /* @__PURE__ */ jsx(File, { className: "h-4 w-4" })
		}, id))]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: cn("flex h-full flex-col overflow-y-auto text-sm", dragOver && "ring-2 ring-inset ring-primary/50"),
		style: { width },
		onDrop: handleDrop,
		onDragOver: handleDragOver,
		onDragLeave: handleDragLeave,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between border-b border-border px-3 py-2",
				children: [/* @__PURE__ */ jsx("span", {
					className: "text-xs font-semibold uppercase text-muted-foreground",
					children: "Files"
				}), /* @__PURE__ */ jsx("button", {
					onClick: openFilePicker,
					disabled: isLoading,
					className: "rounded p-1 transition-colors hover:bg-accent disabled:opacity-50",
					title: "Open KLARF/SINF file",
					children: /* @__PURE__ */ jsx(FolderOpen, { className: "h-3.5 w-3.5 text-muted-foreground" })
				})]
			}),
			isLoading && /* @__PURE__ */ jsx("div", {
				className: "border-b border-border px-3 py-2 text-xs text-muted-foreground",
				children: loadingState === "reading" ? "Reading file..." : "Parsing..."
			}),
			files.size > 0 ? /* @__PURE__ */ jsx("div", {
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
			}) : !isLoading && /* @__PURE__ */ jsxs("div", {
				className: "flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center text-xs text-muted-foreground",
				children: [
					/* @__PURE__ */ jsx(Upload, { className: "h-6 w-6 opacity-40" }),
					/* @__PURE__ */ jsx("span", { children: "Drop a KLARF/SINF file here or click the open button" }),
					/* @__PURE__ */ jsx(GeneratorDialog, { onGenerated: () => lancelotNavigate("wafer-map") })
				]
			})
		]
	});
}
//#endregion
export { LancelotFileTree as default };

//# sourceMappingURL=LancelotFileTree-BdkQCZ9G.js.map