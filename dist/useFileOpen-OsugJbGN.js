import { r as getStandaloneNavigateHook, t as getIsPortalMode } from "./mode-flag-DcZ3AbRu.js";
import { t as initializeRegistry } from "./parsers-B1gH2h1h.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { i as saveInspection } from "./inspection-db-Kp142-VM.js";
import { useCallback, useRef } from "react";
//#region src/hooks/useLancelotNavigate.ts
/**
* Dual-mode navigation hook.
*
* In standalone mode: delegates to a registered React Router hook
*   (injected by standalone-entry.tsx to avoid pulling react-router
*   into the library build).
* In portal mode: no-op. The Portal framework controls view rendering;
*   data flows through Zustand stores and views update reactively.
*
* The mode is determined by getIsPortalMode(), set once before React renders.
*/ function usePortalNavigate() {
	return useCallback((_viewKey) => {}, []);
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
export { useLancelotNavigate as n, useFileOpen as t };

//# sourceMappingURL=useFileOpen-OsugJbGN.js.map