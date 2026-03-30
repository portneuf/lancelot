import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { t as useTranslation } from "./useTranslation-810_9bMT.js";
import { t as EmptyState } from "./EmptyState-ELtzSX51.js";
import { useMemo } from "react";
import { ScatterChart } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CartesianGrid, Cell, Legend, ResponsiveContainer, Scatter, ScatterChart as ScatterChart$1, Tooltip, XAxis, YAxis } from "recharts";
//#region src/features/analysis/spatial.tsx
var CHART_COLORS = [
	"#2563eb",
	"#dc2626",
	"#16a34a",
	"#ca8a04",
	"#9333ea",
	"#0891b2",
	"#e11d48",
	"#65a30d"
];
var DOWNSAMPLE_THRESHOLD = 1e4;
var GRID_RESOLUTION = 100;
function buildClassMap(classLookup) {
	const map = /* @__PURE__ */ new Map();
	for (const entry of classLookup) map.set(entry.classNumber, entry.className);
	return map;
}
function downsampleDefects(defects, classMap) {
	if (defects.length === 0) return /* @__PURE__ */ new Map();
	let xMin = Infinity;
	let xMax = -Infinity;
	let yMin = Infinity;
	let yMax = -Infinity;
	for (const d of defects) {
		if (d.xAbs < xMin) xMin = d.xAbs;
		if (d.xAbs > xMax) xMax = d.xAbs;
		if (d.yAbs < yMin) yMin = d.yAbs;
		if (d.yAbs > yMax) yMax = d.yAbs;
	}
	const xRange = xMax - xMin || 1;
	const yRange = yMax - yMin || 1;
	const bucketWidth = xRange / GRID_RESOLUTION;
	const bucketHeight = yRange / GRID_RESOLUTION;
	const buckets = /* @__PURE__ */ new Map();
	for (const d of defects) {
		const bx = Math.min(Math.floor((d.xAbs - xMin) / bucketWidth), GRID_RESOLUTION - 1);
		const by = Math.min(Math.floor((d.yAbs - yMin) / bucketHeight), GRID_RESOLUTION - 1);
		const clsName = classMap.get(d.classNumber ?? -1) ?? "Unclassified";
		const key = `${clsName}|${bx}|${by}`;
		const existing = buckets.get(key);
		if (existing) {
			existing.sumX += d.xAbs;
			existing.sumY += d.yAbs;
			existing.count += 1;
			existing.totalSize += d.size ?? 0;
		} else buckets.set(key, {
			sumX: d.xAbs,
			sumY: d.yAbs,
			count: 1,
			totalSize: d.size ?? 0,
			className: clsName
		});
	}
	const seriesMap = /* @__PURE__ */ new Map();
	for (const bucket of buckets.values()) {
		const point = {
			x: Math.round(bucket.sumX / bucket.count * 100) / 100,
			y: Math.round(bucket.sumY / bucket.count * 100) / 100,
			count: bucket.count,
			size: Math.max(3, Math.min(20, 3 + Math.log2(bucket.count) * 3)),
			className: bucket.className
		};
		const series = seriesMap.get(bucket.className);
		if (series) series.push(point);
		else seriesMap.set(bucket.className, [point]);
	}
	return seriesMap;
}
function groupDefectsByClass(defects, classMap) {
	const seriesMap = /* @__PURE__ */ new Map();
	for (const d of defects) {
		const clsName = classMap.get(d.classNumber ?? -1) ?? "Unclassified";
		const point = {
			x: d.xAbs,
			y: d.yAbs,
			defectId: d.defectId,
			className: clsName,
			size: d.size ?? 0
		};
		const series = seriesMap.get(clsName);
		if (series) series.push(point);
		else seriesMap.set(clsName, [point]);
	}
	return seriesMap;
}
function CustomTooltip({ active, payload, isDownsampled }) {
	if (!active || !payload || payload.length === 0) return null;
	const data = payload[0].payload;
	return /* @__PURE__ */ jsx("div", {
		className: "rounded-md border bg-popover px-3 py-2 text-sm shadow-md",
		children: isDownsampled ? /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("p", {
				className: "font-medium",
				children: data.className
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-muted-foreground",
				children: [
					"X: ",
					data.x.toFixed(1),
					" um, Y: ",
					data.y.toFixed(1),
					" um"
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-muted-foreground",
				children: ["Count: ", data.count]
			})
		] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsxs("p", {
				className: "font-medium",
				children: ["Defect #", data.defectId]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-muted-foreground",
				children: [
					"X: ",
					data.x.toFixed(1),
					" um, Y: ",
					data.y.toFixed(1),
					" um"
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-muted-foreground",
				children: ["Class: ", data.className]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-muted-foreground",
				children: [
					"Size: ",
					data.size.toFixed(2),
					" um"
				]
			})
		] })
	});
}
function SpatialPage() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const file = activeFileId ? files.get(activeFileId) : void 0;
	const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
	const { t } = useTranslation();
	const classMap = useMemo(() => {
		if (!file) return /* @__PURE__ */ new Map();
		return buildClassMap(file.classLookup);
	}, [file]);
	const activeDefects = useMemo(() => {
		if (!file) return [];
		return filteredDefectIds ? file.defects.filter((d) => filteredDefectIds.has(d.defectId)) : file.defects;
	}, [file, filteredDefectIds]);
	const isDownsampled = useMemo(() => {
		return activeDefects.length > DOWNSAMPLE_THRESHOLD;
	}, [activeDefects]);
	const seriesData = useMemo(() => {
		if (!file) return /* @__PURE__ */ new Map();
		if (isDownsampled) return downsampleDefects(activeDefects, classMap);
		if (file.classLookup.length === 0) {
			const allPoints = activeDefects.map((d) => ({
				x: d.xAbs,
				y: d.yAbs,
				defectId: d.defectId,
				className: "All Defects",
				size: d.size ?? 0
			}));
			const map = /* @__PURE__ */ new Map();
			map.set("All Defects", allPoints);
			return map;
		}
		return groupDefectsByClass(activeDefects, classMap);
	}, [
		file,
		activeDefects,
		classMap,
		isDownsampled
	]);
	const defectCount = activeDefects.length;
	const seriesNames = useMemo(() => Array.from(seriesData.keys()), [seriesData]);
	if (!activeFileId || !file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: ScatterChart,
			title: t("common.noData"),
			description: t("spatial.openFileToView")
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col p-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mb-4 flex items-center justify-between",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ jsx(ScatterChart, { className: "h-6 w-6 text-primary" }), /* @__PURE__ */ jsx("h1", {
					className: "text-2xl font-bold",
					children: t("spatial.title")
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2",
				children: [isDownsampled && /* @__PURE__ */ jsx("span", {
					className: "rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
					children: "Downsampled"
				}), /* @__PURE__ */ jsxs("span", {
					className: cn("rounded-md px-2.5 py-1 text-sm font-medium", "bg-muted text-muted-foreground"),
					children: [defectCount.toLocaleString(), " defects"]
				})]
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "flex min-h-0 flex-1 items-center justify-center",
			children: /* @__PURE__ */ jsx("div", {
				className: "aspect-square w-full max-w-[800px]",
				children: /* @__PURE__ */ jsx(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ jsxs(ScatterChart$1, {
						margin: {
							top: 20,
							right: 20,
							bottom: 40,
							left: 40
						},
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, {
								strokeDasharray: "3 3",
								className: "opacity-30"
							}),
							/* @__PURE__ */ jsx(XAxis, {
								type: "number",
								dataKey: "x",
								name: "X",
								label: {
									value: "X (um)",
									position: "insideBottom",
									offset: -20,
									style: { fill: "currentColor" }
								},
								tick: { fontSize: 11 }
							}),
							/* @__PURE__ */ jsx(YAxis, {
								type: "number",
								dataKey: "y",
								name: "Y",
								reversed: true,
								label: {
									value: "Y (um)",
									angle: -90,
									position: "insideLeft",
									offset: -20,
									style: { fill: "currentColor" }
								},
								tick: { fontSize: 11 }
							}),
							/* @__PURE__ */ jsx(Tooltip, {
								content: /* @__PURE__ */ jsx(CustomTooltip, { isDownsampled }),
								cursor: { strokeDasharray: "3 3" }
							}),
							/* @__PURE__ */ jsx(Legend, {
								verticalAlign: "top",
								height: 36
							}),
							seriesNames.map((name, idx) => {
								const color = CHART_COLORS[idx % CHART_COLORS.length];
								const data = seriesData.get(name) ?? [];
								return /* @__PURE__ */ jsx(Scatter, {
									name,
									data,
									fill: color,
									opacity: .7,
									children: isDownsampled ? data.map((entry, i) => /* @__PURE__ */ jsx(Cell, { r: entry.size }, `cell-${i}`)) : void 0
								}, name);
							})
						]
					})
				})
			})
		})]
	});
}
//#endregion
export { SpatialPage as default };

//# sourceMappingURL=spatial-CfvBSpDV.js.map