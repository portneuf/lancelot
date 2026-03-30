import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { t as EmptyState } from "./EmptyState-CE6ptWfj.js";
import { useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart as ScatterChart$1, Tooltip, XAxis, YAxis } from "recharts";
//#region src/core/services/cluster-detection.service.ts
/**
* DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
*
* Groups spatially proximate defects into clusters based on neighborhood
* density. Points that don't belong to any dense region are labelled noise (-1).
*/ /**
* Compute Euclidean distance between two defects using their absolute positions.
*/ function distance(a, b) {
	const dx = a.xAbs - b.xAbs;
	const dy = a.yAbs - b.yAbs;
	return Math.sqrt(dx * dx + dy * dy);
}
/**
* Find all neighbor indices within `epsilon` of defect at `pointIdx`.
* Simple O(n) scan per query — acceptable for typical wafer defect counts.
*/ function regionQuery(defects, pointIdx, epsilon) {
	const neighbors = [];
	const point = defects[pointIdx];
	for (let i = 0; i < defects.length; i++) if (distance(point, defects[i]) <= epsilon) neighbors.push(i);
	return neighbors;
}
/**
* DBSCAN: density-based spatial clustering of defect positions.
*
* @param defects  Array of defect records with xAbs/yAbs coordinates.
* @param epsilon  Neighborhood radius in micrometers (default 5000).
* @param minPoints  Minimum points to form a dense region (default 3).
* @returns ClusterResult with labels, cluster count, and cluster membership map.
*/ function dbscan(defects, epsilon = 5e3, minPoints = 3) {
	const n = defects.length;
	const labels = new Array(n).fill(-1);
	const visited = new Uint8Array(n);
	let currentCluster = -1;
	for (let i = 0; i < n; i++) {
		if (visited[i]) continue;
		visited[i] = 1;
		const neighbors = regionQuery(defects, i, epsilon);
		if (neighbors.length < minPoints) continue;
		currentCluster++;
		labels[i] = currentCluster;
		const queue = [...neighbors];
		let qIdx = 0;
		while (qIdx < queue.length) {
			const j = queue[qIdx++];
			if (!visited[j]) {
				visited[j] = 1;
				const jNeighbors = regionQuery(defects, j, epsilon);
				if (jNeighbors.length >= minPoints) {
					for (const k of jNeighbors) if (!visited[k]) queue.push(k);
				}
			}
			if (labels[j] === -1) labels[j] = currentCluster;
		}
	}
	const clusters = /* @__PURE__ */ new Map();
	for (let i = 0; i < n; i++) {
		if (labels[i] === -1) continue;
		const existing = clusters.get(labels[i]);
		if (existing) existing.push(i);
		else clusters.set(labels[i], [i]);
	}
	return {
		labels,
		clusterCount: currentCluster + 1,
		clusters
	};
}
//#endregion
//#region src/features/analysis/cluster.tsx
/**
* Cluster Analysis page — runs DBSCAN on filtered defects and visualises
* the resulting clusters as a colour-coded scatter plot.
*/ var CLUSTER_COLORS = [
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
var NOISE_COLOR = "#94a3b8";
function buildSummaries(result, points) {
	const summaries = [];
	for (const [id, indices] of result.clusters) {
		let sumX = 0;
		let sumY = 0;
		for (const idx of indices) {
			sumX += points[idx].x;
			sumY += points[idx].y;
		}
		summaries.push({
			id,
			size: indices.length,
			centroidX: Math.round(sumX / indices.length * 100) / 100,
			centroidY: Math.round(sumY / indices.length * 100) / 100
		});
	}
	summaries.sort((a, b) => b.size - a.size);
	return summaries;
}
function ClusterPage() {
	const [epsilon, setEpsilon] = useState(5e3);
	const [minPoints, setMinPoints] = useState(3);
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const file = activeFileId ? files.get(activeFileId) : void 0;
	const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
	const activeDefects = useMemo(() => {
		if (!file) return [];
		return filteredDefectIds ? file.defects.filter((d) => filteredDefectIds.has(d.defectId)) : file.defects;
	}, [file, filteredDefectIds]);
	const result = useMemo(() => {
		if (activeDefects.length === 0) return null;
		return dbscan(activeDefects, epsilon, minPoints);
	}, [
		activeDefects,
		epsilon,
		minPoints
	]);
	const points = useMemo(() => {
		return activeDefects.map((d, i) => ({
			x: d.xAbs,
			y: d.yAbs,
			defectId: d.defectId,
			cluster: result ? result.labels[i] : -1
		}));
	}, [activeDefects, result]);
	const noiseCount = useMemo(() => {
		if (!result) return 0;
		return result.labels.filter((l) => l === -1).length;
	}, [result]);
	const largestCluster = useMemo(() => {
		if (!result || result.clusters.size === 0) return 0;
		let max = 0;
		for (const indices of result.clusters.values()) if (indices.length > max) max = indices.length;
		return max;
	}, [result]);
	const summaries = useMemo(() => {
		if (!result) return [];
		return buildSummaries(result, points);
	}, [result, points]);
	const seriesMap = useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (const p of points) {
			const key = p.cluster === -1 ? "Noise" : `Cluster ${p.cluster}`;
			const arr = map.get(key);
			if (arr) arr.push(p);
			else map.set(key, [p]);
		}
		return map;
	}, [points]);
	const seriesNames = useMemo(() => Array.from(seriesMap.keys()), [seriesMap]);
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: GitBranch,
			title: "No Data",
			description: "Open a file to run cluster analysis"
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx(GitBranch, { className: "h-5 w-5 text-primary" }), /* @__PURE__ */ jsx("h1", {
						className: "text-sm font-semibold",
						children: "DBSCAN Cluster Analysis"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3 text-xs text-muted-foreground",
					children: [/* @__PURE__ */ jsxs("span", { children: [activeDefects.length.toLocaleString(), " defects"] }), result && /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsxs("span", {
							className: cn("rounded-md px-2 py-0.5 font-medium", "bg-primary/10 text-primary"),
							children: [result.clusterCount, " clusters"]
						}),
						/* @__PURE__ */ jsxs("span", { children: [noiseCount.toLocaleString(), " noise"] }),
						/* @__PURE__ */ jsxs("span", { children: ["Largest: ", largestCluster] })
					] })]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center gap-6 border-b border-border px-4 py-3",
				children: [/* @__PURE__ */ jsxs("label", {
					className: "flex items-center gap-2 text-sm",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "text-muted-foreground",
							children: "Epsilon (um):"
						}),
						/* @__PURE__ */ jsx("input", {
							type: "range",
							min: 1e3,
							max: 2e4,
							step: 500,
							value: epsilon,
							onChange: (e) => setEpsilon(Number(e.target.value)),
							className: "w-40"
						}),
						/* @__PURE__ */ jsx("span", {
							className: "w-16 text-right font-mono text-xs",
							children: epsilon.toLocaleString()
						})
					]
				}), /* @__PURE__ */ jsxs("label", {
					className: "flex items-center gap-2 text-sm",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "text-muted-foreground",
							children: "Min Points:"
						}),
						/* @__PURE__ */ jsx("input", {
							type: "range",
							min: 2,
							max: 20,
							step: 1,
							value: minPoints,
							onChange: (e) => setMinPoints(Number(e.target.value)),
							className: "w-32"
						}),
						/* @__PURE__ */ jsx("span", {
							className: "w-8 text-right font-mono text-xs",
							children: minPoints
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex min-h-0 flex-1 gap-4 p-4",
				children: [/* @__PURE__ */ jsx("div", {
					className: "min-w-0 flex-1",
					children: activeDefects.length === 0 ? /* @__PURE__ */ jsx("div", {
						className: "flex h-full items-center justify-center",
						children: /* @__PURE__ */ jsx(EmptyState, {
							icon: GitBranch,
							title: "No Defects",
							description: "No defects match the current filters"
						})
					}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
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
									content: ({ active, payload }) => {
										if (!active || !payload?.[0]) return null;
										const data = payload[0].payload;
										return /* @__PURE__ */ jsxs("div", {
											className: "rounded-md border bg-popover px-3 py-2 text-sm shadow-md",
											children: [
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
												/* @__PURE__ */ jsx("p", {
													className: "text-muted-foreground",
													children: data.cluster === -1 ? "Noise" : `Cluster ${data.cluster}`
												})
											]
										});
									},
									cursor: { strokeDasharray: "3 3" }
								}),
								/* @__PURE__ */ jsx(Legend, {
									verticalAlign: "top",
									height: 36
								}),
								seriesNames.map((name) => {
									const isNoise = name === "Noise";
									const clusterIdx = isNoise ? -1 : Number(name.replace("Cluster ", ""));
									const color = isNoise ? NOISE_COLOR : CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
									return /* @__PURE__ */ jsx(Scatter, {
										name,
										data: seriesMap.get(name) ?? [],
										fill: color,
										opacity: isNoise ? .35 : .8
									}, name);
								})
							]
						})
					})
				}), summaries.length > 0 && /* @__PURE__ */ jsx("div", {
					className: "w-72 shrink-0 overflow-auto rounded-md border border-border",
					children: /* @__PURE__ */ jsxs("table", {
						className: "w-full text-xs",
						children: [/* @__PURE__ */ jsx("thead", {
							className: "sticky top-0 bg-muted",
							children: /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-left font-medium",
									children: "Cluster"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-right font-medium",
									children: "Size"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-right font-medium",
									children: "Centroid X"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-right font-medium",
									children: "Centroid Y"
								})
							] })
						}), /* @__PURE__ */ jsx("tbody", { children: summaries.map((s) => /* @__PURE__ */ jsxs("tr", {
							className: "border-t border-border hover:bg-muted/50",
							children: [
								/* @__PURE__ */ jsx("td", {
									className: "px-3 py-1.5",
									children: /* @__PURE__ */ jsxs("span", {
										className: "flex items-center gap-1.5",
										children: [/* @__PURE__ */ jsx("span", {
											className: "inline-block h-2.5 w-2.5 rounded-full",
											style: { backgroundColor: CLUSTER_COLORS[s.id % CLUSTER_COLORS.length] }
										}), s.id]
									})
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-3 py-1.5 text-right",
									children: s.size
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-3 py-1.5 text-right font-mono",
									children: s.centroidX.toFixed(0)
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-3 py-1.5 text-right font-mono",
									children: s.centroidY.toFixed(0)
								})
							]
						}, s.id)) })]
					})
				})]
			})
		]
	});
}
//#endregion
export { ClusterPage as default };

//# sourceMappingURL=cluster-B8wVJppM.js.map