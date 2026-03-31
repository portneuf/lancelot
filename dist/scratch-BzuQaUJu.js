import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { t as EmptyState } from "./EmptyState-nf8sPvBQ.js";
import { useMemo, useState } from "react";
import { Slash } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/core/services/scratch-detection.service.ts
/**
* RANSAC-based scratch (linear pattern) detection for wafer defects.
*
* Scratches appear as linear alignments of defects on the wafer surface.
* The algorithm randomly samples pairs of defects, fits a line, counts
* inliers, and keeps the best-scoring lines above a threshold.
*/ /**
* Perpendicular distance from a point to the line defined by two points.
*/ function pointToLineDistance(px, py, x1, y1, x2, y2) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
	return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / Math.sqrt(lenSq);
}
/**
* Compute angle of line in degrees [0, 180).
*/ function lineAngle(x1, y1, x2, y2) {
	let deg = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
	if (deg < 0) deg += 180;
	if (deg >= 180) deg -= 180;
	return deg;
}
/**
* Euclidean distance between two points.
*/ function dist(x1, y1, x2, y2) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	return Math.sqrt(dx * dx + dy * dy);
}
/**
* Check if two scratch lines are duplicates (similar angle and close proximity).
*/ function areDuplicates(a, b) {
	let angleDiff = Math.abs(a.angle - b.angle);
	if (angleDiff > 90) angleDiff = 180 - angleDiff;
	if (angleDiff > 10) return false;
	return dist((a.startX + a.endX) / 2, (a.startY + a.endY) / 2, (b.startX + b.endX) / 2, (b.startY + b.endY) / 2) < (a.length + b.length) / 2 * .3;
}
/**
* Detect linear defect patterns (scratches) using RANSAC.
*
* @param defects  Array of defect records with xAbs/yAbs coordinates.
* @param minInliers  Minimum defects on a line to count as a scratch (default 5).
* @param distanceThreshold  Max perpendicular distance from line in um (default 2000).
* @param iterations  Number of RANSAC iterations (default 200).
* @returns Array of detected ScratchLine objects sorted by inlier count descending.
*/ function detectScratches(defects, minInliers = 5, distanceThreshold = 2e3, iterations = 200) {
	const n = defects.length;
	if (n < 2) return [];
	const candidates = [];
	for (let iter = 0; iter < iterations; iter++) {
		const i = Math.floor(Math.random() * n);
		let j = Math.floor(Math.random() * (n - 1));
		if (j >= i) j++;
		const x1 = defects[i].xAbs;
		const y1 = defects[i].yAbs;
		const x2 = defects[j].xAbs;
		const y2 = defects[j].yAbs;
		if (dist(x1, y1, x2, y2) < 1) continue;
		const inlierIndices = [];
		for (let k = 0; k < n; k++) if (pointToLineDistance(defects[k].xAbs, defects[k].yAbs, x1, y1, x2, y2) <= distanceThreshold) inlierIndices.push(k);
		if (inlierIndices.length < minInliers) continue;
		const dx = x2 - x1;
		const dy = y2 - y1;
		const lenSq = dx * dx + dy * dy;
		let tMin = Infinity;
		let tMax = -Infinity;
		for (const idx of inlierIndices) {
			const t = ((defects[idx].xAbs - x1) * dx + (defects[idx].yAbs - y1) * dy) / lenSq;
			if (t < tMin) tMin = t;
			if (t > tMax) tMax = t;
		}
		const startX = x1 + dx * tMin;
		const startY = y1 + dy * tMin;
		const endX = x1 + dx * tMax;
		const endY = y1 + dy * tMax;
		candidates.push({
			startX,
			startY,
			endX,
			endY,
			inlierCount: inlierIndices.length,
			angle: lineAngle(startX, startY, endX, endY),
			length: dist(startX, startY, endX, endY)
		});
	}
	candidates.sort((a, b) => b.inlierCount - a.inlierCount);
	const merged = [];
	for (const candidate of candidates) {
		let isDuplicate = false;
		for (const kept of merged) if (areDuplicates(candidate, kept)) {
			isDuplicate = true;
			break;
		}
		if (!isDuplicate) merged.push(candidate);
	}
	return merged;
}
//#endregion
//#region src/features/analysis/scratch.tsx
/**
* Scratch Detection page — runs RANSAC-based linear pattern detection
* on filtered defects and displays detected scratch lines.
*/ function ScratchPage() {
	const [distanceThreshold, setDistanceThreshold] = useState(2e3);
	const [minInliers, setMinInliers] = useState(5);
	const [iterations, setIterations] = useState(200);
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const file = activeFileId ? files.get(activeFileId) : void 0;
	const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
	const activeDefects = useMemo(() => {
		if (!file) return [];
		return filteredDefectIds ? file.defects.filter((d) => filteredDefectIds.has(d.defectId)) : file.defects;
	}, [file, filteredDefectIds]);
	const scratches = useMemo(() => {
		if (activeDefects.length < 2) return [];
		return detectScratches(activeDefects, minInliers, distanceThreshold, iterations);
	}, [
		activeDefects,
		minInliers,
		distanceThreshold,
		iterations
	]);
	const extent = useMemo(() => {
		if (activeDefects.length === 0) return {
			xMin: 0,
			xMax: 1,
			yMin: 0,
			yMax: 1
		};
		let xMin = Infinity;
		let xMax = -Infinity;
		let yMin = Infinity;
		let yMax = -Infinity;
		for (const d of activeDefects) {
			if (d.xAbs < xMin) xMin = d.xAbs;
			if (d.xAbs > xMax) xMax = d.xAbs;
			if (d.yAbs < yMin) yMin = d.yAbs;
			if (d.yAbs > yMax) yMax = d.yAbs;
		}
		const pad = Math.max((xMax - xMin) * .05, (yMax - yMin) * .05, 1e3);
		return {
			xMin: xMin - pad,
			xMax: xMax + pad,
			yMin: yMin - pad,
			yMax: yMax + pad
		};
	}, [activeDefects]);
	const totalInliers = useMemo(() => scratches.reduce((sum, s) => sum + s.inlierCount, 0), [scratches]);
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: Slash,
			title: "No Data",
			description: "Open a file to run scratch detection"
		})
	});
	const svgWidth = extent.xMax - extent.xMin;
	const svgHeight = extent.yMax - extent.yMin;
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx(Slash, { className: "h-5 w-5 text-primary" }), /* @__PURE__ */ jsx("h1", {
						className: "text-sm font-semibold",
						children: "Scratch Detection (RANSAC)"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3 text-xs text-muted-foreground",
					children: [
						/* @__PURE__ */ jsxs("span", { children: [activeDefects.length.toLocaleString(), " defects"] }),
						/* @__PURE__ */ jsxs("span", {
							className: cn("rounded-md px-2 py-0.5 font-medium", scratches.length > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"),
							children: [scratches.length, " scratches detected"]
						}),
						scratches.length > 0 && /* @__PURE__ */ jsxs("span", { children: [totalInliers, " inlier defects"] })
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center gap-6 border-b border-border px-4 py-3",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "flex items-center gap-2 text-sm",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground",
								children: "Distance (um):"
							}),
							/* @__PURE__ */ jsx("input", {
								type: "range",
								min: 500,
								max: 1e4,
								step: 250,
								value: distanceThreshold,
								onChange: (e) => setDistanceThreshold(Number(e.target.value)),
								className: "w-40"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "w-16 text-right font-mono text-xs",
								children: distanceThreshold.toLocaleString()
							})
						]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "flex items-center gap-2 text-sm",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground",
								children: "Min Inliers:"
							}),
							/* @__PURE__ */ jsx("input", {
								type: "range",
								min: 3,
								max: 30,
								step: 1,
								value: minInliers,
								onChange: (e) => setMinInliers(Number(e.target.value)),
								className: "w-32"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "w-8 text-right font-mono text-xs",
								children: minInliers
							})
						]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "flex items-center gap-2 text-sm",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground",
								children: "Iterations:"
							}),
							/* @__PURE__ */ jsx("input", {
								type: "range",
								min: 50,
								max: 1e3,
								step: 50,
								value: iterations,
								onChange: (e) => setIterations(Number(e.target.value)),
								className: "w-32"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "w-12 text-right font-mono text-xs",
								children: iterations
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex min-h-0 flex-1 gap-4 p-4",
				children: [/* @__PURE__ */ jsx("div", {
					className: "min-w-0 flex-1",
					children: activeDefects.length === 0 ? /* @__PURE__ */ jsx("div", {
						className: "flex h-full items-center justify-center",
						children: /* @__PURE__ */ jsx(EmptyState, {
							icon: Slash,
							title: "No Defects",
							description: "No defects match the current filters"
						})
					}) : /* @__PURE__ */ jsx("div", {
						className: "flex h-full items-center justify-center",
						children: /* @__PURE__ */ jsxs("svg", {
							viewBox: `${extent.xMin} ${extent.yMin} ${svgWidth} ${svgHeight}`,
							className: "h-full max-h-[700px] w-full max-w-[700px] rounded-md border border-border bg-background",
							preserveAspectRatio: "xMidYMid meet",
							children: [activeDefects.map((d) => /* @__PURE__ */ jsx("circle", {
								cx: d.xAbs,
								cy: d.yAbs,
								r: Math.max(svgWidth, svgHeight) * .004,
								className: "fill-muted-foreground/40"
							}, d.defectId)), scratches.map((s, i) => /* @__PURE__ */ jsx("line", {
								x1: s.startX,
								y1: s.startY,
								x2: s.endX,
								y2: s.endY,
								stroke: "#dc2626",
								strokeWidth: Math.max(svgWidth, svgHeight) * .004,
								strokeLinecap: "round",
								opacity: .8
							}, i))]
						})
					})
				}), scratches.length > 0 && /* @__PURE__ */ jsx("div", {
					className: "w-80 shrink-0 overflow-auto rounded-md border border-border",
					children: /* @__PURE__ */ jsxs("table", {
						className: "w-full text-xs",
						children: [/* @__PURE__ */ jsx("thead", {
							className: "sticky top-0 bg-muted",
							children: /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-left font-medium",
									children: "#"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-right font-medium",
									children: "Inliers"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-right font-medium",
									children: "Angle"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-3 py-2 text-right font-medium",
									children: "Length (um)"
								})
							] })
						}), /* @__PURE__ */ jsx("tbody", { children: scratches.map((s, i) => /* @__PURE__ */ jsxs("tr", {
							className: "border-t border-border hover:bg-muted/50",
							children: [
								/* @__PURE__ */ jsx("td", {
									className: "px-3 py-1.5",
									children: i + 1
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-3 py-1.5 text-right",
									children: s.inlierCount
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-3 py-1.5 text-right font-mono",
									children: s.angle.toFixed(1)
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-3 py-1.5 text-right font-mono",
									children: Math.round(s.length).toLocaleString()
								})
							]
						}, i)) })]
					})
				})]
			})
		]
	});
}
//#endregion
export { ScratchPage as default };

//# sourceMappingURL=scratch-BzuQaUJu.js.map