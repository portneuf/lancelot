import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useTranslation } from "./useTranslation-B1_W7B7C.js";
import { t as EmptyState } from "./EmptyState-nf8sPvBQ.js";
import { i as readColorScheme } from "./useWaferMapRenderer-Dcn7o9Dv.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layers } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/features/stacking/useStackingEngine.ts
/**
* Stacking engine hook — computes aggregated heatmap data
* from multiple wafers via the storage adapter.
*/
/**
* Compute stacked wafer map data from multiple files.
* Runs entirely in-memory for immediate results.
*/ function computeStacking(files, aggregation, gridSize) {
	const grid = new Array(gridSize * gridSize).fill(null).map(() => ({
		defects: 0,
		waferHits: /* @__PURE__ */ new Set(),
		classCounts: /* @__PURE__ */ new Map()
	}));
	let waferDiameter = 3e5;
	for (let wi = 0; wi < files.length; wi++) {
		const file = files[wi];
		waferDiameter = file.waferGeometry.waferDiameter;
		const [cx, cy] = file.waferGeometry.sampleCenterLocation;
		for (const d of file.defects) {
			const gx = Math.floor((d.xAbs - cx + waferDiameter / 2) / waferDiameter * gridSize);
			const gy = Math.floor((d.yAbs - cy + waferDiameter / 2) / waferDiameter * gridSize);
			if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) continue;
			const idx = gy * gridSize + gx;
			grid[idx].defects++;
			grid[idx].waferHits.add(wi);
			const cn = d.classNumber ?? 0;
			grid[idx].classCounts.set(cn, (grid[idx].classCounts.get(cn) ?? 0) + 1);
		}
	}
	const cellArea = (waferDiameter / gridSize) ** 2;
	const cells = [];
	let maxValue = 0;
	for (let gy = 0; gy < gridSize; gy++) for (let gx = 0; gx < gridSize; gx++) {
		const g = grid[gy * gridSize + gx];
		if (g.defects === 0) continue;
		let value;
		switch (aggregation) {
			case "density":
				value = g.defects / (cellArea / 1e6);
				break;
			case "hit-count":
				value = g.waferHits.size;
				break;
			case "class-dominance": {
				let maxClass = 0;
				let maxCount = 0;
				for (const [cn, count] of g.classCounts) if (count > maxCount) {
					maxCount = count;
					maxClass = cn;
				}
				value = maxClass;
				break;
			}
		}
		if (value > maxValue) maxValue = value;
		cells.push({
			gridX: gx,
			gridY: gy,
			value
		});
	}
	return {
		cells,
		waferCount: files.length,
		gridSize,
		aggregation,
		maxValue
	};
}
/**
* React hook wrapper for computeStacking with memoization.
*/ function useStackingEngine(files, aggregation, gridSize) {
	return useMemo(() => computeStacking(files, aggregation, gridSize), [
		files,
		aggregation,
		gridSize
	]);
}
//#endregion
//#region src/features/stacking/index.tsx
/**
* Stacking/Overlay View — aggregated heatmap of multiple wafers.
*
* Overlays defect data from selected wafers into a single heatmap.
* Three aggregation modes:
* - Density: defects per area
* - Hit-Count: how many wafers have defects in this zone
* - Class-Dominance: most frequent defect class per zone
*
* Supports cartesian grid (10x10 to 50x50) and wafer selection
* via checkboxes in the sidebar.
*/ var GRID_OPTIONS = [
	10,
	20,
	30,
	50
];
var AGGREGATION_OPTIONS = [
	{
		value: "density",
		labelKey: "stacking.density"
	},
	{
		value: "hit-count",
		labelKey: "stacking.hitCount"
	},
	{
		value: "class-dominance",
		labelKey: "stacking.classDominance"
	}
];
function densityColor(t) {
	if (t < .5) {
		const s = t * 2;
		return `rgb(${Math.round(s * 255)},${Math.round(s * 220)},${Math.round((1 - s) * 200 + 55)})`;
	}
	const s = (t - .5) * 2;
	return `rgb(255,${Math.round((1 - s) * 220)},${Math.round((1 - s) * 50)})`;
}
var CLASS_PALETTE = [
	"#2563eb",
	"#f97316",
	"#22c55e",
	"#ef4444",
	"#a855f7",
	"#06b6d4",
	"#eab308",
	"#ec4899",
	"#6366f1",
	"#14b8a6",
	"#f59e0b",
	"#8b5cf6"
];
function StackingPage() {
	const { t } = useTranslation();
	const files = useFileStore((s) => s.files);
	const [aggregation, setAggregation] = useState("density");
	const [gridSize, setGridSize] = useState(20);
	const [selectedIds, setSelectedIds] = useState(/* @__PURE__ */ new Set());
	const canvasRef = useRef(null);
	const allEntries = useMemo(() => [...files.entries()].map(([id, file]) => ({
		id,
		file
	})), [files]);
	useEffect(() => {
		if (allEntries.length > 0 && selectedIds.size === 0) setSelectedIds(new Set(allEntries.map((e) => e.id)));
	}, [allEntries.length]);
	const selectedFiles = useMemo(() => allEntries.filter((e) => selectedIds.has(e.id)).map((e) => e.file), [allEntries, selectedIds]);
	const result = useStackingEngine(selectedFiles, aggregation, gridSize);
	const toggleWafer = useCallback((id) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || result.cells.length === 0) return;
		const rect = canvas.getBoundingClientRect();
		const size = Math.min(rect.width, rect.height);
		const dpr = window.devicePixelRatio || 1;
		canvas.width = size * dpr;
		canvas.height = size * dpr;
		canvas.style.width = `${size}px`;
		canvas.style.height = `${size}px`;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, size, size);
		const cellSize = size / result.gridSize;
		const colors = readColorScheme();
		const center = size / 2;
		const radius = size * .45;
		ctx.beginPath();
		ctx.arc(center, center, radius, 0, Math.PI * 2);
		ctx.fillStyle = colors.waferBg;
		ctx.fill();
		ctx.strokeStyle = colors.waferEdge;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.save();
		ctx.beginPath();
		ctx.arc(center, center, radius, 0, Math.PI * 2);
		ctx.clip();
		for (const cell of result.cells) {
			const x = cell.gridX * cellSize;
			const y = cell.gridY * cellSize;
			if (aggregation === "class-dominance") {
				ctx.fillStyle = CLASS_PALETTE[cell.value % CLASS_PALETTE.length];
				ctx.globalAlpha = .75;
			} else {
				ctx.fillStyle = densityColor(result.maxValue > 0 ? cell.value / result.maxValue : 0);
				ctx.globalAlpha = .7;
			}
			ctx.fillRect(x, y, cellSize, cellSize);
		}
		ctx.globalAlpha = 1;
		ctx.restore();
		ctx.beginPath();
		ctx.arc(center, center, radius, 0, Math.PI * 2);
		ctx.strokeStyle = colors.waferEdge;
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}, [result, aggregation]);
	if (allEntries.length === 0) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: Layers,
			title: t("common.noData"),
			description: t("stacking.openFilesToView")
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full overflow-hidden",
		children: [/* @__PURE__ */ jsx("div", {
			className: "flex flex-1 items-center justify-center p-4",
			children: selectedFiles.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground",
				children: t("stacking.selectWafers")
			}) : /* @__PURE__ */ jsx("canvas", {
				ref: canvasRef,
				className: "max-h-full max-w-full",
				style: { aspectRatio: "1 / 1" }
			})
		}), /* @__PURE__ */ jsxs("div", {
			className: "flex w-64 flex-col border-l border-border bg-card",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground",
					children: t("stacking.title")
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "border-b border-border px-3 py-3",
					children: [/* @__PURE__ */ jsx("span", {
						className: "mb-2 block text-xs font-medium text-muted-foreground",
						children: t("stacking.aggregation")
					}), /* @__PURE__ */ jsx("div", {
						className: "flex flex-col gap-1",
						children: AGGREGATION_OPTIONS.map((opt) => /* @__PURE__ */ jsx("button", {
							onClick: () => setAggregation(opt.value),
							className: cn("rounded px-2 py-1 text-left text-xs transition-colors", aggregation === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-accent"),
							children: t(opt.labelKey)
						}, opt.value))
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "border-b border-border px-3 py-3",
					children: [/* @__PURE__ */ jsx("span", {
						className: "mb-2 block text-xs font-medium text-muted-foreground",
						children: t("stacking.gridSize")
					}), /* @__PURE__ */ jsx("div", {
						className: "flex gap-1",
						children: GRID_OPTIONS.map((gs) => /* @__PURE__ */ jsx("button", {
							onClick: () => setGridSize(gs),
							className: cn("flex-1 rounded border px-1 py-0.5 text-xs transition-colors", gridSize === gs ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"),
							children: gs
						}, gs))
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col overflow-hidden",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between px-3 py-2",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "text-xs font-medium text-muted-foreground",
							children: [
								t("stacking.wafers"),
								" (",
								selectedIds.size,
								"/",
								allEntries.length,
								")"
							]
						}), /* @__PURE__ */ jsx("button", {
							onClick: () => {
								if (selectedIds.size === allEntries.length) setSelectedIds(/* @__PURE__ */ new Set());
								else setSelectedIds(new Set(allEntries.map((e) => e.id)));
							},
							className: "text-xs text-primary hover:underline",
							children: selectedIds.size === allEntries.length ? t("stacking.deselectAll") : t("stacking.selectAll")
						})]
					}), /* @__PURE__ */ jsx("div", {
						className: "flex-1 overflow-y-auto",
						children: allEntries.map(({ id, file }) => /* @__PURE__ */ jsxs("label", {
							className: "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent",
							children: [
								/* @__PURE__ */ jsx("input", {
									type: "checkbox",
									checked: selectedIds.has(id),
									onChange: () => toggleWafer(id),
									className: "h-3.5 w-3.5 rounded border-border"
								}),
								/* @__PURE__ */ jsx("span", {
									className: "truncate",
									children: file.identity.waferId
								}),
								/* @__PURE__ */ jsx("span", {
									className: "ml-auto text-muted-foreground",
									children: file.defects.length.toLocaleString()
								})
							]
						}, id))
					})]
				}),
				result.cells.length > 0 && /* @__PURE__ */ jsxs("div", {
					className: "border-t border-border px-3 py-2 text-xs text-muted-foreground",
					children: [
						result.waferCount,
						" ",
						t("stacking.wafers").toLowerCase(),
						" · ",
						result.cells.length,
						" ",
						t("stacking.activeCells")
					]
				})
			]
		})]
	});
}
//#endregion
export { StackingPage as default };

//# sourceMappingURL=stacking-DXhF_EBa.js.map