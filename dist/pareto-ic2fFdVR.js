import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { t as useTranslation } from "./useTranslation-B1_W7B7C.js";
import { t as EmptyState } from "./EmptyState-nf8sPvBQ.js";
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
//#region src/features/analysis/pareto.tsx
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
function buildParetoData(defects, classLookup) {
	const counts = /* @__PURE__ */ new Map();
	for (const d of defects) if (d.classNumber != null) counts.set(d.classNumber, (counts.get(d.classNumber) ?? 0) + 1);
	const nameMap = /* @__PURE__ */ new Map();
	for (const c of classLookup) nameMap.set(c.classNumber, c.className);
	const sorted = [...counts.entries()].map(([classNum, count]) => ({
		className: nameMap.get(classNum) ?? `Class ${classNum}`,
		classNumber: classNum,
		count
	})).sort((a, b) => b.count - a.count);
	const total = defects.length || 1;
	let cumSum = 0;
	return sorted.map((entry, i) => {
		cumSum += entry.count;
		return {
			className: entry.className,
			count: entry.count,
			cumulative: Math.round(cumSum / total * 100),
			color: CHART_COLORS[i % CHART_COLORS.length]
		};
	});
}
var numberFormatter = new Intl.NumberFormat();
function ParetoPage() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const file = activeFileId ? files.get(activeFileId) : void 0;
	const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
	const { t } = useTranslation();
	const paretoData = useMemo(() => {
		if (!file) return [];
		return buildParetoData(filteredDefectIds ? file.defects.filter((d) => filteredDefectIds.has(d.defectId)) : file.defects, file.classLookup);
	}, [file, filteredDefectIds]);
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: BarChart3,
			title: t("common.noData"),
			description: t("pareto.openFileToView")
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2",
			children: [/* @__PURE__ */ jsx("h1", {
				className: "text-sm font-semibold",
				children: t("pareto.title")
			}), /* @__PURE__ */ jsxs("span", {
				className: "text-xs text-muted-foreground",
				children: [
					numberFormatter.format(file.defects.length),
					" defects across ",
					paretoData.length,
					" classes"
				]
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "flex-1 p-4",
			children: paretoData.length === 0 ? /* @__PURE__ */ jsx("div", {
				className: "flex h-full items-center justify-center",
				children: /* @__PURE__ */ jsx(EmptyState, {
					icon: BarChart3,
					title: t("pareto.noClassificationData"),
					description: t("pareto.noClassesFound")
				})
			}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
				width: "100%",
				height: "100%",
				children: /* @__PURE__ */ jsxs(ComposedChart, {
					data: paretoData,
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
							dataKey: "className",
							tick: { fontSize: 11 },
							angle: -45,
							textAnchor: "end",
							height: 80,
							interval: 0
						}),
						/* @__PURE__ */ jsx(YAxis, {
							yAxisId: "count",
							tick: { fontSize: 11 },
							label: {
								value: "Defect Count",
								angle: -90,
								position: "insideLeft",
								style: { fontSize: 11 }
							}
						}),
						/* @__PURE__ */ jsx(YAxis, {
							yAxisId: "pct",
							orientation: "right",
							domain: [0, 100],
							tick: { fontSize: 11 },
							label: {
								value: "Cumulative %",
								angle: 90,
								position: "insideRight",
								style: { fontSize: 11 }
							}
						}),
						/* @__PURE__ */ jsx(Tooltip, { content: ({ active, payload }) => {
							if (!active || !payload?.[0]) return null;
							const data = payload[0].payload;
							return /* @__PURE__ */ jsxs("div", {
								className: "rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md",
								children: [
									/* @__PURE__ */ jsx("p", {
										className: "font-semibold",
										children: data.className
									}),
									/* @__PURE__ */ jsxs("p", { children: ["Count: ", numberFormatter.format(data.count)] }),
									/* @__PURE__ */ jsxs("p", { children: [
										"Cumulative: ",
										data.cumulative,
										"%"
									] })
								]
							});
						} }),
						/* @__PURE__ */ jsx(Legend, {
							verticalAlign: "top",
							height: 30
						}),
						/* @__PURE__ */ jsx(Bar, {
							yAxisId: "count",
							dataKey: "count",
							name: "Defect Count",
							fill: "#2563eb",
							radius: [
								4,
								4,
								0,
								0
							]
						}),
						/* @__PURE__ */ jsx(Line, {
							yAxisId: "pct",
							type: "monotone",
							dataKey: "cumulative",
							name: "Cumulative %",
							stroke: "#dc2626",
							strokeWidth: 2,
							dot: {
								r: 3,
								fill: "#dc2626"
							}
						})
					]
				})
			})
		})]
	});
}
//#endregion
export { ParetoPage as default };

//# sourceMappingURL=pareto-ic2fFdVR.js.map