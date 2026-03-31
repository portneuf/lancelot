import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFilteredDefects } from "./useFilteredDefects-TnH5LHGk.js";
import { t as EmptyState } from "./EmptyState-nf8sPvBQ.js";
import { useCallback, useMemo, useState } from "react";
import { Brain } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
//#region src/core/services/defect-classifier.service.ts
/**
* Rule-based automatic defect classification service.
*
* Applies a configurable set of classification rules to defect records,
* suggesting class labels based on geometric and spatial properties.
* Rules are evaluated in priority order (highest first); the first
* matching rule wins for each defect.
*/ /**
* Compute the Euclidean distance from a defect's absolute position to a
* reference center point.
*/ function distanceFromCenter(defect, center) {
	const dx = defect.xAbs - center[0];
	const dy = defect.yAbs - center[1];
	return Math.sqrt(dx * dx + dy * dy);
}
/**
* Build the set of default classification rules.
*
* Rules that depend on wafer geometry (edge / center distance) are
* parameterised via closures so they capture the correct radius.
*/ function buildDefaultRules(waferRadius, sampleCenter) {
	return [
		{
			name: "Large Particle",
			description: "Defect size exceeds 200 um",
			condition: (d) => (d.size ?? 0) > 200,
			suggestedClass: "Particle",
			priority: 100
		},
		{
			name: "Edge Defect",
			description: "Defect is located beyond 80% of wafer radius from center",
			condition: (d) => distanceFromCenter(d, sampleCenter) > waferRadius * .8,
			suggestedClass: "Edge Defect",
			priority: 90
		},
		{
			name: "Cluster Member",
			description: "Defect has an assigned cluster number",
			condition: (d) => d.clusterNumber != null && d.clusterNumber > 0,
			suggestedClass: "Cluster Defect",
			priority: 80
		},
		{
			name: "Scratch Candidate",
			description: "Aspect ratio (XSIZE/YSIZE) exceeds 3:1 or is below 1:3",
			condition: (d) => {
				const xSize = Number(d.extra["XSIZE"] ?? d.extra["xSize"] ?? 0);
				const ySize = Number(d.extra["YSIZE"] ?? d.extra["ySize"] ?? 0);
				if (xSize <= 0 || ySize <= 0) return false;
				const ratio = xSize / ySize;
				return ratio > 3 || ratio < .33;
			},
			suggestedClass: "Scratch",
			priority: 70
		},
		{
			name: "Micro Defect",
			description: "Defect size is below 10 um",
			condition: (d) => d.size != null && d.size > 0 && d.size < 10,
			suggestedClass: "Micro-scratch",
			priority: 60
		},
		{
			name: "Central Defect",
			description: "Defect is located within 20% of wafer radius from center",
			condition: (d) => distanceFromCenter(d, sampleCenter) < waferRadius * .2,
			suggestedClass: "Pattern Defect",
			priority: 50
		}
	];
}
/** Confidence lookup keyed by rule name. */ var CONFIDENCE_MAP = {
	"Large Particle": .8,
	"Micro Defect": .6,
	"Edge Defect": .7,
	"Cluster Member": .7,
	"Scratch Candidate": .6,
	"Central Defect": .5
};
/**
* Default set of built-in classification rules.
*
* These are constructed with a nominal 300 mm wafer (150 000 um radius)
* centred at the origin. Call `classifyDefects` with actual geometry for
* accurate spatial rules.
*/ var DEFAULT_RULES = buildDefaultRules(15e4, [0, 0]);
/**
* Classify an array of defects using the provided (or default) rules.
*
* Each defect is tested against rules sorted by descending priority.
* The first matching rule produces a `ClassificationResult` for that defect.
* Defects that match no rule are omitted from the result array.
*
* @param defects        Array of defect records to classify.
* @param waferDiameter  Wafer diameter in micrometers.
* @param sampleCenter   [x, y] centre of the wafer in micrometers.
* @param rules          Optional custom rule set; defaults to built-in rules
*                       parameterised with the supplied geometry.
* @returns              Array of classification results, one per matched defect.
*/ function classifyDefects(defects, waferDiameter, sampleCenter, rules) {
	const waferRadius = waferDiameter / 2;
	const sorted = [...rules ?? buildDefaultRules(waferRadius, sampleCenter)].sort((a, b) => b.priority - a.priority);
	const results = [];
	for (const defect of defects) for (const rule of sorted) if (rule.condition(defect)) {
		results.push({
			defectId: defect.defectId,
			currentClass: defect.classNumber,
			suggestedClass: rule.suggestedClass,
			ruleName: rule.name,
			confidence: CONFIDENCE_MAP[rule.name] ?? .5
		});
		break;
	}
	return results;
}
//#endregion
//#region src/features/analysis/classifier.tsx
/**
* Classifier Analysis page — applies rule-based classification to filtered
* defects and visualises the results as a table with a pie chart summary.
*/ var PIE_COLORS = [
	"#2563eb",
	"#dc2626",
	"#16a34a",
	"#ca8a04",
	"#9333ea",
	"#0891b2",
	"#e11d48",
	"#65a30d",
	"#6d28d9",
	"#059669",
	"#d97706",
	"#4f46e5",
	"#be123c",
	"#0d9488",
	"#c026d3",
	"#ea580c"
];
var numberFormatter = new Intl.NumberFormat();
function buildPieData(results) {
	const counts = /* @__PURE__ */ new Map();
	for (const r of results) counts.set(r.suggestedClass, (counts.get(r.suggestedClass) ?? 0) + 1);
	return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({
		name,
		value,
		color: PIE_COLORS[i % PIE_COLORS.length]
	}));
}
function confidenceColor(confidence) {
	if (confidence > .7) return "text-green-600 dark:text-green-400";
	if (confidence >= .5) return "text-yellow-600 dark:text-yellow-400";
	return "text-red-600 dark:text-red-400";
}
function confidenceBg(confidence) {
	if (confidence > .7) return "bg-green-500/10";
	if (confidence >= .5) return "bg-yellow-500/10";
	return "bg-red-500/10";
}
function resolveClassName(classNumber, classLookup) {
	if (classNumber == null) return "Unclassified";
	const entry = classLookup.find((c) => c.classNumber === classNumber);
	return entry ? entry.className : `Class ${classNumber}`;
}
function ClassifierPage() {
	const { file, filteredDefects, filteredCount, isFiltered } = useFilteredDefects();
	const [disabledRules, setDisabledRules] = useState(/* @__PURE__ */ new Set());
	const toggleRule = useCallback((ruleName) => {
		setDisabledRules((prev) => {
			const next = new Set(prev);
			if (next.has(ruleName)) next.delete(ruleName);
			else next.add(ruleName);
			return next;
		});
	}, []);
	const results = useMemo(() => {
		if (!file || filteredDefects.length === 0) return [];
		const { waferDiameter, sampleCenterLocation } = file.waferGeometry;
		const enabledRules = DEFAULT_RULES.filter((r) => !disabledRules.has(r.name));
		return classifyDefects(filteredDefects, waferDiameter, sampleCenterLocation, enabledRules.length > 0 ? enabledRules : void 0);
	}, [
		file,
		filteredDefects,
		disabledRules
	]);
	const reclassifiedCount = useMemo(() => {
		if (!file) return 0;
		return results.filter((r) => {
			return resolveClassName(r.currentClass, file.classLookup) !== r.suggestedClass;
		}).length;
	}, [results, file]);
	const pieData = useMemo(() => buildPieData(results), [results]);
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: Brain,
			title: "No Data",
			description: "Open a file to run defect classification"
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx(Brain, { className: "h-5 w-5 text-primary" }), /* @__PURE__ */ jsx("h1", {
						className: "text-sm font-semibold",
						children: "Rule-Based Defect Classifier"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3 text-xs text-muted-foreground",
					children: [
						/* @__PURE__ */ jsxs("span", { children: [
							numberFormatter.format(filteredCount),
							" defect",
							filteredCount !== 1 ? "s" : "",
							isFiltered ? " (filtered)" : ""
						] }),
						/* @__PURE__ */ jsxs("span", {
							className: cn("rounded-md px-2 py-0.5 font-medium", "bg-primary/10 text-primary"),
							children: [numberFormatter.format(results.length), " classified"]
						}),
						/* @__PURE__ */ jsxs("span", {
							className: cn("rounded-md px-2 py-0.5 font-medium", reclassifiedCount > 0 ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : "bg-green-500/10 text-green-700 dark:text-green-400"),
							children: [numberFormatter.format(reclassifiedCount), " would be reclassified"]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center gap-3 border-b border-border px-4 py-3",
				children: [/* @__PURE__ */ jsx("span", {
					className: "text-xs font-medium text-muted-foreground",
					children: "Rules:"
				}), DEFAULT_RULES.map((rule) => {
					const enabled = !disabledRules.has(rule.name);
					return /* @__PURE__ */ jsx("button", {
						onClick: () => toggleRule(rule.name),
						title: rule.description,
						className: cn("rounded-md border px-2.5 py-1 text-xs font-medium transition-colors", enabled ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground line-through"),
						children: rule.name
					}, rule.name);
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex min-h-0 flex-1 gap-0",
				children: [/* @__PURE__ */ jsx("div", {
					className: "min-w-0 flex-1 overflow-auto",
					children: results.length === 0 ? /* @__PURE__ */ jsx("div", {
						className: "flex h-full items-center justify-center",
						children: /* @__PURE__ */ jsx(EmptyState, {
							icon: Brain,
							title: "No Matches",
							description: "No defects matched the active classification rules"
						})
					}) : /* @__PURE__ */ jsxs("table", {
						className: "w-full text-xs",
						children: [/* @__PURE__ */ jsx("thead", {
							className: "sticky top-0 z-10 bg-muted",
							children: /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-left font-medium",
									children: "Defect ID"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-left font-medium",
									children: "Current Class"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-left font-medium",
									children: "Suggested Class"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-left font-medium",
									children: "Rule"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-right font-medium",
									children: "Confidence"
								})
							] })
						}), /* @__PURE__ */ jsx("tbody", { children: results.map((r) => {
							const currentName = resolveClassName(r.currentClass, file.classLookup);
							return /* @__PURE__ */ jsxs("tr", {
								className: cn("border-t border-border transition-colors hover:bg-muted/50", currentName !== r.suggestedClass && "bg-yellow-500/5"),
								children: [
									/* @__PURE__ */ jsx("td", {
										className: "px-3 py-1.5 font-mono",
										children: r.defectId
									}),
									/* @__PURE__ */ jsx("td", {
										className: "px-3 py-1.5",
										children: currentName
									}),
									/* @__PURE__ */ jsx("td", {
										className: "px-3 py-1.5 font-medium",
										children: r.suggestedClass
									}),
									/* @__PURE__ */ jsx("td", {
										className: "px-3 py-1.5 text-muted-foreground",
										children: r.ruleName
									}),
									/* @__PURE__ */ jsx("td", {
										className: "px-3 py-1.5 text-right",
										children: /* @__PURE__ */ jsxs("span", {
											className: cn("inline-block rounded px-1.5 py-0.5 font-mono font-medium", confidenceColor(r.confidence), confidenceBg(r.confidence)),
											children: [(r.confidence * 100).toFixed(0), "%"]
										})
									})
								]
							}, r.defectId);
						}) })]
					})
				}), pieData.length > 0 && /* @__PURE__ */ jsxs("div", {
					className: "flex w-80 shrink-0 flex-col border-l border-border",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "border-b border-border px-4 py-2",
							children: /* @__PURE__ */ jsx("h2", {
								className: "text-xs font-semibold text-muted-foreground",
								children: "Suggested Class Distribution"
							})
						}),
						/* @__PURE__ */ jsx("div", {
							className: "flex-1 p-2",
							children: /* @__PURE__ */ jsx(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ jsxs(PieChart, { children: [
									/* @__PURE__ */ jsx(Pie, {
										data: pieData,
										dataKey: "value",
										nameKey: "name",
										cx: "50%",
										cy: "50%",
										outerRadius: "70%",
										innerRadius: "40%",
										paddingAngle: 2,
										label: false,
										labelLine: { strokeWidth: 1 },
										children: pieData.map((entry) => /* @__PURE__ */ jsx(Cell, { fill: entry.color }, entry.name))
									}),
									/* @__PURE__ */ jsx(Tooltip, { content: ({ active, payload }) => {
										if (!active || !payload?.[0]) return null;
										const data = payload[0].payload;
										return /* @__PURE__ */ jsxs("div", {
											className: "rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md",
											children: [/* @__PURE__ */ jsx("p", {
												className: "font-semibold",
												children: data.name
											}), /* @__PURE__ */ jsxs("p", { children: ["Count: ", numberFormatter.format(data.value)] })]
										});
									} }),
									/* @__PURE__ */ jsx(Legend, {
										verticalAlign: "bottom",
										iconType: "circle",
										iconSize: 8,
										wrapperStyle: { fontSize: 11 }
									})
								] })
							})
						}),
						/* @__PURE__ */ jsx("div", {
							className: "border-t border-border",
							children: /* @__PURE__ */ jsxs("table", {
								className: "w-full text-xs",
								children: [/* @__PURE__ */ jsx("thead", {
									className: "bg-muted",
									children: /* @__PURE__ */ jsxs("tr", { children: [
										/* @__PURE__ */ jsx("th", {
											className: "px-3 py-1.5 text-left font-medium",
											children: "Class"
										}),
										/* @__PURE__ */ jsx("th", {
											className: "px-3 py-1.5 text-right font-medium",
											children: "Count"
										}),
										/* @__PURE__ */ jsx("th", {
											className: "px-3 py-1.5 text-right font-medium",
											children: "%"
										})
									] })
								}), /* @__PURE__ */ jsx("tbody", { children: pieData.map((entry) => /* @__PURE__ */ jsxs("tr", {
									className: "border-t border-border hover:bg-muted/50",
									children: [
										/* @__PURE__ */ jsx("td", {
											className: "px-3 py-1",
											children: /* @__PURE__ */ jsxs("span", {
												className: "flex items-center gap-1.5",
												children: [/* @__PURE__ */ jsx("span", {
													className: "inline-block h-2.5 w-2.5 rounded-full",
													style: { backgroundColor: entry.color }
												}), entry.name]
											})
										}),
										/* @__PURE__ */ jsx("td", {
											className: "px-3 py-1 text-right font-mono",
											children: numberFormatter.format(entry.value)
										}),
										/* @__PURE__ */ jsxs("td", {
											className: "px-3 py-1 text-right font-mono",
											children: [results.length > 0 ? (entry.value / results.length * 100).toFixed(1) : "0.0", "%"]
										})
									]
								}, entry.name)) })]
							})
						})
					]
				})]
			})
		]
	});
}
//#endregion
export { ClassifierPage as default };

//# sourceMappingURL=classifier-D-upmVY8.js.map