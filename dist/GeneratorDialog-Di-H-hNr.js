import { r as getStandaloneNavigateHook, t as getIsPortalMode } from "./mode-flag-DcZ3AbRu.js";
import { t as initializeRegistry } from "./parsers-B1gH2h1h.js";
import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { i as saveInspection } from "./inspection-db-Kp142-VM.js";
import { useCallback, useContext, useRef, useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ToolContext } from "@portneuf/portal-framework";
import * as Dialog from "@radix-ui/react-dialog";
import * as SliderPrimitive from "@radix-ui/react-slider";
//#region src/hooks/useLancelotNavigate.ts
/**
* Dual-mode navigation hook.
*
* In standalone mode: delegates to a registered React Router hook
*   (injected by standalone-entry.tsx to avoid pulling react-router
*   into the library build).
* In portal mode: uses the framework's navigateToView() from ToolContext.
*
* The mode is determined by getIsPortalMode(), set once before React renders.
*/ function usePortalNavigate() {
	const toolCtx = useContext(ToolContext);
	return useCallback((viewKey) => {
		toolCtx?.navigateToView(viewKey);
	}, [toolCtx]);
}
function useLancelotNavigate() {
	if (getIsPortalMode()) return usePortalNavigate();
	const hook = getStandaloneNavigateHook();
	if (!hook) throw new Error("Navigation not initialized. In standalone mode, registerStandaloneNavigateHook() must be called before React renders.");
	return hook();
}
//#endregion
//#region src/features/file-manager/hooks/useFileOpen.ts
/**
* Hook for opening and parsing inspection files.
*
* Uses a Web Worker for parsing to keep the UI responsive.
* Falls back to main-thread parsing if Worker is unavailable.
*/
/** Persist parsed inspection metadata to IndexedDB (fire-and-forget). */ function persistToHistory(fileId, file, data) {
	saveInspection({
		id: fileId,
		fileName: file.name,
		lotId: data.identity.lotId ?? "",
		waferId: data.identity.waferId ?? "",
		deviceId: data.identity.deviceId ?? "",
		defectCount: data.defects.length,
		openedAt: (/* @__PURE__ */ new Date()).toISOString(),
		fileSize: file.size,
		format: data.source.formatId
	}).catch((err) => {
		console.warn("Failed to save inspection to history", err);
	});
}
function useFileOpen() {
	const setActiveFile = useFileStore((s) => s.setActiveFile);
	const setLoadingState = useFileStore((s) => s.setLoadingState);
	const setLoadingProgress = useFileStore((s) => s.setLoadingProgress);
	const setParseErrors = useFileStore((s) => s.setParseErrors);
	const setParseWarnings = useFileStore((s) => s.setParseWarnings);
	const addRecentFile = useFileStore((s) => s.addRecentFile);
	const lancelotNavigate = useLancelotNavigate();
	const workerRef = useRef(null);
	const openFile = useCallback(async (file) => {
		setLoadingState("reading");
		setLoadingProgress(0);
		try {
			const text = await file.text();
			setLoadingState("parsing");
			if (typeof Worker !== "undefined") try {
				await parseInWorker(file, text);
				return;
			} catch {}
			parseOnMainThread(file, text);
		} catch (err) {
			setParseErrors([{
				code: "FILE_READ_ERROR",
				message: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
				severity: "error"
			}]);
		}
	}, [
		setActiveFile,
		setLoadingState,
		setLoadingProgress,
		setParseErrors,
		setParseWarnings,
		addRecentFile
	]);
	const parseInWorker = useCallback((file, text) => {
		return new Promise((resolve, reject) => {
			workerRef.current?.terminate();
			const worker = new Worker(new URL(
				/* @vite-ignore */
				"/assets/parse-worker-B6CriD__.js",
				"" + import.meta.url
			), { type: "module" });
			workerRef.current = worker;
			worker.onmessage = (event) => {
				const msg = event.data;
				switch (msg.type) {
					case "progress":
						setLoadingProgress(msg.progress.fraction);
						break;
					case "complete":
						worker.terminate();
						workerRef.current = null;
						if (msg.result.success) {
							const fileId = `${file.name}-${Date.now()}`;
							setActiveFile(fileId, msg.result.data);
							setParseWarnings(msg.result.warnings);
							addRecentFile({
								name: file.name,
								format: msg.result.data.source.formatId,
								openedAt: (/* @__PURE__ */ new Date()).toISOString()
							});
							persistToHistory(fileId, file, msg.result.data);
							lancelotNavigate("wafer-map");
						} else setParseErrors(msg.result.errors);
						resolve();
						break;
					case "error":
						worker.terminate();
						workerRef.current = null;
						reject(new Error(msg.message));
						break;
				}
			};
			worker.onerror = (err) => {
				worker.terminate();
				workerRef.current = null;
				reject(err);
			};
			const request = {
				type: "parse",
				text,
				fileName: file.name,
				fileSize: file.size
			};
			worker.postMessage(request);
		});
	}, [
		setActiveFile,
		setLoadingProgress,
		setParseErrors,
		setParseWarnings,
		addRecentFile,
		lancelotNavigate
	]);
	const parseOnMainThread = useCallback((file, text) => {
		const adapter = initializeRegistry().detect(file.name, text);
		if (!adapter) {
			setParseErrors([{
				code: "NO_PARSER",
				message: `No parser found for file: ${file.name}`,
				severity: "error"
			}]);
			return;
		}
		const result = adapter.parse(text, (progress) => {
			setLoadingProgress(progress.fraction);
		});
		if (result.success) {
			const fileId = `${file.name}-${Date.now()}`;
			setActiveFile(fileId, result.data);
			setParseWarnings(result.warnings);
			addRecentFile({
				name: file.name,
				format: result.data.source.formatId,
				openedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			persistToHistory(fileId, file, result.data);
			lancelotNavigate("wafer-map");
		} else setParseErrors(result.errors);
	}, [
		setActiveFile,
		setLoadingProgress,
		setParseErrors,
		setParseWarnings,
		addRecentFile,
		lancelotNavigate
	]);
	return {
		openFile,
		openFilePicker: useCallback(() => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".klarf,.kla,.000,.001,.002,.003,.sinf,.inf";
			input.onchange = () => {
				const file = input.files?.[0];
				if (file) openFile(file);
			};
			input.click();
		}, [openFile])
	};
}
//#endregion
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
export { useFileOpen as n, useLancelotNavigate as r, GeneratorDialog as t };

//# sourceMappingURL=GeneratorDialog-Di-H-hNr.js.map