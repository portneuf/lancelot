import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useFilteredDefects } from "./useFilteredDefects-BmOCESYD.js";
import { t as EmptyState } from "./EmptyState-ELtzSX51.js";
import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
//#region src/features/analysis/spc.tsx
/**
* SPC (Statistical Process Control) Chart page.
*
* Displays control charts with center line (CL), upper/lower control limits
* (UCL/LCL at +/-3 sigma), and warning limits (+/-2 sigma). Points that
* exceed control limits are highlighted in red as out-of-control.
*
* Metrics:
* - Defects/Die: defect count per die (single file)
* - Defect Density: defect density per die (defects / die area in cm^2)
* - Size Mean: mean defect size per die
*
* When multiple files are loaded, shows defect count trend across wafers.
*/ var METRIC_LABELS = {
	defectsPerDie: "Defects / Die",
	defectDensity: "Defect Density (defects/cm²)",
	sizeMean: "Size Mean (µm)"
};
function computeStats(values) {
	if (values.length === 0) return {
		mean: 0,
		sigma: 0,
		ucl: 0,
		lcl: 0,
		uwl: 0,
		lwl: 0
	};
	const n = values.length;
	const mean = values.reduce((a, b) => a + b, 0) / n;
	const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
	const sigma = Math.sqrt(variance);
	return {
		mean,
		sigma,
		ucl: mean + 3 * sigma,
		lcl: Math.max(0, mean - 3 * sigma),
		uwl: mean + 2 * sigma,
		lwl: Math.max(0, mean - 2 * sigma)
	};
}
function buildSingleFileData(file, defects, metric) {
	const dieMap = /* @__PURE__ */ new Map();
	for (const d of defects) {
		const key = `(${d.xIndex},${d.yIndex})`;
		const arr = dieMap.get(key);
		if (arr) arr.push(d);
		else dieMap.set(key, [d]);
	}
	for (const die of file.dieMap) {
		if (die.status === "untested" || die.status === "skipped") continue;
		const key = `(${die.xIndex},${die.yIndex})`;
		if (!dieMap.has(key)) dieMap.set(key, []);
	}
	const [pitchX, pitchY] = file.waferGeometry.diePitch;
	const dieAreaCm2 = pitchX * pitchY / 1e8;
	const sortedKeys = [...dieMap.keys()].sort((a, b) => {
		const parseKey = (k) => {
			const match = k.match(/\((-?\d+),(-?\d+)\)/);
			return match ? [Number(match[1]), Number(match[2])] : [0, 0];
		};
		const [ax, ay] = parseKey(a);
		const [bx, by] = parseKey(b);
		return ax !== bx ? ax - bx : ay - by;
	});
	const rawValues = [];
	for (const key of sortedKeys) {
		const dieDefects = dieMap.get(key);
		let value;
		switch (metric) {
			case "defectsPerDie":
				value = dieDefects.length;
				break;
			case "defectDensity":
				value = dieAreaCm2 > 0 ? dieDefects.length / dieAreaCm2 : 0;
				break;
			case "sizeMean": {
				const sizes = dieDefects.map((d) => d.size).filter((s) => s != null && s > 0);
				value = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
				break;
			}
		}
		rawValues.push({
			label: key,
			value
		});
	}
	const stats = computeStats(rawValues.map((d) => d.value));
	return rawValues.map((d) => ({
		label: d.label,
		value: d.value,
		ooc: d.value > stats.ucl || d.value < stats.lcl
	}));
}
function buildMultiFileData(files) {
	const entries = [];
	for (const [, file] of files) {
		const waferLabel = file.identity.waferId ?? file.source.fileName.replace(/\.[^.]+$/, "");
		entries.push({
			label: waferLabel,
			value: file.defects.length,
			timestamp: file.source.parseTimestamp
		});
	}
	entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
	const stats = computeStats(entries.map((e) => e.value));
	return entries.map((e) => ({
		label: e.label,
		value: e.value,
		ooc: e.value > stats.ucl || e.value < stats.lcl
	}));
}
function SpcTooltip({ active, payload, metricLabel }) {
	if (!active || !payload || payload.length === 0) return null;
	const data = payload[0].payload;
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "font-semibold",
				children: data.label
			}),
			/* @__PURE__ */ jsxs("p", { children: [
				metricLabel,
				": ",
				data.value.toFixed(2)
			] }),
			data.ooc && /* @__PURE__ */ jsx("p", {
				className: "font-medium text-destructive",
				children: "Out of control"
			})
		]
	});
}
function ControlDot({ cx, cy, payload }) {
	if (cx == null || cy == null || !payload) return null;
	if (payload.ooc) return /* @__PURE__ */ jsx("circle", {
		cx,
		cy,
		r: 5,
		fill: "#ef4444",
		stroke: "#ffffff",
		strokeWidth: 1.5
	});
	return /* @__PURE__ */ jsx("circle", {
		cx,
		cy,
		r: 3,
		fill: "#2563eb",
		stroke: "#ffffff",
		strokeWidth: 1
	});
}
function MetricSelector({ value, onChange }) {
	return /* @__PURE__ */ jsxs("select", {
		value,
		onChange: (e) => onChange(e.target.value),
		className: cn("rounded-md border border-border bg-card px-3 py-1.5 text-sm", "text-foreground outline-none", "focus:ring-2 focus:ring-ring"),
		children: [
			/* @__PURE__ */ jsx("option", {
				value: "defectsPerDie",
				children: "Defects / Die"
			}),
			/* @__PURE__ */ jsx("option", {
				value: "defectDensity",
				children: "Defect Density"
			}),
			/* @__PURE__ */ jsx("option", {
				value: "sizeMean",
				children: "Size Mean"
			})
		]
	});
}
var numberFormatter = new Intl.NumberFormat(void 0, { maximumFractionDigits: 2 });
function SpcPage() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const { file, filteredDefects } = useFilteredDefects();
	const [metric, setMetric] = useState("defectsPerDie");
	const isMultiFile = files.size > 1;
	const chartData = useMemo(() => {
		if (isMultiFile) return buildMultiFileData(files);
		if (file) return buildSingleFileData(file, filteredDefects, metric);
		return [];
	}, [
		file,
		filteredDefects,
		files,
		isMultiFile,
		metric
	]);
	const stats = useMemo(() => {
		return computeStats(chartData.map((d) => d.value));
	}, [chartData]);
	const oocCount = useMemo(() => chartData.filter((d) => d.ooc).length, [chartData]);
	const currentMetricLabel = isMultiFile ? "Defect Count / Wafer" : METRIC_LABELS[metric];
	if (!activeFileId || !file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: Activity,
			title: "No Data",
			description: "Open a file to view SPC control charts"
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx(Activity, { className: "h-5 w-5 text-primary" }), /* @__PURE__ */ jsxs("h1", {
						className: "text-sm font-semibold",
						children: ["SPC Control Chart", isMultiFile ? " (Multi-Wafer Trend)" : ""]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-4",
					children: [!isMultiFile && /* @__PURE__ */ jsx(MetricSelector, {
						value: metric,
						onChange: setMetric
					}), /* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted-foreground",
						children: [
							chartData.length,
							" data points",
							oocCount > 0 && /* @__PURE__ */ jsxs("span", {
								className: "ml-2 font-medium text-destructive",
								children: [oocCount, " OOC"]
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center gap-4 border-b border-border bg-card px-4 py-2",
				children: [
					/* @__PURE__ */ jsx(StatBadge, {
						label: "CL (Mean)",
						value: stats.mean
					}),
					/* @__PURE__ */ jsx(StatBadge, {
						label: "UCL (+3\\u03C3)",
						value: stats.ucl,
						color: "text-destructive"
					}),
					/* @__PURE__ */ jsx(StatBadge, {
						label: "LCL (-3\\u03C3)",
						value: stats.lcl,
						color: "text-destructive"
					}),
					/* @__PURE__ */ jsx(StatBadge, {
						label: "UWL (+2\\u03C3)",
						value: stats.uwl,
						color: "text-yellow-600 dark:text-yellow-400"
					}),
					/* @__PURE__ */ jsx(StatBadge, {
						label: "LWL (-2\\u03C3)",
						value: stats.lwl,
						color: "text-yellow-600 dark:text-yellow-400"
					}),
					/* @__PURE__ */ jsx(StatBadge, {
						label: "\\u03C3",
						value: stats.sigma
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "flex-1 p-4",
				children: chartData.length === 0 ? /* @__PURE__ */ jsx("div", {
					className: "flex h-full items-center justify-center",
					children: /* @__PURE__ */ jsx(EmptyState, {
						icon: Activity,
						title: "No Data Points",
						description: "Not enough data to build a control chart"
					})
				}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ jsxs(ComposedChart, {
						data: chartData,
						margin: {
							top: 20,
							right: 40,
							bottom: 60,
							left: 20
						},
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, {
								strokeDasharray: "3 3",
								className: "opacity-30"
							}),
							/* @__PURE__ */ jsx(XAxis, {
								dataKey: "label",
								tick: { fontSize: 10 },
								angle: -45,
								textAnchor: "end",
								height: 80,
								interval: chartData.length > 50 ? Math.floor(chartData.length / 25) : 0
							}),
							/* @__PURE__ */ jsx(YAxis, {
								tick: { fontSize: 11 },
								label: {
									value: currentMetricLabel,
									angle: -90,
									position: "insideLeft",
									offset: -5,
									style: { fontSize: 11 }
								},
								domain: [(dataMin) => Math.max(0, Math.floor(dataMin * .8)), (dataMax) => Math.ceil(Math.max(dataMax, stats.ucl) * 1.1)]
							}),
							/* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(SpcTooltip, { metricLabel: currentMetricLabel }) }),
							/* @__PURE__ */ jsx(ReferenceLine, {
								y: stats.ucl,
								stroke: "#ef4444",
								strokeWidth: 1.5,
								label: {
									value: `UCL ${numberFormatter.format(stats.ucl)}`,
									position: "right",
									style: {
										fontSize: 10,
										fill: "#ef4444"
									}
								}
							}),
							/* @__PURE__ */ jsx(ReferenceLine, {
								y: stats.lcl,
								stroke: "#ef4444",
								strokeWidth: 1.5,
								label: {
									value: `LCL ${numberFormatter.format(stats.lcl)}`,
									position: "right",
									style: {
										fontSize: 10,
										fill: "#ef4444"
									}
								}
							}),
							/* @__PURE__ */ jsx(ReferenceLine, {
								y: stats.uwl,
								stroke: "#ca8a04",
								strokeWidth: 1,
								strokeDasharray: "6 3",
								label: {
									value: `UWL ${numberFormatter.format(stats.uwl)}`,
									position: "right",
									style: {
										fontSize: 10,
										fill: "#ca8a04"
									}
								}
							}),
							/* @__PURE__ */ jsx(ReferenceLine, {
								y: stats.lwl,
								stroke: "#ca8a04",
								strokeWidth: 1,
								strokeDasharray: "6 3",
								label: {
									value: `LWL ${numberFormatter.format(stats.lwl)}`,
									position: "right",
									style: {
										fontSize: 10,
										fill: "#ca8a04"
									}
								}
							}),
							/* @__PURE__ */ jsx(ReferenceLine, {
								y: stats.mean,
								stroke: "#16a34a",
								strokeWidth: 2,
								label: {
									value: `CL ${numberFormatter.format(stats.mean)}`,
									position: "right",
									style: {
										fontSize: 10,
										fill: "#16a34a",
										fontWeight: 600
									}
								}
							}),
							/* @__PURE__ */ jsx(Line, {
								type: "monotone",
								dataKey: "value",
								stroke: "#2563eb",
								strokeWidth: 1.5,
								dot: /* @__PURE__ */ jsx(ControlDot, {}),
								activeDot: {
									r: 6,
									fill: "#2563eb",
									stroke: "#fff",
									strokeWidth: 2
								},
								isAnimationActive: false
							})
						]
					})
				})
			})
		]
	});
}
function StatBadge({ label, value, color }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex items-center gap-1.5",
		children: [/* @__PURE__ */ jsx("span", {
			className: "text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
			children: label
		}), /* @__PURE__ */ jsx("span", {
			className: cn("text-xs font-semibold tabular-nums", color),
			children: numberFormatter.format(value)
		})]
	});
}
//#endregion
export { SpcPage as default };

//# sourceMappingURL=spc-CEdiscKp.js.map