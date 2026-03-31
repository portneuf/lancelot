import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { t as useTranslation } from "./useTranslation-B1_W7B7C.js";
import { t as EmptyState } from "./EmptyState-nf8sPvBQ.js";
import { t as useActiveFile } from "./useActiveFile-IYGNhLJJ.js";
import { useMemo } from "react";
import { Gauge, Hash, Layers, Target, TrendingUp } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
//#region src/features/analysis/yield.tsx
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
function KpiCard({ title, value, subtitle, icon, color }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm",
		children: [/* @__PURE__ */ jsx("div", {
			className: cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", color),
			children: icon
		}), /* @__PURE__ */ jsxs("div", {
			className: "min-w-0 flex-1",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-sm font-medium text-muted-foreground",
					children: title
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-1 truncate text-2xl font-bold tracking-tight",
					children: value
				}),
				subtitle && /* @__PURE__ */ jsx("p", {
					className: "mt-0.5 text-xs text-muted-foreground",
					children: subtitle
				})
			]
		})]
	});
}
function computeDefectDensity(file) {
	const defectCount = file.defects.length;
	let totalAreaUm2 = 0;
	for (const s of file.summaries) if (s.areaPerTest != null && s.areaPerTest > 0) totalAreaUm2 += s.areaPerTest;
	if (totalAreaUm2 === 0) {
		const radiusUm = file.waferGeometry.waferDiameter / 2;
		totalAreaUm2 = Math.PI * radiusUm * radiusUm;
	}
	const totalAreaCm2 = totalAreaUm2 / 1e8;
	return {
		density: totalAreaCm2 > 0 ? defectCount / totalAreaCm2 : 0,
		unit: "defects/cm²"
	};
}
function computeDieYield(file) {
	const testedDies = file.dieMap.filter((d) => d.status === "tested");
	const cleanDies = testedDies.filter((d) => d.defectCount === 0);
	return {
		yieldPct: testedDies.length > 0 ? cleanDies.length / testedDies.length * 100 : 0,
		cleanDies: cleanDies.length,
		testedDies: testedDies.length
	};
}
function computeClassCount(file) {
	if (file.classLookup.length > 0) return file.classLookup.length;
	const classSet = /* @__PURE__ */ new Set();
	for (const d of file.defects) if (d.classNumber != null) classSet.add(d.classNumber);
	return classSet.size;
}
function buildSizeHistogram(defects, binCount) {
	const sizes = defects.map((d) => d.size).filter((s) => s != null && s > 0);
	if (sizes.length === 0) return [];
	let min = Infinity;
	let max = -Infinity;
	for (const s of sizes) {
		if (s < min) min = s;
		if (s > max) max = s;
	}
	if (min === max) return [{
		label: min.toFixed(2),
		count: sizes.length
	}];
	const binWidth = (max - min) / binCount;
	const bins = [];
	for (let i = 0; i < binCount; i++) {
		const lo = min + i * binWidth;
		const hi = lo + binWidth;
		bins.push({
			label: `${lo.toFixed(1)}-${hi.toFixed(1)}`,
			count: 0
		});
	}
	for (const s of sizes) {
		let idx = Math.floor((s - min) / binWidth);
		if (idx >= binCount) idx = binCount - 1;
		bins[idx].count++;
	}
	return bins;
}
function buildDefectsPerDie(file, topN) {
	const dieCounts = /* @__PURE__ */ new Map();
	for (const d of file.defects) {
		const key = `(${d.xIndex},${d.yIndex})`;
		dieCounts.set(key, (dieCounts.get(key) ?? 0) + 1);
	}
	const entries = [];
	for (const [key, count] of dieCounts) entries.push({
		label: key,
		count
	});
	entries.sort((a, b) => b.count - a.count);
	return entries.slice(0, topN);
}
function BarTooltip({ active, payload, labelKey = "Range" }) {
	if (!active || !payload || payload.length === 0) return null;
	const data = payload[0];
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-md border bg-popover px-3 py-2 text-sm shadow-md",
		children: [/* @__PURE__ */ jsxs("p", {
			className: "font-medium",
			children: [
				labelKey,
				": ",
				data.payload.label
			]
		}), /* @__PURE__ */ jsxs("p", {
			className: "text-muted-foreground",
			children: ["Count: ", data.value.toLocaleString()]
		})]
	});
}
function YieldPage() {
	const { file } = useActiveFile();
	const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
	const { t } = useTranslation();
	const kpis = useMemo(() => {
		if (!file) return {
			totalDefects: 0,
			density: 0,
			densityUnit: "",
			yieldPct: 0,
			cleanDies: 0,
			testedDies: 0,
			classCount: 0
		};
		const { density, unit: densityUnit } = computeDefectDensity(file);
		const { yieldPct, cleanDies, testedDies } = computeDieYield(file);
		const classCount = computeClassCount(file);
		return {
			totalDefects: (filteredDefectIds ? file.defects.filter((d) => filteredDefectIds.has(d.defectId)) : file.defects).length,
			density,
			densityUnit,
			yieldPct,
			cleanDies,
			testedDies,
			classCount
		};
	}, [file, filteredDefectIds]);
	const sizeHistogram = useMemo(() => {
		if (!file) return [];
		return buildSizeHistogram(filteredDefectIds ? file.defects.filter((d) => filteredDefectIds.has(d.defectId)) : file.defects, 10);
	}, [file, filteredDefectIds]);
	const defectsPerDie = useMemo(() => {
		if (!file) return [];
		return buildDefectsPerDie(file, 20);
	}, [file]);
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: TrendingUp,
			title: t("common.noData"),
			description: t("yield.openFileToView")
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col gap-6 overflow-y-auto p-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ jsx(TrendingUp, { className: "h-6 w-6 text-primary" }), /* @__PURE__ */ jsx("h1", {
					className: "text-2xl font-bold",
					children: t("yield.title")
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
				children: [
					/* @__PURE__ */ jsx(KpiCard, {
						title: t("yield.totalDefects"),
						value: kpis.totalDefects.toLocaleString(),
						icon: /* @__PURE__ */ jsx(Hash, { className: "h-5 w-5 text-white" }),
						color: "bg-blue-600"
					}),
					/* @__PURE__ */ jsx(KpiCard, {
						title: t("yield.defectDensity"),
						value: kpis.density.toFixed(1),
						subtitle: kpis.densityUnit,
						icon: /* @__PURE__ */ jsx(Gauge, { className: "h-5 w-5 text-white" }),
						color: "bg-red-600"
					}),
					/* @__PURE__ */ jsx(KpiCard, {
						title: t("yield.dieYield"),
						value: `${kpis.yieldPct.toFixed(1)}%`,
						subtitle: `${kpis.cleanDies} ${t("yield.clean")} / ${kpis.testedDies} ${t("yield.tested")}`,
						icon: /* @__PURE__ */ jsx(Target, { className: "h-5 w-5 text-white" }),
						color: "bg-green-600"
					}),
					/* @__PURE__ */ jsx(KpiCard, {
						title: t("yield.defectClasses"),
						value: kpis.classCount,
						icon: /* @__PURE__ */ jsx(Layers, { className: "h-5 w-5 text-white" }),
						color: "bg-purple-600"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col rounded-lg border bg-card p-4 shadow-sm",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "mb-4 text-lg font-semibold",
						children: t("yield.defectSizeDistribution")
					}), sizeHistogram.length > 0 ? /* @__PURE__ */ jsx("div", {
						className: "h-72",
						children: /* @__PURE__ */ jsx(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ jsxs(BarChart, {
								data: sizeHistogram,
								margin: {
									top: 10,
									right: 20,
									bottom: 40,
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
										angle: -35,
										textAnchor: "end",
										label: {
											value: "Size Range (um)",
											position: "insideBottom",
											offset: -30,
											style: {
												fill: "currentColor",
												fontSize: 12
											}
										}
									}),
									/* @__PURE__ */ jsx(YAxis, {
										tick: { fontSize: 11 },
										label: {
											value: "Count",
											angle: -90,
											position: "insideLeft",
											offset: -5,
											style: {
												fill: "currentColor",
												fontSize: 12
											}
										}
									}),
									/* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(BarTooltip, { labelKey: "Size Range" }) }),
									/* @__PURE__ */ jsx(Bar, {
										dataKey: "count",
										fill: CHART_COLORS[0],
										radius: [
											2,
											2,
											0,
											0
										]
									})
								]
							})
						})
					}) : /* @__PURE__ */ jsx("div", {
						className: "flex h-72 items-center justify-center",
						children: /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted-foreground",
							children: "No size data available"
						})
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col rounded-lg border bg-card p-4 shadow-sm",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "mb-4 text-lg font-semibold",
						children: t("yield.defectsPerDie")
					}), defectsPerDie.length > 0 ? /* @__PURE__ */ jsx("div", {
						className: "h-72",
						children: /* @__PURE__ */ jsx(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ jsxs(BarChart, {
								data: defectsPerDie,
								margin: {
									top: 10,
									right: 20,
									bottom: 40,
									left: 20
								},
								children: [
									/* @__PURE__ */ jsx(CartesianGrid, {
										strokeDasharray: "3 3",
										className: "opacity-30"
									}),
									/* @__PURE__ */ jsx(XAxis, {
										dataKey: "label",
										tick: { fontSize: 9 },
										angle: -45,
										textAnchor: "end",
										label: {
											value: "Die Index",
											position: "insideBottom",
											offset: -30,
											style: {
												fill: "currentColor",
												fontSize: 12
											}
										}
									}),
									/* @__PURE__ */ jsx(YAxis, {
										tick: { fontSize: 11 },
										label: {
											value: "Defect Count",
											angle: -90,
											position: "insideLeft",
											offset: -5,
											style: {
												fill: "currentColor",
												fontSize: 12
											}
										}
									}),
									/* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(BarTooltip, { labelKey: "Die" }) }),
									/* @__PURE__ */ jsx(Bar, {
										dataKey: "count",
										fill: CHART_COLORS[1],
										radius: [
											2,
											2,
											0,
											0
										]
									})
								]
							})
						})
					}) : /* @__PURE__ */ jsx("div", {
						className: "flex h-72 items-center justify-center",
						children: /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted-foreground",
							children: "No die data available"
						})
					})]
				})]
			})
		]
	});
}
//#endregion
export { YieldPage as default };

//# sourceMappingURL=yield-CH8Hi-6H.js.map