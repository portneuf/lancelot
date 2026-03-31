import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useLancelotNavigate } from "./useLancelotNavigate-NPMLiAHE.js";
import { t as useTranslation } from "./useTranslation-B1_W7B7C.js";
import { t as EmptyState } from "./EmptyState-nf8sPvBQ.js";
import { a as renderWaferMap, i as readColorScheme } from "./useWaferMapRenderer-Dcn7o9Dv.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/features/gallery/useGalleryRenderer.ts
/**
* Gallery thumbnail renderer.
*
* Renders a wafer map thumbnail onto a small canvas using the existing
* renderWaferMap() function with a computed viewport. Caches rendered
* thumbnails as ImageBitmap for instant re-display.
*/ var EMPTY_SELECTION = {
	selectedDefectIds: /* @__PURE__ */ new Set(),
	highlightedDefectId: null,
	hoveredDie: null
};
var thumbnailCache = /* @__PURE__ */ new Map();
function clearThumbnailCache() {
	for (const bmp of thumbnailCache.values()) bmp.close();
	thumbnailCache.clear();
}
/**
* Render a wafer map thumbnail and return an ImageBitmap.
* Results are cached by cacheKey.
*/ async function renderThumbnail(file, size, colorMode, cacheKey) {
	const cached = thumbnailCache.get(cacheKey);
	if (cached) return cached;
	const canvas = new OffscreenCanvas(size, size);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("OffscreenCanvas 2d not supported");
	const geometry = file.waferGeometry;
	const diameter = geometry.waferDiameter;
	const scale = size * .88 / diameter;
	const [scx, scy] = geometry.sampleCenterLocation;
	const viewport = {
		centerX: scx,
		centerY: scy,
		scale,
		canvasWidth: size,
		canvasHeight: size
	};
	const colors = readColorScheme();
	renderWaferMap(ctx, viewport, geometry, file.dieMap, file.defects, colors, EMPTY_SELECTION, null, colorMode);
	const bitmap = await createImageBitmap(canvas);
	thumbnailCache.set(cacheKey, bitmap);
	return bitmap;
}
//#endregion
//#region src/features/gallery/GalleryThumbnail.tsx
/**
* Single wafer map thumbnail for the Gallery grid.
*
* Uses IntersectionObserver for lazy rendering — only renders
* when scrolled into view. Displays wafer ID, defect count,
* and selection state.
*/ function GalleryThumbnail({ file, fileId, size, colorMode, isSelected, onSelect, onClick }) {
	const canvasRef = useRef(null);
	const containerRef = useRef(null);
	const [rendered, setRendered] = useState(false);
	const draw = useCallback(async () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const cacheKey = `${fileId}-${size}-${colorMode}`;
		try {
			const bitmap = await renderThumbnail(file, size, colorMode, cacheKey);
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			canvas.width = size;
			canvas.height = size;
			ctx.drawImage(bitmap, 0, 0);
			setRendered(true);
		} catch {}
	}, [
		file,
		fileId,
		size,
		colorMode
	]);
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) {
				draw();
				observer.disconnect();
			}
		}, { rootMargin: "200px" });
		observer.observe(el);
		return () => observer.disconnect();
	}, [draw]);
	const handleClick = useCallback((e) => {
		if (e.shiftKey) onSelect(fileId, true);
		else onClick(fileId);
	}, [
		fileId,
		onSelect,
		onClick
	]);
	return /* @__PURE__ */ jsxs("div", {
		ref: containerRef,
		className: cn("group relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors cursor-pointer", isSelected ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-accent/50"),
		onClick: handleClick,
		children: [
			/* @__PURE__ */ jsx("canvas", {
				ref: canvasRef,
				width: size,
				height: size,
				className: "rounded",
				style: {
					width: size,
					height: size
				}
			}),
			!rendered && /* @__PURE__ */ jsx("div", {
				className: "absolute inset-2 flex items-center justify-center rounded bg-muted text-xs text-muted-foreground",
				style: {
					bottom: "auto",
					height: size
				},
				children: "Loading..."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex w-full flex-col items-center gap-0.5 text-center",
				children: [/* @__PURE__ */ jsx("span", {
					className: "truncate text-xs font-medium",
					children: file.identity.waferId
				}), /* @__PURE__ */ jsxs("span", {
					className: "text-[10px] text-muted-foreground",
					children: [file.defects.length.toLocaleString(), " defects"]
				})]
			})
		]
	});
}
//#endregion
//#region src/features/gallery/index.tsx
/**
* Gallery View — grid of wafer map thumbnails.
*
* Shows all loaded wafers as miniature wafer maps in a configurable grid.
* Supports sorting, color modes, and multi-selection for stacking.
* Click a thumbnail to navigate to the wafer map view.
* Shift+click to select/deselect for stacking.
*/ function sortFiles(entries, key) {
	return [...entries].sort((a, b) => {
		switch (key) {
			case "waferId": return a.file.identity.waferId.localeCompare(b.file.identity.waferId);
			case "lotId": return a.file.identity.lotId.localeCompare(b.file.identity.lotId);
			case "defectCount": return b.file.defects.length - a.file.defects.length;
			case "fileName": return a.file.source.fileName.localeCompare(b.file.source.fileName);
			case "slot": return (a.file.identity.slot ?? 0) - (b.file.identity.slot ?? 0);
		}
	});
}
var GRID_SIZES = [
	3,
	4,
	5,
	6
];
var THUMB_SIZES = {
	3: 200,
	4: 160,
	5: 130,
	6: 110
};
function GalleryPage() {
	const { t } = useTranslation();
	const files = useFileStore((s) => s.files);
	const switchToFile = useFileStore((s) => s.switchToFile);
	const lancelotNavigate = useLancelotNavigate();
	const [sortKey, setSortKey] = useState("waferId");
	const [gridSize, setGridSize] = useState(4);
	const [colorMode, setColorMode] = useState("uniform");
	const [selectedIds, setSelectedIds] = useState(/* @__PURE__ */ new Set());
	const entries = useMemo(() => [...files.entries()].map(([id, file]) => ({
		id,
		file
	})), [files]);
	const sorted = useMemo(() => sortFiles(entries, sortKey), [entries, sortKey]);
	const handleThumbnailClick = useCallback((fileId) => {
		switchToFile(fileId);
		lancelotNavigate("wafer-map");
	}, [switchToFile, lancelotNavigate]);
	const handleSelect = useCallback((fileId, _shiftKey) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(fileId)) next.delete(fileId);
			else next.add(fileId);
			return next;
		});
	}, []);
	const handleColorModeChange = useCallback((mode) => {
		clearThumbnailCache();
		setColorMode(mode);
	}, []);
	if (entries.length === 0) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: LayoutGrid,
			title: t("common.noData"),
			description: t("gallery.openFilesToView")
		})
	});
	const thumbSize = THUMB_SIZES[gridSize];
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col overflow-hidden",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-center gap-3 border-b border-border px-4 py-2",
			children: [
				/* @__PURE__ */ jsxs("label", {
					className: "flex items-center gap-1.5 text-xs text-muted-foreground",
					children: [
						t("gallery.sortBy"),
						":",
						/* @__PURE__ */ jsxs("select", {
							value: sortKey,
							onChange: (e) => setSortKey(e.target.value),
							className: "rounded border border-border bg-card px-2 py-1 text-xs",
							children: [
								/* @__PURE__ */ jsx("option", {
									value: "waferId",
									children: t("gallery.sortWaferId")
								}),
								/* @__PURE__ */ jsx("option", {
									value: "lotId",
									children: t("gallery.sortLotId")
								}),
								/* @__PURE__ */ jsx("option", {
									value: "defectCount",
									children: t("gallery.sortDefects")
								}),
								/* @__PURE__ */ jsx("option", {
									value: "fileName",
									children: t("gallery.sortFileName")
								}),
								/* @__PURE__ */ jsx("option", {
									value: "slot",
									children: t("gallery.sortSlot")
								})
							]
						})
					]
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "flex items-center gap-1.5 text-xs text-muted-foreground",
					children: [
						t("gallery.colorMode"),
						":",
						/* @__PURE__ */ jsxs("select", {
							value: colorMode,
							onChange: (e) => handleColorModeChange(e.target.value),
							className: "rounded border border-border bg-card px-2 py-1 text-xs",
							children: [
								/* @__PURE__ */ jsx("option", {
									value: "uniform",
									children: t("gallery.colorUniform")
								}),
								/* @__PURE__ */ jsx("option", {
									value: "byClass",
									children: t("gallery.colorByClass")
								}),
								/* @__PURE__ */ jsx("option", {
									value: "bySize",
									children: t("gallery.colorBySize")
								})
							]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-1 text-xs text-muted-foreground",
					children: [
						t("gallery.gridSize"),
						":",
						GRID_SIZES.map((gs) => /* @__PURE__ */ jsxs("button", {
							onClick: () => {
								clearThumbnailCache();
								setGridSize(gs);
							},
							className: cn("rounded border px-2 py-0.5 text-xs transition-colors", gridSize === gs ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"),
							children: [
								gs,
								"×",
								gs
							]
						}, gs))
					]
				}),
				selectedIds.size > 0 && /* @__PURE__ */ jsxs("div", {
					className: "ml-auto flex items-center gap-2 text-xs",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "font-medium text-primary",
						children: [
							selectedIds.size,
							" ",
							t("gallery.selected")
						]
					}), /* @__PURE__ */ jsx("button", {
						onClick: () => setSelectedIds(/* @__PURE__ */ new Set()),
						className: "rounded border border-border px-2 py-0.5 text-xs hover:bg-accent",
						children: t("common.clearSelection")
					})]
				}),
				/* @__PURE__ */ jsxs("span", {
					className: "ml-auto text-xs text-muted-foreground",
					children: [
						entries.length,
						" ",
						entries.length === 1 ? "wafer" : "wafers"
					]
				})
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "flex-1 overflow-y-auto p-4",
			children: /* @__PURE__ */ jsx("div", {
				className: "grid gap-3",
				style: { gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` },
				children: sorted.map(({ id, file }) => /* @__PURE__ */ jsx(GalleryThumbnail, {
					file,
					fileId: id,
					size: thumbSize,
					colorMode,
					isSelected: selectedIds.has(id),
					onSelect: handleSelect,
					onClick: handleThumbnailClick
				}, id))
			})
		})]
	});
}
//#endregion
export { GalleryPage as default };

//# sourceMappingURL=gallery-Dg1WfK2N.js.map