import { t as initializeRegistry } from "./parsers-B1gH2h1h.js";
import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { n as useLancelotNavigate, t as useFileOpen } from "./useFileOpen-OsugJbGN.js";
import { t as useTranslation } from "./useTranslation-CI4wEIPY.js";
import { Suspense, lazy, useCallback, useState } from "react";
import { FileWarning, Loader2, Upload, Wand2 } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as Dialog from "@radix-ui/react-dialog";
//#region src/core/services/klarf-generator.ts
/**
* Browser-friendly KLARF generator.
*
* Self-contained copy of the generation logic without Node/CLI dependencies.
* Used by the in-app generator dialog.
*/ var DEFAULT_CONFIG = {
	defectCount: 100,
	distribution: "random",
	waferDiameter: 3e5,
	diePitch: [1e4, 12e3],
	dieOrigin: [500, 600],
	lotId: "GEN-LOT-001",
	waferId: "W01",
	deviceId: "TEST-DEVICE",
	stepId: "ETCH1",
	slot: 1,
	seed: 42
};
var CLASS_NAMES = [
	"Particle",
	"Scratch",
	"Pit",
	"Stain",
	"Pattern Defect",
	"COP",
	"Residue",
	"Micro-scratch"
];
function mulberry32(seed) {
	let s = seed | 0;
	return () => {
		s = s + 1831565813 | 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function gaussianRandom(rand) {
	let u;
	do
		u = rand();
	while (u === 0);
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
function logNormalRandom(rand, median, sigma) {
	return Math.exp(Math.log(median) + sigma * gaussianRandom(rand));
}
function computeDieGrid(config) {
	const radius = config.waferDiameter / 2;
	const [dpx, dpy] = config.diePitch;
	const [ox, oy] = config.dieOrigin;
	const dies = [];
	for (let yi = Math.floor(-oy / dpy); yi <= Math.ceil((config.waferDiameter - oy) / dpy); yi++) for (let xi = Math.floor(-ox / dpx); xi <= Math.ceil((config.waferDiameter - ox) / dpx); xi++) {
		const dx = ox + xi * dpx + dpx / 2 - radius, dy = oy + yi * dpy + dpy / 2 - radius;
		if (dx * dx + dy * dy <= radius * radius) dies.push({
			xIndex: xi,
			yIndex: yi
		});
	}
	return dies;
}
function randomPlacement(rand, dies, config) {
	const die = dies[Math.floor(rand() * dies.length)];
	return {
		xIndex: die.xIndex,
		yIndex: die.yIndex,
		xRel: Math.floor(rand() * (config.diePitch[0] - 1)) + 1,
		yRel: Math.floor(rand() * (config.diePitch[1] - 1)) + 1
	};
}
function edgeHeavyPlacement(rand, dies, config) {
	const radius = config.waferDiameter / 2;
	const [dpx, dpy] = config.diePitch;
	const [ox, oy] = config.dieOrigin;
	const weights = [];
	let total = 0;
	for (const die of dies) {
		const dx = ox + die.xIndex * dpx + dpx / 2 - radius, dy = oy + die.yIndex * dpy + dpy / 2 - radius;
		const w = (dx * dx + dy * dy) / (radius * radius) + .01;
		weights.push(w);
		total += w;
	}
	let r = rand() * total, idx = 0;
	for (let i = 0; i < weights.length; i++) {
		r -= weights[i];
		if (r <= 0) {
			idx = i;
			break;
		}
	}
	const die = dies[idx];
	return {
		xIndex: die.xIndex,
		yIndex: die.yIndex,
		xRel: Math.floor(rand() * (config.diePitch[0] - 1)) + 1,
		yRel: Math.floor(rand() * (config.diePitch[1] - 1)) + 1
	};
}
function createClusteredPlacer(rand, dies, config) {
	const numClusters = Math.floor(rand() * 11) + 5;
	const radius = config.waferDiameter / 2;
	const [dpx, dpy] = config.diePitch;
	const [ox, oy] = config.dieOrigin;
	const centers = [];
	for (let c = 0; c < numClusters; c++) {
		let px, py;
		do {
			px = rand() * config.waferDiameter;
			py = rand() * config.waferDiameter;
		} while ((px - radius) ** 2 + (py - radius) ** 2 > radius * radius);
		centers.push({
			x: px,
			y: py,
			sigma: (rand() * 2 + 1) * Math.max(dpx, dpy)
		});
	}
	return (rng) => {
		const c = centers[Math.floor(rng() * numClusters)];
		const px = c.x + gaussianRandom(rng) * c.sigma, py = c.y + gaussianRandom(rng) * c.sigma;
		const xi = Math.floor((px - ox) / dpx), yi = Math.floor((py - oy) / dpy);
		let best = dies[0], bestD = Infinity;
		for (const d of dies) {
			const dsq = (d.xIndex - xi) ** 2 + (d.yIndex - yi) ** 2;
			if (dsq < bestD) {
				bestD = dsq;
				best = d;
			}
		}
		return {
			xIndex: best.xIndex,
			yIndex: best.yIndex,
			xRel: Math.floor(rng() * (config.diePitch[0] - 1)) + 1,
			yRel: Math.floor(rng() * (config.diePitch[1] - 1)) + 1
		};
	};
}
function generatePlacements(rand, dies, config) {
	const p = [], n = config.defectCount;
	if (config.distribution === "random") for (let i = 0; i < n; i++) p.push(randomPlacement(rand, dies, config));
	else if (config.distribution === "edge-heavy") for (let i = 0; i < n; i++) p.push(edgeHeavyPlacement(rand, dies, config));
	else if (config.distribution === "clustered") {
		const cp = createClusteredPlacer(rand, dies, config);
		for (let i = 0; i < n; i++) p.push(cp(rand));
	} else {
		const nR = Math.round(n * .4), nE = Math.round(n * .3), nC = n - nR - nE;
		for (let i = 0; i < nR; i++) p.push(randomPlacement(rand, dies, config));
		for (let i = 0; i < nE; i++) p.push(edgeHeavyPlacement(rand, dies, config));
		const cp = createClusteredPlacer(rand, dies, config);
		for (let i = 0; i < nC; i++) p.push(cp(rand));
	}
	return p;
}
function pickClassNumber(rand, classCount) {
	const weights = [];
	let total = 0;
	for (let i = 1; i <= classCount; i++) {
		const w = 1 / Math.pow(i, 1.2);
		weights.push(w);
		total += w;
	}
	let r = rand() * total;
	for (let i = 0; i < weights.length; i++) {
		r -= weights[i];
		if (r <= 0) return i + 1;
	}
	return classCount;
}
function generateDefectSize(rand) {
	const dSize = Math.max(1, Math.round(logNormalRandom(rand, 50, .8)));
	const aspect = .6 + rand() * .8;
	return {
		xSize: Math.max(1, Math.round(dSize * aspect)),
		ySize: Math.max(1, Math.round(dSize / aspect)),
		defectArea: Math.max(1, Math.round(Math.max(1, Math.round(dSize * aspect)) * Math.max(1, Math.round(dSize / aspect)) * (.6 + rand() * .4))),
		dSize
	};
}
function formatTimestamp(d) {
	return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
function generateKlarf(partial = {}) {
	const config = {
		...DEFAULT_CONFIG,
		...partial
	};
	const rand = mulberry32(config.seed);
	const dies = computeDieGrid(config);
	if (dies.length === 0) throw new Error("No dies fit within the wafer radius.");
	const placements = generatePlacements(rand, dies, config);
	const classCount = CLASS_NAMES.length;
	const rows = [];
	for (let i = 0; i < placements.length; i++) {
		const p = placements[i];
		const { xSize, ySize, defectArea, dSize } = generateDefectSize(rand);
		rows.push([
			i + 1,
			p.xRel,
			p.yRel,
			p.xIndex,
			p.yIndex,
			xSize,
			ySize,
			defectArea,
			dSize,
			pickClassNumber(rand, classCount),
			1
		]);
	}
	const tpSet = /* @__PURE__ */ new Set();
	for (const row of rows) tpSet.add(`${row[3]},${row[4]}`);
	const tp = Array.from(tpSet).map((k) => {
		const [x, y] = k.split(",").map(Number);
		return {
			x,
			y
		};
	});
	const apt = parseFloat((config.diePitch[0] * config.diePitch[1] * tp.length / 1e6).toFixed(1));
	const dens = apt > 0 ? parseFloat((config.defectCount / apt).toFixed(3)) : 0;
	const now = /* @__PURE__ */ new Date();
	const r = config.waferDiameter / 2;
	const L = [];
	L.push(`FileVersion 1 2;`);
	L.push(`FileTimestamp ${formatTimestamp(now)};`);
	L.push(`InspectionStationID "KLA" "2830" "EQ001";`);
	L.push(`SampleType WAFER;`);
	L.push(`ResultTimestamp ${formatTimestamp(/* @__PURE__ */ new Date(now.getTime() - 3e5))};`);
	L.push(`LotID "${config.lotId}";`);
	L.push(`SampleSize 1 ${config.waferDiameter};`);
	L.push(`DeviceID "${config.deviceId}";`);
	L.push(`SetupID "RECIPE_BRIGHTFIELD_01";`);
	L.push(`StepID "${config.stepId}";`);
	L.push(`WaferID "${config.waferId}";`);
	L.push(`Slot ${config.slot};`);
	L.push(`SampleOrientationMarkType NOTCH;`);
	L.push(`OrientationMarkLocation DOWN;`);
	L.push(`DiePitch ${config.diePitch[0]} ${config.diePitch[1]};`);
	L.push(`DieOrigin ${config.dieOrigin[0]} ${config.dieOrigin[1]};`);
	L.push(`SampleCenterLocation ${r} ${r};`);
	L.push(`AreaPerTest ${apt};`);
	L.push(`SampleTestPlan ${tp.length};`);
	for (const t of tp) L.push(`${t.x} ${t.y};`);
	L.push(`DefectRecordSpec 11 DEFECTID XREL YREL XINDEX YINDEX XSIZE YSIZE DEFECTAREA DSIZE CLASSNUMBER TEST;`);
	L.push(`DefectList`);
	for (const row of rows) L.push(`${row.join(" ")};`);
	L.push(`SummarySpec 3 TESTNO NDEFECT DEFDENSITY;`);
	L.push(`SummaryList`);
	L.push(`1 ${config.defectCount} ${dens};`);
	L.push(`ClassLookup ${classCount};`);
	for (let i = 0; i < classCount; i++) L.push(`${i + 1} "${CLASS_NAMES[i]}";`);
	L.push(`EndOfFile;`);
	return L.join("\n") + "\n";
}
//#endregion
//#region src/features/file-manager/components/GeneratorDialog.tsx
var distributions = [
	{
		value: "random",
		label: "Random",
		desc: "Uniform across wafer"
	},
	{
		value: "edge-heavy",
		label: "Edge Heavy",
		desc: "More defects near edge"
	},
	{
		value: "clustered",
		label: "Clustered",
		desc: "Gaussian cluster groups"
	},
	{
		value: "mixed",
		label: "Mixed",
		desc: "40% edge + 30% cluster + 30% random"
	}
];
var presets = [
	{
		label: "100",
		value: 100
	},
	{
		label: "1K",
		value: 1e3
	},
	{
		label: "10K",
		value: 1e4
	},
	{
		label: "50K",
		value: 5e4
	},
	{
		label: "100K",
		value: 1e5
	}
];
function GeneratorDialog({ onGenerated }) {
	const [open, setOpen] = useState(false);
	const [defectCount, setDefectCount] = useState(1e3);
	const [distribution, setDistribution] = useState("mixed");
	const [waferSize, setWaferSize] = useState(300);
	const [isGenerating, setIsGenerating] = useState(false);
	const setActiveFile = useFileStore((s) => s.setActiveFile);
	const addRecentFile = useFileStore((s) => s.addRecentFile);
	const handleGenerate = useCallback(async () => {
		setIsGenerating(true);
		await new Promise((r) => setTimeout(r, 50));
		try {
			const text = generateKlarf({
				defectCount,
				distribution,
				waferDiameter: waferSize * 1e3,
				seed: Date.now()
			});
			const adapter = initializeRegistry().detect("generated.klarf", text);
			if (!adapter) throw new Error("No parser found");
			const result = adapter.parse(text);
			if (!result.success) throw new Error(result.errors[0]?.message ?? "Parse failed");
			setActiveFile(`generated-${defectCount}-${Date.now()}`, result.data);
			addRecentFile({
				name: `generated-${defectCount}-${distribution}.klarf`,
				format: "klarf",
				openedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			setOpen(false);
			onGenerated?.();
		} catch (err) {
			alert(`Generation failed: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			setIsGenerating(false);
		}
	}, [
		defectCount,
		distribution,
		waferSize,
		setActiveFile,
		addRecentFile,
		onGenerated
	]);
	return /* @__PURE__ */ jsxs(Dialog.Root, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ jsx(Dialog.Trigger, {
			asChild: true,
			children: /* @__PURE__ */ jsxs("button", {
				className: "flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground",
				children: [/* @__PURE__ */ jsx(Wand2, { className: "h-4 w-4" }), "Generate Test Data"]
			})
		}), /* @__PURE__ */ jsxs(Dialog.Portal, { children: [/* @__PURE__ */ jsx(Dialog.Overlay, { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" }), /* @__PURE__ */ jsxs(Dialog.Content, {
			className: "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl",
			children: [
				/* @__PURE__ */ jsx(Dialog.Title, {
					className: "text-lg font-semibold",
					children: "Generate KLARF Test Data"
				}),
				/* @__PURE__ */ jsx(Dialog.Description, {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Create a realistic semiconductor inspection file for testing."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-col gap-5",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex flex-col gap-2",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-baseline justify-between",
									children: [/* @__PURE__ */ jsx("label", {
										className: "text-sm font-medium",
										children: "Defect Count"
									}), /* @__PURE__ */ jsx("span", {
										className: "text-sm font-semibold tabular-nums text-primary",
										children: defectCount.toLocaleString()
									})]
								}),
								/* @__PURE__ */ jsxs(SliderPrimitive.Root, {
									className: "relative flex h-5 w-full touch-none select-none items-center",
									value: [defectCount],
									onValueChange: ([v]) => setDefectCount(v),
									min: 10,
									max: 1e5,
									step: 10,
									children: [/* @__PURE__ */ jsx(SliderPrimitive.Track, {
										className: "relative h-1.5 w-full grow rounded-full bg-muted",
										children: /* @__PURE__ */ jsx(SliderPrimitive.Range, { className: "absolute h-full rounded-full bg-primary" })
									}), /* @__PURE__ */ jsx(SliderPrimitive.Thumb, { className: "block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" })]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "flex gap-1",
									children: presets.map((p) => /* @__PURE__ */ jsx("button", {
										onClick: () => setDefectCount(p.value),
										className: cn("flex-1 rounded border px-2 py-1 text-xs transition-colors", defectCount === p.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"),
										children: p.label
									}, p.value))
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex flex-col gap-2",
							children: [/* @__PURE__ */ jsx("label", {
								className: "text-sm font-medium",
								children: "Distribution"
							}), /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-2 gap-2",
								children: distributions.map((d) => /* @__PURE__ */ jsxs("button", {
									onClick: () => setDistribution(d.value),
									className: cn("rounded-md border p-2 text-left transition-colors", distribution === d.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"),
									children: [/* @__PURE__ */ jsx("div", {
										className: "text-xs font-medium",
										children: d.label
									}), /* @__PURE__ */ jsx("div", {
										className: "text-xs text-muted-foreground",
										children: d.desc
									})]
								}, d.value))
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex flex-col gap-2",
							children: [/* @__PURE__ */ jsx("label", {
								className: "text-sm font-medium",
								children: "Wafer Diameter"
							}), /* @__PURE__ */ jsx("div", {
								className: "flex gap-2",
								children: [
									200,
									300,
									450
								].map((size) => /* @__PURE__ */ jsxs("button", {
									onClick: () => setWaferSize(size),
									className: cn("flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors", waferSize === size ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"),
									children: [size, "mm"]
								}, size))
							})]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex justify-end gap-2",
					children: [/* @__PURE__ */ jsx(Dialog.Close, {
						asChild: true,
						children: /* @__PURE__ */ jsx("button", {
							className: "rounded-md border border-border px-4 py-2 text-sm hover:bg-muted",
							children: "Cancel"
						})
					}), /* @__PURE__ */ jsx("button", {
						onClick: handleGenerate,
						disabled: isGenerating,
						className: "flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
						children: isGenerating ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Generating..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Wand2, { className: "h-4 w-4" }), "Generate & Open"] })
					})]
				})
			]
		})] })]
	});
}
//#endregion
//#region src/features/file-manager/index.tsx
var InspectionHistory = /* @__PURE__ */ lazy(() => import("./InspectionHistory-DbQHyL21.js"));
function FileManagerPage() {
	const { openFile, openFilePicker } = useFileOpen();
	const lancelotNavigate = useLancelotNavigate();
	const { t } = useTranslation();
	const loadingState = useFileStore((s) => s.loadingState);
	const loadingProgress = useFileStore((s) => s.loadingProgress);
	const parseErrors = useFileStore((s) => s.parseErrors);
	const [isDragOver, setIsDragOver] = useState(false);
	const handleDragOver = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	}, []);
	const handleDragLeave = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, []);
	const handleDrop = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) openFile(file);
	}, [openFile]);
	const isLoading = loadingState === "reading" || loadingState === "parsing";
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col items-center justify-center gap-6 p-8",
		children: [
			/* @__PURE__ */ jsx("div", {
				onDragOver: handleDragOver,
				onDragLeave: handleDragLeave,
				onDrop: handleDrop,
				onClick: isLoading ? void 0 : openFilePicker,
				className: cn("flex max-w-lg cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors", isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50", isLoading && "pointer-events-none opacity-60"),
				children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Loader2, { className: "h-12 w-12 animate-spin text-primary" }), /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col gap-1",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "text-lg font-semibold",
						children: loadingState === "reading" ? t("statusBar.readingFile") : t("statusBar.parsing")
					}), loadingState === "parsing" && /* @__PURE__ */ jsx("div", {
						className: "mx-auto mt-2 h-2 w-48 overflow-hidden rounded-full bg-muted",
						children: /* @__PURE__ */ jsx("div", {
							className: "h-full rounded-full bg-primary transition-all duration-300",
							style: { width: `${Math.round(loadingProgress * 100)}%` }
						})
					})]
				})] }) : parseErrors.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(FileWarning, { className: "h-12 w-12 text-destructive" }), /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col gap-1",
					children: [
						/* @__PURE__ */ jsx("h3", {
							className: "text-lg font-semibold text-destructive",
							children: t("file.parseError")
						}),
						parseErrors.map((err, i) => /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted-foreground",
							children: err.message
						}, i)),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 text-sm text-muted-foreground",
							children: "Click to try another file"
						})
					]
				})] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx(Upload, { className: "h-12 w-12 text-muted-foreground/50" }),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-col gap-1",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "text-lg font-semibold",
							children: t("file.openInspection")
						}), /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted-foreground",
							children: t("file.dropOrBrowse")
						})]
					}),
					/* @__PURE__ */ jsx("span", {
						className: "mt-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
						children: t("file.browseFiles")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted-foreground",
						children: "Supported: .klarf, .kla, .000, .001"
					})
				] })
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ jsx("span", { children: t("common.or") }), /* @__PURE__ */ jsx(GeneratorDialog, { onGenerated: () => lancelotNavigate("wafer-map") })]
			}),
			/* @__PURE__ */ jsx(Suspense, {
				fallback: null,
				children: /* @__PURE__ */ jsx(InspectionHistory, {})
			})
		]
	});
}
//#endregion
export { FileManagerPage as default };

//# sourceMappingURL=file-manager-BQD8HCjI.js.map