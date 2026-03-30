import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { n as readField, t as useFilteredDefects } from "./useFilteredDefects-BmOCESYD.js";
import { t as useTranslation } from "./useTranslation-810_9bMT.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
import * as Slider from "@radix-ui/react-slider";
//#region src/components/shared/RangeSlider.tsx
var defaultFormat = (n) => {
	if (Number.isInteger(n)) return n.toLocaleString();
	return n.toFixed(1);
};
function RangeSlider({ label, min, max, step, value, onChange, formatValue = defaultFormat, histogramData, unit, className }) {
	const effectiveStep = step ?? (max - min > 100 ? 1 : (max - min) / 100);
	const isFullRange = value[0] <= min && value[1] >= max;
	const histogramBars = useMemo(() => {
		if (!histogramData || histogramData.length === 0) return null;
		const maxCount = Math.max(...histogramData);
		if (maxCount === 0) return null;
		return histogramData.map((count, i) => {
			return /* @__PURE__ */ jsx("div", {
				className: "flex-1",
				style: { height: `${count / maxCount * 100}%` },
				children: /* @__PURE__ */ jsx("div", { className: "h-full w-full rounded-sm bg-muted-foreground/15" })
			}, i);
		});
	}, [histogramData]);
	return /* @__PURE__ */ jsxs("div", {
		className: cn("flex flex-col gap-1.5", className),
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-baseline justify-between",
			children: [/* @__PURE__ */ jsx("span", {
				className: "text-xs font-medium text-muted-foreground",
				children: label
			}), /* @__PURE__ */ jsxs("span", {
				className: cn("text-xs tabular-nums", isFullRange ? "text-muted-foreground/50" : "text-foreground font-medium"),
				children: [
					formatValue(value[0]),
					unit ? ` ${unit}` : "",
					" — ",
					formatValue(value[1]),
					unit ? ` ${unit}` : ""
				]
			})]
		}), /* @__PURE__ */ jsxs("div", {
			className: "relative",
			children: [histogramBars && /* @__PURE__ */ jsx("div", {
				className: "pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-end gap-px px-2",
				children: histogramBars
			}), /* @__PURE__ */ jsxs(Slider.Root, {
				className: "relative flex h-6 w-full touch-none select-none items-center",
				value,
				onValueChange: (v) => onChange(v),
				min,
				max,
				step: effectiveStep,
				minStepsBetweenThumbs: 1,
				children: [
					/* @__PURE__ */ jsx(Slider.Track, {
						className: "relative h-1.5 w-full grow rounded-full bg-muted",
						children: /* @__PURE__ */ jsx(Slider.Range, { className: "absolute h-full rounded-full bg-primary/40" })
					}),
					/* @__PURE__ */ jsx(Slider.Thumb, {
						className: "block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						"aria-label": `${label} minimum`
					}),
					/* @__PURE__ */ jsx(Slider.Thumb, {
						className: "block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						"aria-label": `${label} maximum`
					})
				]
			})]
		})]
	});
}
//#endregion
//#region src/hooks/useDebounce.ts
function useDebounce(value, delayMs) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);
	return debounced;
}
//#endregion
//#region src/features/inspection/utils/compute-histogram.ts
/**
* Compute histogram bin counts for a set of numeric values.
*
* @param values - The raw numeric values to bin
* @param min - Lower bound of the histogram range
* @param max - Upper bound of the histogram range
* @param binCount - Number of bins (default 30)
* @returns Array of bin counts, length === binCount
*/ function computeHistogramBins(values, min, max, binCount = 30) {
	if (values.length === 0 || min >= max) return new Array(binCount).fill(0);
	const bins = new Array(binCount).fill(0);
	const binWidth = (max - min) / binCount;
	for (const v of values) {
		let idx = Math.floor((v - min) / binWidth);
		if (idx < 0) idx = 0;
		if (idx >= binCount) idx = binCount - 1;
		bins[idx]++;
	}
	return bins;
}
//#endregion
//#region src/features/inspection/components/DynamicFilterPanel.tsx
/** Core numeric fields always available on DefectRecord. */ var CORE_NUMERIC_KEYS = [
	{
		key: "size",
		label: "Size",
		unit: "um"
	},
	{
		key: "xAbs",
		label: "X (wafer)",
		unit: "um"
	},
	{
		key: "yAbs",
		label: "Y (wafer)",
		unit: "um"
	},
	{
		key: "xRel",
		label: "X (die-rel)",
		unit: "um"
	},
	{
		key: "yRel",
		label: "Y (die-rel)",
		unit: "um"
	},
	{
		key: "xIndex",
		label: "Die X"
	},
	{
		key: "yIndex",
		label: "Die Y"
	}
];
/** Keys already covered by CORE_NUMERIC_KEYS (don't duplicate from schema). */ var CORE_KEY_SET = new Set(CORE_NUMERIC_KEYS.map((c) => c.key));
/** Schema column names that map to core keys. */ var SCHEMA_TO_CORE = {
	XREL: "xRel",
	YREL: "yRel",
	XINDEX: "xIndex",
	YINDEX: "yIndex",
	DSIZE: "size",
	DEFECTSIZE: "size",
	DEFECTID: "defectId",
	CLASSNUMBER: "classNumber",
	TEST: "test",
	CLUSTERNUMBER: "clusterNumber",
	IMAGECOUNT: "imageCount"
};
function DynamicFilterPanel({ defects, defectSchema }) {
	const filters = useInspectionStore((s) => s.filters);
	const updateFilters = useInspectionStore((s) => s.updateFilters);
	const columns = useMemo(() => {
		const result = [];
		for (const col of CORE_NUMERIC_KEYS) {
			const values = defects.map((d) => readField(d, col.key)).filter((v) => typeof v === "number" && !isNaN(v));
			if (values.length === 0) continue;
			let min = Infinity, max = -Infinity;
			for (const v of values) {
				if (v < min) min = v;
				if (v > max) max = v;
			}
			if (min === max) {
				min -= 1;
				max += 1;
			}
			result.push({
				key: col.key,
				label: col.label,
				unit: col.unit,
				min,
				max,
				histogram: computeHistogramBins(values, min, max)
			});
		}
		for (const schemaCol of defectSchema) {
			const coreKey = SCHEMA_TO_CORE[schemaCol.name];
			if (coreKey && CORE_KEY_SET.has(coreKey)) continue;
			if (coreKey) {
				const values = defects.map((d) => readField(d, coreKey)).filter((v) => typeof v === "number" && !isNaN(v));
				if (values.length === 0) continue;
				let min = Infinity, max = -Infinity;
				for (const v of values) {
					if (v < min) min = v;
					if (v > max) max = v;
				}
				if (min === max) {
					min -= 1;
					max += 1;
				}
				result.push({
					key: coreKey,
					label: schemaCol.name,
					min,
					max,
					histogram: computeHistogramBins(values, min, max)
				});
				continue;
			}
			if (schemaCol.type !== "int32" && schemaCol.type !== "float") continue;
			const values = defects.map((d) => readField(d, schemaCol.name)).filter((v) => typeof v === "number" && !isNaN(v));
			if (values.length === 0) continue;
			let min = Infinity, max = -Infinity;
			for (const v of values) {
				if (v < min) min = v;
				if (v > max) max = v;
			}
			if (min === max) {
				min -= 1;
				max += 1;
			}
			result.push({
				key: schemaCol.name,
				label: schemaCol.name,
				min,
				max,
				histogram: computeHistogramBins(values, min, max)
			});
		}
		return result;
	}, [defects, defectSchema]);
	const [localRanges, setLocalRanges] = useState({});
	useEffect(() => {
		const initial = {};
		for (const col of columns) {
			const storeRange = filters.numericRanges[col.key];
			initial[col.key] = storeRange ? [storeRange[0] ?? col.min, storeRange[1] ?? col.max] : [col.min, col.max];
		}
		setLocalRanges(initial);
	}, [columns]);
	const debouncedRanges = useDebounce(localRanges, 150);
	useEffect(() => {
		const numericRanges = {};
		for (const col of columns) {
			const range = debouncedRanges[col.key];
			if (!range) continue;
			if (range[0] > col.min || range[1] < col.max) numericRanges[col.key] = [range[0], range[1]];
		}
		updateFilters({ numericRanges });
	}, [
		debouncedRanges,
		columns,
		updateFilters
	]);
	const handleSliderChange = useCallback((key, value) => {
		setLocalRanges((prev) => ({
			...prev,
			[key]: value
		}));
	}, []);
	if (columns.length === 0) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "border-b border-border bg-muted/20 p-4",
		children: /* @__PURE__ */ jsx("div", {
			className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
			children: columns.map((col) => /* @__PURE__ */ jsx(RangeSlider, {
				label: col.label,
				min: col.min,
				max: col.max,
				value: localRanges[col.key] ?? [col.min, col.max],
				onChange: (v) => handleSliderChange(col.key, v),
				histogramData: col.histogram,
				unit: col.unit
			}, col.key))
		})
	});
}
//#endregion
//#region src/components/portal/LancelotFilters.tsx
/**
* GlobalFilters component for Portal mode.
*
* Renders the same filter controls as FilterSidebar but without
* the aside wrapper — the Portal provides the panel chrome.
*/ function LancelotFilters() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const file = activeFileId ? files.get(activeFileId) : void 0;
	const filters = useInspectionStore((s) => s.filters);
	const updateFilters = useInspectionStore((s) => s.updateFilters);
	const clearFilters = useInspectionStore((s) => s.clearFilters);
	const { filteredCount, totalCount, isFiltered } = useFilteredDefects();
	const { t } = useTranslation();
	const hasActiveFilters = useMemo(() => {
		return filters.classNumbers.size > 0 || Object.keys(filters.numericRanges).length > 0 || filters.searchText !== "";
	}, [filters]);
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center p-4 text-sm text-muted-foreground",
		children: "No file loaded"
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col",
		children: [
			isFiltered && /* @__PURE__ */ jsxs("div", {
				className: "border-b border-border px-3 py-2 text-xs text-muted-foreground",
				children: [
					filteredCount.toLocaleString(),
					" / ",
					totalCount.toLocaleString()
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex-1 overflow-y-auto",
				children: [
					file.classLookup.length > 0 && /* @__PURE__ */ jsxs("div", {
						className: "border-b border-border px-3 py-3",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mb-2 block text-xs font-medium text-muted-foreground",
							children: t("filters.defectClass")
						}), /* @__PURE__ */ jsx("div", {
							className: "flex flex-wrap gap-1",
							children: file.classLookup.map((cls) => {
								return /* @__PURE__ */ jsx("button", {
									onClick: () => {
										const next = new Set(filters.classNumbers);
										if (next.has(cls.classNumber)) next.delete(cls.classNumber);
										else next.add(cls.classNumber);
										updateFilters({ classNumbers: next });
									},
									className: cn("rounded-full border px-2 py-0.5 text-xs transition-colors", filters.classNumbers.has(cls.classNumber) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"),
									children: cls.className
								}, cls.classNumber);
							})
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "border-b border-border px-3 py-3",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mb-2 block text-xs font-medium text-muted-foreground",
							children: t("filters.search")
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							placeholder: t("filters.searchPlaceholder"),
							value: filters.searchText,
							onChange: (e) => updateFilters({ searchText: e.target.value }),
							className: "w-full rounded border border-border bg-card px-2 py-1 text-xs"
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "px-0 py-0",
						children: /* @__PURE__ */ jsx(DynamicFilterPanel, {
							defects: file.defects,
							defectSchema: file.defectSchema
						})
					})
				]
			}),
			hasActiveFilters && /* @__PURE__ */ jsx("div", {
				className: "border-t border-border px-3 py-2",
				children: /* @__PURE__ */ jsxs("button", {
					onClick: clearFilters,
					className: "flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10",
					children: [/* @__PURE__ */ jsx(Filter, { className: "h-3 w-3" }), t("filters.clearAll")]
				})
			})
		]
	});
}
//#endregion
export { LancelotFilters as default };

//# sourceMappingURL=LancelotFilters-jLh4tZjx.js.map