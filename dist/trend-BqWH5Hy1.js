import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useTranslation } from "./useTranslation-BwMUUKr-.js";
import { t as EmptyState } from "./EmptyState-ELtzSX51.js";
import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CartesianGrid, Legend, Line, LineChart as LineChart$1, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
//#region src/features/analysis/trend.tsx
var METRICS = [
	{
		value: "defects",
		label: "Defect Count"
	},
	{
		value: "density",
		label: "Defect Density"
	},
	{
		value: "yield",
		label: "Die Yield %"
	}
];
function computeTrendData(files, metric) {
	return [...files].sort((a, b) => {
		const ta = a.identity.fileTimestamp ?? a.identity.waferId;
		const tb = b.identity.fileTimestamp ?? b.identity.waferId;
		return ta.localeCompare(tb);
	}).map((file) => {
		let value;
		const label = file.identity.waferId || file.source.fileName;
		switch (metric) {
			case "defects":
				value = file.defects.length;
				break;
			case "density": {
				const waferAreaCm2 = Math.PI * Math.pow(file.waferGeometry.waferDiameter / 2e4, 2);
				value = waferAreaCm2 > 0 ? file.defects.length / waferAreaCm2 : 0;
				break;
			}
			case "yield": {
				const tested = file.dieMap.filter((d) => d.status === "tested");
				const clean = tested.filter((d) => d.defectCount === 0);
				value = tested.length > 0 ? clean.length / tested.length * 100 : 0;
				break;
			}
		}
		return {
			label,
			value,
			waferId: file.identity.waferId
		};
	});
}
function TrendPage() {
	const files = useFileStore((s) => s.files);
	const activeFileId = useFileStore((s) => s.activeFileId);
	const [metric, setMetric] = useState("defects");
	const { t } = useTranslation();
	const allFiles = useMemo(() => Array.from(files.values()), [files]);
	const trendData = useMemo(() => {
		if (allFiles.length === 0) return [];
		if (allFiles.length === 1) {
			const file = allFiles[0];
			return file.dieMap.filter((d) => d.status === "tested").sort((a, b) => a.xIndex * 1e3 + a.yIndex - (b.xIndex * 1e3 + b.yIndex)).map((die) => ({
				label: `(${die.xIndex},${die.yIndex})`,
				value: metric === "yield" ? die.defectCount === 0 ? 100 : 0 : die.defectCount,
				waferId: file.identity.waferId
			})).slice(0, 100);
		}
		return computeTrendData(allFiles, metric);
	}, [allFiles, metric]);
	const stats = useMemo(() => {
		if (trendData.length === 0) return null;
		const values = trendData.map((d) => d.value);
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const sigma = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
		return {
			mean,
			sigma,
			ucl: mean + 3 * sigma,
			lcl: Math.max(0, mean - 3 * sigma)
		};
	}, [trendData]);
	if (!activeFileId) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: TrendingUp,
			title: t("common.noData"),
			description: t("trend.openFileToView")
		})
	});
	const isSingleFile = allFiles.length === 1;
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-2",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-sm font-semibold",
					children: isSingleFile ? t("trend.perDieTrend") : t("trend.lotTrend")
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 text-xs",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "font-medium text-muted-foreground",
						children: [t("trend.metric"), ":"]
					}), /* @__PURE__ */ jsx("select", {
						value: metric,
						onChange: (e) => setMetric(e.target.value),
						className: "rounded border border-border bg-background px-2 py-1 text-xs",
						children: METRICS.map((m) => /* @__PURE__ */ jsx("option", {
							value: m.value,
							children: m.label
						}, m.value))
					})]
				}),
				/* @__PURE__ */ jsx("span", {
					className: "ml-auto text-xs text-muted-foreground",
					children: isSingleFile ? `${trendData.length} dies` : `${allFiles.length} wafers loaded`
				})
			]
		}), trendData.length === 0 ? /* @__PURE__ */ jsx("div", {
			className: "flex flex-1 items-center justify-center",
			children: /* @__PURE__ */ jsx(EmptyState, {
				icon: TrendingUp,
				title: t("trend.noTrendData"),
				description: t("trend.loadMultipleWafers")
			})
		}) : /* @__PURE__ */ jsx("div", {
			className: "flex-1 p-4",
			children: /* @__PURE__ */ jsx(ResponsiveContainer, {
				width: "100%",
				height: "100%",
				children: /* @__PURE__ */ jsxs(LineChart$1, {
					data: trendData,
					margin: {
						top: 20,
						right: 30,
						bottom: 40,
						left: 60
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
							height: 60,
							interval: Math.max(0, Math.floor(trendData.length / 20))
						}),
						/* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10 } }),
						/* @__PURE__ */ jsx(Tooltip, { content: ({ active, payload }) => {
							if (!active || !payload?.[0]) return null;
							const p = payload[0].payload;
							return /* @__PURE__ */ jsxs("div", {
								className: "rounded border border-border bg-popover px-2 py-1 text-xs shadow",
								children: [/* @__PURE__ */ jsx("p", {
									className: "font-semibold",
									children: p.label
								}), /* @__PURE__ */ jsxs("p", { children: [
									METRICS.find((m) => m.value === metric)?.label,
									": ",
									p.value.toFixed(2)
								] })]
							});
						} }),
						/* @__PURE__ */ jsx(Legend, {}),
						/* @__PURE__ */ jsx(Line, {
							type: "monotone",
							dataKey: "value",
							name: METRICS.find((m) => m.value === metric)?.label,
							stroke: "#2563eb",
							strokeWidth: 2,
							dot: { r: 2 }
						}),
						stats && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsx(Line, {
								type: "monotone",
								dataKey: () => stats.mean,
								name: "Mean",
								stroke: "#16a34a",
								strokeDasharray: "5 5",
								strokeWidth: 1,
								dot: false
							}),
							/* @__PURE__ */ jsx(Line, {
								type: "monotone",
								dataKey: () => stats.ucl,
								name: "UCL (3σ)",
								stroke: "#dc2626",
								strokeDasharray: "3 3",
								strokeWidth: 1,
								dot: false
							}),
							/* @__PURE__ */ jsx(Line, {
								type: "monotone",
								dataKey: () => stats.lcl,
								name: "LCL (3σ)",
								stroke: "#dc2626",
								strokeDasharray: "3 3",
								strokeWidth: 1,
								dot: false
							})
						] })
					]
				})
			})
		})]
	});
}
//#endregion
export { TrendPage as default };

//# sourceMappingURL=trend-BqWH5Hy1.js.map