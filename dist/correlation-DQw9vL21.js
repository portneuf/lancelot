import { n as readField, t as useFilteredDefects } from "./useFilteredDefects-BmOCESYD.js";
import { t as useTranslation } from "./useTranslation-BwMUUKr-.js";
import { t as EmptyState } from "./EmptyState-ELtzSX51.js";
import { useMemo, useState } from "react";
import { ScatterChart } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart as ScatterChart$1, Tooltip, XAxis, YAxis } from "recharts";
//#region src/features/analysis/correlation.tsx
/** Available numeric columns for axis selection. */ var AXIS_OPTIONS = [
	{
		key: "xAbs",
		label: "X Abs (um)"
	},
	{
		key: "yAbs",
		label: "Y Abs (um)"
	},
	{
		key: "xRel",
		label: "X Rel (um)"
	},
	{
		key: "yRel",
		label: "Y Rel (um)"
	},
	{
		key: "size",
		label: "Size (um)"
	},
	{
		key: "xIndex",
		label: "Die X"
	},
	{
		key: "yIndex",
		label: "Die Y"
	},
	{
		key: "defectId",
		label: "Defect ID"
	},
	{
		key: "classNumber",
		label: "Class"
	}
];
function pearsonR(data) {
	const n = data.length;
	if (n < 2) return 0;
	let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
	for (const p of data) {
		sumX += p.x;
		sumY += p.y;
		sumXY += p.x * p.y;
		sumX2 += p.x * p.x;
		sumY2 += p.y * p.y;
	}
	const num = n * sumXY - sumX * sumY;
	const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
	return den === 0 ? 0 : num / den;
}
function linearRegression(data) {
	const n = data.length;
	if (n < 2) return null;
	let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
	for (const p of data) {
		sumX += p.x;
		sumY += p.y;
		sumXY += p.x * p.y;
		sumX2 += p.x * p.x;
	}
	const den = n * sumX2 - sumX * sumX;
	if (den === 0) return null;
	const slope = (n * sumXY - sumX * sumY) / den;
	return {
		slope,
		intercept: (sumY - slope * sumX) / n
	};
}
function CorrelationPage() {
	const { file, filteredDefects } = useFilteredDefects();
	const [xKey, setXKey] = useState("size");
	const [yKey, setYKey] = useState("xAbs");
	const [showRegression, setShowRegression] = useState(true);
	const { t } = useTranslation();
	const axisOptions = useMemo(() => {
		if (!file) return AXIS_OPTIONS;
		const extraKeys = new Set(AXIS_OPTIONS.map((o) => o.key));
		const extras = file.defectSchema.filter((s) => (s.type === "int32" || s.type === "float") && !extraKeys.has(s.name) && !extraKeys.has(s.name.toLowerCase())).map((s) => ({
			key: s.name,
			label: s.name
		}));
		return [...AXIS_OPTIONS, ...extras];
	}, [file]);
	const data = useMemo(() => {
		return filteredDefects.map((d) => {
			const x = readField(d, xKey);
			const y = readField(d, yKey);
			if (typeof x !== "number" || typeof y !== "number") return null;
			return {
				x,
				y,
				id: d.defectId
			};
		}).filter((p) => p !== null).slice(0, 1e4);
	}, [
		filteredDefects,
		xKey,
		yKey
	]);
	const r = useMemo(() => pearsonR(data), [data]);
	const regression = useMemo(() => showRegression ? linearRegression(data) : null, [data, showRegression]);
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: ScatterChart,
			title: t("common.noData"),
			description: t("correlation.openFileToView")
		})
	});
	const xLabel = axisOptions.find((o) => o.key === xKey)?.label ?? xKey;
	const yLabel = axisOptions.find((o) => o.key === yKey)?.label ?? yKey;
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-center gap-4 border-b border-border bg-muted/50 px-4 py-2",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 text-xs",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "font-medium text-muted-foreground",
						children: [t("correlation.xAxis"), ":"]
					}), /* @__PURE__ */ jsx("select", {
						value: xKey,
						onChange: (e) => setXKey(e.target.value),
						className: "rounded border border-border bg-background px-2 py-1 text-xs",
						children: axisOptions.map((o) => /* @__PURE__ */ jsx("option", {
							value: o.key,
							children: o.label
						}, o.key))
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 text-xs",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "font-medium text-muted-foreground",
						children: [t("correlation.yAxis"), ":"]
					}), /* @__PURE__ */ jsx("select", {
						value: yKey,
						onChange: (e) => setYKey(e.target.value),
						className: "rounded border border-border bg-background px-2 py-1 text-xs",
						children: axisOptions.map((o) => /* @__PURE__ */ jsx("option", {
							value: o.key,
							children: o.label
						}, o.key))
					})]
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "flex items-center gap-1.5 text-xs",
					children: [/* @__PURE__ */ jsx("input", {
						type: "checkbox",
						checked: showRegression,
						onChange: (e) => setShowRegression(e.target.checked),
						className: "rounded"
					}), t("correlation.regressionLine")]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "ml-auto flex items-center gap-3 text-xs text-muted-foreground",
					children: [/* @__PURE__ */ jsxs("span", { children: ["Pearson r = ", /* @__PURE__ */ jsx("span", {
						className: "font-semibold tabular-nums text-foreground",
						children: r.toFixed(4)
					})] }), /* @__PURE__ */ jsxs("span", { children: [data.length.toLocaleString(), " points"] })]
				})
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "flex-1 p-4",
			children: /* @__PURE__ */ jsx(ResponsiveContainer, {
				width: "100%",
				height: "100%",
				children: /* @__PURE__ */ jsxs(ScatterChart$1, {
					margin: {
						top: 20,
						right: 20,
						bottom: 40,
						left: 60
					},
					children: [
						/* @__PURE__ */ jsx(CartesianGrid, {
							strokeDasharray: "3 3",
							className: "opacity-30"
						}),
						/* @__PURE__ */ jsx(XAxis, {
							dataKey: "x",
							type: "number",
							name: xLabel,
							tick: { fontSize: 10 },
							label: {
								value: xLabel,
								position: "insideBottom",
								offset: -10,
								style: { fontSize: 11 }
							}
						}),
						/* @__PURE__ */ jsx(YAxis, {
							dataKey: "y",
							type: "number",
							name: yLabel,
							tick: { fontSize: 10 },
							label: {
								value: yLabel,
								angle: -90,
								position: "insideLeft",
								style: { fontSize: 11 }
							}
						}),
						/* @__PURE__ */ jsx(Tooltip, { content: ({ active, payload }) => {
							if (!active || !payload?.[0]) return null;
							const p = payload[0].payload;
							return /* @__PURE__ */ jsxs("div", {
								className: "rounded border border-border bg-popover px-2 py-1 text-xs shadow",
								children: [
									/* @__PURE__ */ jsxs("p", { children: ["ID: ", p.id] }),
									/* @__PURE__ */ jsxs("p", { children: [
										xLabel,
										": ",
										p.x.toLocaleString()
									] }),
									/* @__PURE__ */ jsxs("p", { children: [
										yLabel,
										": ",
										p.y.toLocaleString()
									] })
								]
							});
						} }),
						/* @__PURE__ */ jsx(Scatter, {
							data,
							fill: "#2563eb",
							fillOpacity: .5,
							r: 2
						}),
						regression && data.length > 0 && (() => {
							const xs = data.map((d) => d.x);
							const minX = Math.min(...xs), maxX = Math.max(...xs);
							return /* @__PURE__ */ jsx(ReferenceLine, {
								segment: [{
									x: minX,
									y: regression.intercept + regression.slope * minX
								}, {
									x: maxX,
									y: regression.intercept + regression.slope * maxX
								}],
								stroke: "#dc2626",
								strokeWidth: 2,
								strokeDasharray: "6 3"
							});
						})()
					]
				})
			})
		})]
	});
}
//#endregion
export { CorrelationPage as default };

//# sourceMappingURL=correlation-DQw9vL21.js.map