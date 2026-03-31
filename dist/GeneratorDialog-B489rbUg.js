import { t as initializeRegistry } from "./parsers-B1gH2h1h.js";
import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useLancelotNavigate } from "./useLancelotNavigate-NPMLiAHE.js";
import { i as saveInspection } from "./inspection-db-irco398v.js";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import * as Dialog from "@radix-ui/react-dialog";
import * as SliderPrimitive from "@radix-ui/react-slider";
//#region src/core/storage/in-memory-storage-adapter.ts
/**
* In-memory implementation of DefectStorageAdapter.
*
* Operates on InspectionFile[] arrays — no database required.
* This is the default adapter for web-only mode and the bridge
* that lets new views (Gallery, Stacking) work immediately
* while the PostgreSQL adapter is developed.
*
* All query methods iterate in-memory data. Pagination is
* simulated with Array.slice(). Stacking computes on the fly.
*/ function simpleHash(s) {
	let h = 0;
	for (let i = 0; i < Math.min(s.length, 4096); i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
	return h.toString(36);
}
function matchesLotFilter(file, filter) {
	if (filter.lotIds?.length && !filter.lotIds.includes(file.identity.lotId)) return false;
	if (filter.stepIds?.length && file.identity.stepId && !filter.stepIds.includes(file.identity.stepId)) return false;
	if (filter.setupIds?.length && file.inspectionSetup.setupId && !filter.setupIds.includes(file.inspectionSetup.setupId)) return false;
	if (filter.inspectionStation) {
		if (!`${file.inspectionSetup.stationId.vendor} ${file.inspectionSetup.stationId.model} ${file.inspectionSetup.stationId.equipmentId}`.includes(filter.inspectionStation)) return false;
	}
	return true;
}
function matchesDefectFilter(d, filter) {
	if (filter.classNumbers?.length && d.classNumber != null && !filter.classNumbers.includes(d.classNumber)) return false;
	if (filter.minSize != null && (d.size ?? 0) < filter.minSize) return false;
	if (filter.maxSize != null && (d.size ?? 0) > filter.maxSize) return false;
	if (filter.testIds?.length && d.test != null && !filter.testIds.includes(d.test)) return false;
	if (filter.spatialRegion) {
		const r = filter.spatialRegion;
		if (d.xAbs < r.xMin || d.xAbs > r.xMax || d.yAbs < r.yMin || d.yAbs > r.yMax) return false;
	}
	return true;
}
function defectToStored(waferId, d) {
	return {
		id: `${waferId}-${d.defectId}`,
		waferId,
		defectId: d.defectId,
		xRel: d.xRel,
		yRel: d.yRel,
		xIndex: d.xIndex,
		yIndex: d.yIndex,
		xSize: d.extra["XSIZE"],
		ySize: d.extra["YSIZE"],
		defectArea: d.extra["DEFECTAREA"],
		dSize: d.size,
		classNumber: d.classNumber ?? 0,
		testId: d.test,
		clusterNumber: d.clusterNumber,
		imageCount: d.imageCount ?? 0
	};
}
function paginate(items, pagination) {
	return {
		items: items.slice(pagination.offset, pagination.offset + pagination.limit),
		total: items.length,
		offset: pagination.offset,
		limit: pagination.limit
	};
}
function className(classLookup, classNumber) {
	return classLookup.find((c) => c.classNumber === classNumber)?.className ?? `Class ${classNumber}`;
}
var InMemoryStorageAdapter = class {
	files = /* @__PURE__ */ new Map();
	classifications = /* @__PURE__ */ new Map();
	signatures = /* @__PURE__ */ new Map();
	connected = false;
	async connect(_config) {
		this.connected = true;
	}
	async disconnect() {
		this.connected = false;
	}
	isConnected() {
		return this.connected;
	}
	async migrate() {
		return {
			applied: 0,
			skipped: 0,
			errors: []
		};
	}
	async importFile(file) {
		const start = performance.now();
		const hash = simpleHash(file.source.fileName + file.identity.lotId + file.identity.waferId);
		const importId = `mem-${hash}-${Date.now()}`;
		this.files.set(importId, {
			importId,
			file,
			importedAt: /* @__PURE__ */ new Date(),
			fileHash: hash
		});
		return {
			success: true,
			importId,
			lotId: file.identity.lotId,
			waferCount: 1,
			defectCount: file.defects.length,
			warnings: file.source.warnings.map((w) => w.message),
			errors: [],
			durationMs: performance.now() - start
		};
	}
	async importBatch(files) {
		const start = performance.now();
		const results = [];
		for (const f of files) results.push(await this.importFile(f));
		return {
			total: files.length,
			succeeded: results.filter((r) => r.success).length,
			failed: results.filter((r) => !r.success).length,
			results,
			totalDurationMs: performance.now() - start
		};
	}
	async deleteImport(importId) {
		this.files.delete(importId);
	}
	allFiles() {
		return [...this.files.values()];
	}
	filesMatchingLot(filter) {
		return this.allFiles().filter((sf) => matchesLotFilter(sf.file, filter));
	}
	async queryLots(filter, pagination) {
		const grouped = /* @__PURE__ */ new Map();
		for (const sf of this.filesMatchingLot(filter)) {
			const key = sf.file.identity.lotId;
			if (!grouped.has(key)) grouped.set(key, []);
			grouped.get(key).push(sf);
		}
		return paginate([...grouped.entries()].map(([lotId, sfs]) => {
			const first = sfs[0].file;
			const totalDefects = sfs.reduce((s, sf) => s + sf.file.defects.length, 0);
			return {
				id: lotId,
				lotId,
				stepId: first.identity.stepId ?? "",
				setupId: first.inspectionSetup.setupId ?? "",
				inspectionStation: `${first.inspectionSetup.stationId.vendor} ${first.inspectionSetup.stationId.model}`,
				waferCount: sfs.length,
				totalDefects,
				averageYield: 0,
				importedAt: sfs[0].importedAt,
				sourceFile: first.source.fileName
			};
		}), pagination);
	}
	async queryWafers(lotId) {
		return this.allFiles().filter((sf) => sf.file.identity.lotId === lotId).map((sf) => {
			const classDist = {};
			for (const d of sf.file.defects) {
				const cn = d.classNumber ?? 0;
				classDist[cn] = (classDist[cn] ?? 0) + 1;
			}
			return {
				id: sf.importId,
				waferId: sf.file.identity.waferId,
				slot: sf.file.identity.slot ?? 0,
				defectCount: sf.file.defects.length,
				yield: 0,
				classDistribution: classDist
			};
		});
	}
	async getImportHistory(pagination) {
		const records = this.allFiles().map((sf) => ({
			id: sf.importId,
			sourceFile: sf.file.source.fileName,
			fileHash: sf.fileHash,
			importedAt: sf.importedAt,
			lotId: sf.file.identity.lotId,
			waferCount: 1,
			defectCount: sf.file.defects.length
		}));
		records.sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime());
		return paginate(records, pagination);
	}
	collectDefects(filter) {
		const results = [];
		for (const sf of this.filesMatchingLot(filter)) {
			if (filter.waferIds?.length && !filter.waferIds.includes(sf.file.identity.waferId)) continue;
			for (const d of sf.file.defects) if (matchesDefectFilter(d, filter)) results.push({
				sf,
				d
			});
		}
		return results;
	}
	async queryDefects(filter, pagination) {
		return paginate(this.collectDefects(filter).map(({ sf, d }) => defectToStored(sf.file.identity.waferId, d)), pagination);
	}
	async getWaferDefects(waferId, filter) {
		const sf = this.allFiles().find((s) => s.file.identity.waferId === waferId);
		if (!sf) return [];
		let defects = sf.file.defects;
		if (filter) defects = defects.filter((d) => matchesDefectFilter(d, filter));
		return defects.map((d) => defectToStored(waferId, d));
	}
	async getDefectCount(filter) {
		return this.collectDefects(filter).length;
	}
	async getWaferMapData(waferId) {
		const sf = this.allFiles().find((s) => s.file.identity.waferId === waferId);
		if (!sf) return null;
		const f = sf.file;
		return {
			waferId,
			sampleSize: f.waferGeometry.sampleSizeRaw,
			diePitch: f.waferGeometry.diePitch,
			center: f.waferGeometry.sampleCenterLocation,
			orientation: f.waferGeometry.orientationMarkLocation ?? "DOWN",
			defects: f.defects.map((d) => ({
				x: d.xAbs,
				y: d.yAbs,
				xIndex: d.xIndex,
				yIndex: d.yIndex,
				size: d.size ?? 0,
				classNumber: d.classNumber ?? 0,
				className: className(f.classLookup, d.classNumber ?? 0)
			})),
			sampleTestPlan: f.testPlan.map((tp) => [tp.xIndex, tp.yIndex])
		};
	}
	async getStackedWaferMapData(waferIds, aggregation, gridSize) {
		const cells = [];
		const grid = new Array(gridSize * gridSize).fill(null).map(() => ({
			defects: 0,
			waferHits: /* @__PURE__ */ new Set(),
			classCounts: /* @__PURE__ */ new Map()
		}));
		let waferCount = 0;
		let waferDiameter = 3e5;
		for (const waferId of waferIds) {
			const sf = this.allFiles().find((s) => s.file.identity.waferId === waferId);
			if (!sf) continue;
			waferCount++;
			waferDiameter = sf.file.waferGeometry.waferDiameter;
			const [cx, cy] = sf.file.waferGeometry.sampleCenterLocation;
			for (const d of sf.file.defects) {
				const gx = Math.floor((d.xAbs - cx + waferDiameter / 2) / waferDiameter * gridSize);
				const gy = Math.floor((d.yAbs - cy + waferDiameter / 2) / waferDiameter * gridSize);
				if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) continue;
				const idx = gy * gridSize + gx;
				grid[idx].defects++;
				grid[idx].waferHits.add(waferId);
				const cn = d.classNumber ?? 0;
				grid[idx].classCounts.set(cn, (grid[idx].classCounts.get(cn) ?? 0) + 1);
			}
		}
		const cellArea = (waferDiameter / gridSize) ** 2;
		for (let gy = 0; gy < gridSize; gy++) for (let gx = 0; gx < gridSize; gx++) {
			const g = grid[gy * gridSize + gx];
			if (g.defects === 0) continue;
			let value;
			const metadata = {};
			switch (aggregation) {
				case "density":
					value = g.defects / (cellArea / 1e6);
					break;
				case "hit-count":
					value = g.waferHits.size;
					break;
				case "class-dominance": {
					let maxClass = 0;
					let maxCount = 0;
					for (const [cn, count] of g.classCounts) if (count > maxCount) {
						maxCount = count;
						maxClass = cn;
					}
					value = maxClass;
					metadata.count = maxCount;
					break;
				}
			}
			cells.push({
				gridX: gx,
				gridY: gy,
				value,
				metadata
			});
		}
		return {
			gridSize,
			waferCount,
			cells,
			aggregation
		};
	}
	async getPareto(filter, topN) {
		const counts = /* @__PURE__ */ new Map();
		const matching = this.collectDefects(filter);
		for (const { d } of matching) {
			const cn = d.classNumber ?? 0;
			counts.set(cn, (counts.get(cn) ?? 0) + 1);
		}
		const lookup = (this.filesMatchingLot(filter)[0]?.file)?.classLookup ?? [];
		const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
		const total = matching.length;
		let cumulative = 0;
		return sorted.map(([classNumber, count]) => {
			cumulative += count;
			return {
				classNumber,
				className: className(lookup, classNumber),
				count,
				percentage: total > 0 ? count / total * 100 : 0,
				cumulativePercentage: total > 0 ? cumulative / total * 100 : 0
			};
		});
	}
	async getYieldSummary(filter) {
		const files = this.filesMatchingLot(filter);
		const totalWafers = files.length;
		const totalDefects = files.reduce((s, sf) => s + sf.file.defects.length, 0);
		const yieldByWafer = files.map((sf) => ({
			waferId: sf.file.identity.waferId,
			yield: 0,
			defectCount: sf.file.defects.length
		}));
		return {
			totalWafers,
			totalDefects,
			averageDefectsPerWafer: totalWafers > 0 ? totalDefects / totalWafers : 0,
			averageYield: 0,
			minYield: 0,
			maxYield: 0,
			yieldByWafer
		};
	}
	async getTrend(metric, filter, groupBy) {
		const files = this.filesMatchingLot(filter);
		const points = [];
		if (groupBy === "wafer") for (const sf of files) {
			let value;
			switch (metric) {
				case "defect-count":
					value = sf.file.defects.length;
					break;
				case "defect-density":
					value = sf.file.defects.length;
					break;
				case "yield":
					value = 0;
					break;
				case "cluster-count":
					value = new Set(sf.file.defects.map((d) => d.clusterNumber).filter((c) => c != null)).size;
					break;
			}
			points.push({
				label: sf.file.identity.waferId,
				value
			});
		}
		else {
			const grouped = /* @__PURE__ */ new Map();
			for (const sf of files) {
				const key = groupBy === "lot" ? sf.file.identity.lotId : sf.importedAt.toISOString().slice(0, 10);
				if (!grouped.has(key)) grouped.set(key, []);
				grouped.get(key).push(sf);
			}
			for (const [label, sfs] of grouped) {
				const totalDefects = sfs.reduce((s, sf) => s + sf.file.defects.length, 0);
				points.push({
					label,
					value: totalDefects
				});
			}
		}
		return points;
	}
	async getCorrelation(_xMetric, _yMetric, filter) {
		return this.filesMatchingLot(filter).map((sf) => ({
			x: sf.file.defects.length,
			y: sf.file.defects.length,
			label: sf.file.identity.waferId
		}));
	}
	async getSpatialDensity(waferId, gridSize) {
		return (await this.getStackedWaferMapData([waferId], "density", gridSize)).cells;
	}
	async getClassDistribution(filter) {
		return (await this.getPareto(filter, 100)).map((p) => ({
			classNumber: p.classNumber,
			className: p.className,
			count: p.count,
			percentage: p.percentage
		}));
	}
	async getSPCData(_metric, filter) {
		const files = this.filesMatchingLot(filter);
		const values = files.map((sf) => sf.file.defects.length);
		const n = values.length;
		const mean = n > 0 ? values.reduce((s, v) => s + v, 0) / n : 0;
		const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
		const stdDev = Math.sqrt(variance);
		const ucl = mean + 3 * stdDev;
		const lcl = Math.max(0, mean - 3 * stdDev);
		const ooc = [];
		return {
			points: files.map((sf, i) => {
				const v = sf.file.defects.length;
				if (v > ucl || v < lcl) ooc.push(i);
				return {
					label: sf.file.identity.waferId,
					value: v
				};
			}),
			mean,
			stdDev,
			ucl,
			lcl,
			outOfControl: ooc
		};
	}
	async searchLots(query) {
		const q = query.toLowerCase();
		return (await this.queryLots({}, {
			offset: 0,
			limit: 1e3
		})).items.filter((lot) => lot.lotId.toLowerCase().includes(q) || lot.stepId.toLowerCase().includes(q) || lot.sourceFile.toLowerCase().includes(q));
	}
	async saveClassification(result) {
		const existing = this.classifications.get(result.waferId) ?? [];
		existing.push(result);
		this.classifications.set(result.waferId, existing);
	}
	async getClassifications(waferId) {
		return this.classifications.get(waferId) ?? [];
	}
	async saveSignatures(sigs) {
		for (const sig of sigs) {
			const existing = this.signatures.get(sig.waferId) ?? [];
			existing.push(sig);
			this.signatures.set(sig.waferId, existing);
		}
	}
	async getSignatures(waferId) {
		return this.signatures.get(waferId) ?? [];
	}
};
//#endregion
//#region src/core/storage/storage-context.ts
/**
* Storage adapter access for both standalone and portal mode.
*
* In standalone mode: StorageProvider wraps the app with React Context + QueryClientProvider.
* In portal mode: a module-level singleton is used since portal components are
* lazy-loaded independently (no shared React tree wrapper).
*
* The useStorage() hook works in both modes transparently.
*/ var StorageContext = createContext(null);
var _singleton = null;
function getStorageSingleton() {
	if (!_singleton) _singleton = new InMemoryStorageAdapter();
	return _singleton;
}
function useStorage() {
	const fromContext = useContext(StorageContext);
	if (fromContext) return fromContext;
	return getStorageSingleton();
}
//#endregion
//#region src/features/file-manager/hooks/useFileOpen.ts
/**
* Hook for opening and parsing inspection files.
*
* Uses a Web Worker for parsing to keep the UI responsive.
* Falls back to main-thread parsing if Worker is unavailable.
*
* After parsing, data is written to both:
* - file-store (Zustand, for existing views)
* - DefectStorageAdapter (for new adapter-based views like Gallery/Stacking)
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
	const storage = useStorage();
	const workerRef = useRef(null);
	/** Common success handler for both worker and main-thread paths. */ const handleParseSuccess = useCallback((file, data, warnings) => {
		const fileId = `${file.name}-${Date.now()}`;
		setActiveFile(fileId, data);
		setParseWarnings(warnings);
		addRecentFile({
			name: file.name,
			format: data.source.formatId,
			openedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		storage.importFile(data).catch((err) => {
			console.warn("Failed to import file into storage adapter", err);
		});
		persistToHistory(fileId, file, data);
		lancelotNavigate("wafer-map");
	}, [
		setActiveFile,
		setParseWarnings,
		addRecentFile,
		storage,
		lancelotNavigate
	]);
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
		setLoadingState,
		setLoadingProgress,
		setParseErrors
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
						if (msg.result.success) handleParseSuccess(file, msg.result.data, msg.result.warnings);
						else setParseErrors(msg.result.errors);
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
		setLoadingProgress,
		setParseErrors,
		handleParseSuccess
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
		if (result.success) handleParseSuccess(file, result.data, result.warnings);
		else setParseErrors(result.errors);
	}, [
		setLoadingProgress,
		setParseErrors,
		handleParseSuccess
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
export { useFileOpen as n, useStorage as r, GeneratorDialog as t };

//# sourceMappingURL=GeneratorDialog-B489rbUg.js.map