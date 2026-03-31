import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { n as useFileOpen, t as GeneratorDialog } from "./GeneratorDialog-fgIc2bbn.js";
import { t as useLancelotNavigate } from "./useLancelotNavigate-NPMLiAHE.js";
import { t as useTranslation } from "./useTranslation-B1_W7B7C.js";
import { Suspense, lazy, useCallback, useState } from "react";
import { FileWarning, Loader2, Upload } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/features/file-manager/index.tsx
var InspectionHistory = /* @__PURE__ */ lazy(() => import("./InspectionHistory-BMutB0-y.js"));
function FileManagerPage() {
	const { openFile, openFilePicker } = useFileOpen();
	const lancelotNavigate = useLancelotNavigate();
	const { t } = useTranslation();
	const loadingState = useFileStore((s) => s.loadingState);
	const loadingProgress = useFileStore((s) => s.loadingProgress);
	const parseErrors = useFileStore((s) => s.parseErrors);
	const [isDragOver, setIsDragOver] = useState(false);
	const handleDragOver = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	}, []);
	const handleDragLeave = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, []);
	const handleDrop = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) openFile(file);
	}, [openFile]);
	const isLoading = loadingState === "reading" || loadingState === "parsing";
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col items-center justify-center gap-6 p-8",
		children: [
			/* @__PURE__ */ jsx("div", {
				onDragOver: handleDragOver,
				onDragLeave: handleDragLeave,
				onDrop: handleDrop,
				onClick: isLoading ? void 0 : openFilePicker,
				className: cn("flex max-w-lg cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors", isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50", isLoading && "pointer-events-none opacity-60"),
				children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Loader2, { className: "h-12 w-12 animate-spin text-primary" }), /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col gap-1",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "text-lg font-semibold",
						children: loadingState === "reading" ? t("statusBar.readingFile") : t("statusBar.parsing")
					}), loadingState === "parsing" && /* @__PURE__ */ jsx("div", {
						className: "mx-auto mt-2 h-2 w-48 overflow-hidden rounded-full bg-muted",
						children: /* @__PURE__ */ jsx("div", {
							className: "h-full rounded-full bg-primary transition-all duration-300",
							style: { width: `${Math.round(loadingProgress * 100)}%` }
						})
					})]
				})] }) : parseErrors.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(FileWarning, { className: "h-12 w-12 text-destructive" }), /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col gap-1",
					children: [
						/* @__PURE__ */ jsx("h3", {
							className: "text-lg font-semibold text-destructive",
							children: t("file.parseError")
						}),
						parseErrors.map((err, i) => /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted-foreground",
							children: err.message
						}, i)),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 text-sm text-muted-foreground",
							children: "Click to try another file"
						})
					]
				})] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx(Upload, { className: "h-12 w-12 text-muted-foreground/50" }),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-col gap-1",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "text-lg font-semibold",
							children: t("file.openInspection")
						}), /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted-foreground",
							children: t("file.dropOrBrowse")
						})]
					}),
					/* @__PURE__ */ jsx("span", {
						className: "mt-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
						children: t("file.browseFiles")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted-foreground",
						children: "Supported: .klarf, .kla, .000, .001"
					})
				] })
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ jsx("span", { children: t("common.or") }), /* @__PURE__ */ jsx(GeneratorDialog, { onGenerated: () => lancelotNavigate("wafer-map") })]
			}),
			/* @__PURE__ */ jsx(Suspense, {
				fallback: null,
				children: /* @__PURE__ */ jsx(InspectionHistory, {})
			})
		]
	});
}
//#endregion
export { FileManagerPage as default };

//# sourceMappingURL=file-manager-fscVtIsH.js.map