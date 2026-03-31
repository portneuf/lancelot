import { t as initializeRegistry } from "./parsers-B1gH2h1h.js";
import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { n as useFileOpen, r as useStorage, t as GeneratorDialog } from "./GeneratorDialog-B489rbUg.js";
import { t as useLancelotNavigate } from "./useLancelotNavigate-NPMLiAHE.js";
import { t as useTranslation } from "./useTranslation-B1_W7B7C.js";
import { Suspense, lazy, useCallback, useState } from "react";
import { AlertTriangle, CheckCircle, FileWarning, FolderSearch, Loader2, Upload, XCircle } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import * as Dialog from "@radix-ui/react-dialog";
//#region src/features/file-manager/batch-import/DirectoryScanner.ts
/**
* Directory scanner for KLARF/SINF files.
*
* Web: uses showDirectoryPicker() (File System Access API)
* with fallback to <input webkitdirectory>.
*/ var EXTENSIONS = new Set([
	".klarf",
	".kla",
	".000",
	".001",
	".002",
	".003",
	".004",
	".005",
	".006",
	".007",
	".008",
	".009",
	".010",
	".sinf",
	".inf"
]);
function hasKnownExtension(name) {
	const dot = name.lastIndexOf(".");
	if (dot < 0) return false;
	return EXTENSIONS.has(name.slice(dot).toLowerCase());
}
/**
* Scan a directory using the File System Access API.
* Recursively collects all files with known extensions.
*/ async function scanViaFSAccess(dirHandle) {
	const files = [];
	async function walk(handle) {
		for await (const entry of handle) if (entry.kind === "file" && hasKnownExtension(entry.name)) files.push(await entry.getFile());
		else if (entry.kind === "directory") await walk(entry);
	}
	await walk(dirHandle);
	return files;
}
/**
* Pick a directory and return all KLARF/SINF files in it.
* Uses showDirectoryPicker() if available, falls back to input[webkitdirectory].
*/ async function pickDirectoryFiles() {
	if ("showDirectoryPicker" in window) try {
		return scanViaFSAccess(await window.showDirectoryPicker());
	} catch (err) {
		if (err.name === "AbortError") return [];
	}
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.setAttribute("webkitdirectory", "");
		input.multiple = true;
		input.onchange = () => {
			resolve(input.files ? [...input.files].filter((f) => hasKnownExtension(f.name)) : []);
		};
		input.addEventListener("cancel", () => resolve([]));
		input.click();
	});
}
//#endregion
//#region src/features/file-manager/batch-import/BatchImporter.ts
/**
* Batch importer — parses multiple KLARF/SINF files sequentially.
*
* Uses the existing parser registry (main-thread fallback only,
* since running multiple workers in parallel risks memory spikes).
* Reports progress per file and collects results.
*/
/**
* Import a batch of files. Calls onProgress for each file.
* Returns after all files are processed (sequential, one at a time).
*/ async function importBatch(files, onProgress) {
	const registry = initializeRegistry();
	const results = [];
	const startTime = performance.now();
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const fileStart = performance.now();
		onProgress({
			current: i + 1,
			total: files.length,
			fileName: file.name,
			phase: "reading"
		});
		try {
			const text = await file.text();
			onProgress({
				current: i + 1,
				total: files.length,
				fileName: file.name,
				phase: "parsing"
			});
			const adapter = registry.detect(file.name, text);
			if (!adapter) {
				results.push({
					fileName: file.name,
					success: false,
					error: "No parser found",
					durationMs: performance.now() - fileStart
				});
				continue;
			}
			const parseResult = adapter.parse(text);
			if (parseResult.success) results.push({
				fileName: file.name,
				success: true,
				data: parseResult.data,
				durationMs: performance.now() - fileStart
			});
			else results.push({
				fileName: file.name,
				success: false,
				error: parseResult.errors[0]?.message ?? "Parse failed",
				durationMs: performance.now() - fileStart
			});
		} catch (err) {
			results.push({
				fileName: file.name,
				success: false,
				error: err instanceof Error ? err.message : String(err),
				durationMs: performance.now() - fileStart
			});
		}
	}
	const succeeded = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;
	return {
		total: files.length,
		succeeded,
		failed,
		skipped: 0,
		results,
		totalDurationMs: performance.now() - startTime
	};
}
//#endregion
//#region src/features/file-manager/batch-import/ImportProgressDialog.tsx
/**
* Batch import dialog — directory picker + progress + result report.
*
* Flow:
* 1. User clicks "Batch Import" → directory picker opens
* 2. Files are scanned and listed
* 3. Sequential parsing with progress bar
* 4. Result report: succeeded/failed/total + error details
*/ function ImportProgressDialog() {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [phase, setPhase] = useState("idle");
	const [progress, setProgress] = useState(null);
	const [result, setResult] = useState(null);
	const setActiveFile = useFileStore((s) => s.setActiveFile);
	const addRecentFile = useFileStore((s) => s.addRecentFile);
	const storage = useStorage();
	const handleStart = useCallback(async () => {
		setPhase("scanning");
		setProgress(null);
		setResult(null);
		const files = await pickDirectoryFiles();
		if (files.length === 0) {
			setPhase("idle");
			return;
		}
		setPhase("importing");
		const batchResult = await importBatch(files, (p) => {
			setProgress({ ...p });
		});
		let lastFileId = null;
		for (const r of batchResult.results) if (r.success && r.data) {
			const fileId = `${r.fileName}-${Date.now()}`;
			setActiveFile(fileId, r.data);
			addRecentFile({
				name: r.fileName,
				format: r.data.source.formatId,
				openedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			storage.importFile(r.data).catch(() => {});
			lastFileId = fileId;
		}
		if (lastFileId) {}
		setResult(batchResult);
		setPhase("done");
	}, [
		setActiveFile,
		addRecentFile,
		storage
	]);
	const handleClose = useCallback(() => {
		if (phase === "importing") return;
		setOpen(false);
		setPhase("idle");
		setProgress(null);
		setResult(null);
	}, [phase]);
	return /* @__PURE__ */ jsxs(Dialog.Root, {
		open,
		onOpenChange: (v) => v ? setOpen(true) : handleClose(),
		children: [/* @__PURE__ */ jsx(Dialog.Trigger, {
			asChild: true,
			children: /* @__PURE__ */ jsxs("button", {
				className: "flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground",
				children: [/* @__PURE__ */ jsx(FolderSearch, { className: "h-4 w-4" }), t("batch.importDirectory")]
			})
		}), /* @__PURE__ */ jsxs(Dialog.Portal, { children: [/* @__PURE__ */ jsx(Dialog.Overlay, { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" }), /* @__PURE__ */ jsxs(Dialog.Content, {
			className: "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl",
			children: [
				/* @__PURE__ */ jsx(Dialog.Title, {
					className: "text-lg font-semibold",
					children: t("batch.title")
				}),
				phase === "idle" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Dialog.Description, {
					className: "mt-1 text-sm text-muted-foreground",
					children: t("batch.description")
				}), /* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex justify-end gap-2",
					children: [/* @__PURE__ */ jsx(Dialog.Close, {
						asChild: true,
						children: /* @__PURE__ */ jsx("button", {
							className: "rounded-md border border-border px-4 py-2 text-sm hover:bg-muted",
							children: t("common.cancel")
						})
					}), /* @__PURE__ */ jsxs("button", {
						onClick: handleStart,
						className: "flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
						children: [/* @__PURE__ */ jsx(FolderSearch, { className: "h-4 w-4" }), t("batch.selectDirectory")]
					})]
				})] }),
				phase === "scanning" && /* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-col items-center gap-3 py-4",
					children: [/* @__PURE__ */ jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }), /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted-foreground",
						children: t("batch.scanning")
					})]
				}),
				phase === "importing" && progress && /* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-col gap-4",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin text-primary" }), /* @__PURE__ */ jsxs("span", {
								className: "text-sm font-medium",
								children: [
									progress.current,
									" / ",
									progress.total
								]
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "h-2 overflow-hidden rounded-full bg-muted",
							children: /* @__PURE__ */ jsx("div", {
								className: "h-full rounded-full bg-primary transition-all duration-200",
								style: { width: `${progress.current / progress.total * 100}%` }
							})
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "truncate text-xs text-muted-foreground",
							children: [
								progress.phase === "reading" ? t("batch.reading") : t("batch.parsing"),
								": ",
								progress.fileName
							]
						})
					]
				}),
				phase === "done" && result && /* @__PURE__ */ jsxs("div", {
					className: "mt-4 flex flex-col gap-4",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-4 rounded-lg border border-border p-3",
							children: [result.failed === 0 ? /* @__PURE__ */ jsx(CheckCircle, { className: "h-8 w-8 text-green-500" }) : result.succeeded === 0 ? /* @__PURE__ */ jsx(XCircle, { className: "h-8 w-8 text-destructive" }) : /* @__PURE__ */ jsx(AlertTriangle, { className: "h-8 w-8 text-yellow-500" }), /* @__PURE__ */ jsxs("div", {
								className: "flex flex-col",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "text-sm font-medium",
									children: [
										result.succeeded,
										" ",
										t("batch.succeeded"),
										", ",
										result.failed,
										" ",
										t("batch.failed")
									]
								}), /* @__PURE__ */ jsxs("span", {
									className: "text-xs text-muted-foreground",
									children: [
										(result.totalDurationMs / 1e3).toFixed(1),
										"s ",
										t("batch.total")
									]
								})]
							})]
						}),
						result.failed > 0 && /* @__PURE__ */ jsx("div", {
							className: "max-h-40 overflow-y-auto rounded border border-border",
							children: result.results.filter((r) => !r.success).map((r, i) => /* @__PURE__ */ jsxs("div", {
								className: "flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0",
								children: [/* @__PURE__ */ jsx(XCircle, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" }), /* @__PURE__ */ jsxs("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ jsx("p", {
										className: "truncate text-xs font-medium",
										children: r.fileName
									}), /* @__PURE__ */ jsx("p", {
										className: "text-xs text-muted-foreground",
										children: r.error
									})]
								})]
							}, i))
						}),
						/* @__PURE__ */ jsx("div", {
							className: "flex justify-end",
							children: /* @__PURE__ */ jsx("button", {
								onClick: handleClose,
								className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
								children: t("common.close")
							})
						})
					]
				})
			]
		})] })]
	});
}
//#endregion
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
				className: "flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground",
				children: [
					/* @__PURE__ */ jsx("span", { children: t("common.or") }),
					/* @__PURE__ */ jsx(GeneratorDialog, { onGenerated: () => lancelotNavigate("wafer-map") }),
					/* @__PURE__ */ jsx(ImportProgressDialog, {})
				]
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

//# sourceMappingURL=file-manager-C13O97_B.js.map