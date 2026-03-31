import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { t as useTranslation } from "./useTranslation-B1_W7B7C.js";
import { t as EmptyState } from "./EmptyState-nf8sPvBQ.js";
import { i as readColorScheme, n as hitTestDefect, o as useWaferMapRenderer, r as hitTestDie, t as canvasToWafer } from "./useWaferMapRenderer-Dcn7o9Dv.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleDot, Maximize, Palette, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/features/wafer-map/hooks/useWaferZoomPan.ts
/**
* Hook for pan/zoom interaction on the wafer map canvas.
*
* Supports:
* - Mouse wheel zoom (scales around cursor position)
* - Mouse drag pan (updates centerX/centerY)
* - Touch pinch-to-zoom
* - "Fit to window" reset function
* - requestAnimationFrame throttling for smooth updates
*/ var MIN_SCALE = 1e-4;
var MAX_SCALE = 10;
var ZOOM_FACTOR = 1.1;
var FIT_PADDING = .9;
function useWaferZoomPan(canvasRef, geometry) {
	const [viewport, setViewport] = useState({
		centerX: 0,
		centerY: 0,
		scale: 1,
		canvasWidth: 300,
		canvasHeight: 300
	});
	const isPanningRef = useRef(false);
	const [isPanning, setIsPanning] = useState(false);
	const lastMouseRef = useRef({
		x: 0,
		y: 0
	});
	const lastTouchDistRef = useRef(null);
	const lastTouchCenterRef = useRef(null);
	const fitToWindow = useCallback(() => {
		if (!geometry) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const cw = rect.width;
		const ch = rect.height;
		if (cw === 0 || ch === 0) return;
		const diameter = geometry.waferDiameter;
		const scaleX = cw * FIT_PADDING / diameter;
		const scaleY = ch * FIT_PADDING / diameter;
		const scale = Math.min(scaleX, scaleY);
		const [scx, scy] = geometry.sampleCenterLocation;
		setViewport({
			centerX: scx,
			centerY: scy,
			scale,
			canvasWidth: cw,
			canvasHeight: ch
		});
	}, [canvasRef, geometry]);
	const setZoom = useCallback((scale) => {
		const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
		setViewport((prev) => ({
			...prev,
			scale: clampedScale
		}));
	}, []);
	const hasFittedRef = useRef(false);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const { width, height } = entry.contentRect;
			if (width === 0 || height === 0) return;
			const dpr = window.devicePixelRatio || 1;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			setViewport((prev) => ({
				...prev,
				canvasWidth: width,
				canvasHeight: height
			}));
			if (!hasFittedRef.current && geometry) {
				hasFittedRef.current = true;
				const diameter = geometry.waferDiameter;
				const scaleX = width * FIT_PADDING / diameter;
				const scaleY = height * FIT_PADDING / diameter;
				const scale = Math.min(scaleX, scaleY);
				const [scx, scy] = geometry.sampleCenterLocation;
				setViewport({
					centerX: scx,
					centerY: scy,
					scale,
					canvasWidth: width,
					canvasHeight: height
				});
			}
		});
		observer.observe(canvas);
		return () => observer.disconnect();
	}, [canvasRef, geometry]);
	useEffect(() => {
		if (geometry) {
			hasFittedRef.current = false;
			fitToWindow();
		}
	}, [geometry, fitToWindow]);
	const onWheel = useCallback((e) => {
		e.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		setViewport((prev) => {
			const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
			const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
			const wx = (mouseX - prev.canvasWidth / 2) / prev.scale + prev.centerX;
			const wy = (mouseY - prev.canvasHeight / 2) / prev.scale + prev.centerY;
			const newCenterX = wx - (mouseX - prev.canvasWidth / 2) / newScale;
			const newCenterY = wy - (mouseY - prev.canvasHeight / 2) / newScale;
			return {
				...prev,
				centerX: newCenterX,
				centerY: newCenterY,
				scale: newScale
			};
		});
	}, [canvasRef]);
	const onMouseDown = useCallback((e) => {
		if (e.button !== 0) return;
		if (e.shiftKey) return;
		isPanningRef.current = true;
		setIsPanning(true);
		lastMouseRef.current = {
			x: e.clientX,
			y: e.clientY
		};
	}, []);
	const onMouseMove = useCallback((e) => {
		if (!isPanningRef.current) return;
		const dx = e.clientX - lastMouseRef.current.x;
		const dy = e.clientY - lastMouseRef.current.y;
		lastMouseRef.current = {
			x: e.clientX,
			y: e.clientY
		};
		setViewport((prev) => {
			return {
				...prev,
				centerX: prev.centerX - dx / prev.scale,
				centerY: prev.centerY - dy / prev.scale
			};
		});
	}, []);
	const stopPanning = useCallback(() => {
		isPanningRef.current = false;
		setIsPanning(false);
	}, []);
	const onMouseUp = useCallback((_e) => {
		stopPanning();
	}, [stopPanning]);
	const onMouseLeave = useCallback((_e) => {
		stopPanning();
	}, [stopPanning]);
	const getTouchDistance = (t1, t2) => {
		const dx = t1.clientX - t2.clientX;
		const dy = t1.clientY - t2.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	};
	const getTouchCenter = (t1, t2, rect) => ({
		x: (t1.clientX + t2.clientX) / 2 - rect.left,
		y: (t1.clientY + t2.clientY) / 2 - rect.top
	});
	return {
		viewport,
		eventHandlers: {
			onWheel,
			onMouseDown,
			onMouseMove,
			onMouseUp,
			onMouseLeave,
			onTouchStart: useCallback((e) => {
				if (e.touches.length === 2) {
					e.preventDefault();
					lastTouchDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
					const canvas = canvasRef.current;
					if (canvas) {
						const rect = canvas.getBoundingClientRect();
						lastTouchCenterRef.current = getTouchCenter(e.touches[0], e.touches[1], rect);
					}
				} else if (e.touches.length === 1) {
					isPanningRef.current = true;
					setIsPanning(true);
					lastMouseRef.current = {
						x: e.touches[0].clientX,
						y: e.touches[0].clientY
					};
				}
			}, [canvasRef]),
			onTouchMove: useCallback((e) => {
				if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
					e.preventDefault();
					const canvas = canvasRef.current;
					if (!canvas) return;
					const newDist = getTouchDistance(e.touches[0], e.touches[1]);
					const rect = canvas.getBoundingClientRect();
					const center = getTouchCenter(e.touches[0], e.touches[1], rect);
					const ratio = newDist / lastTouchDistRef.current;
					lastTouchDistRef.current = newDist;
					setViewport((prev) => {
						const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * ratio));
						const wx = (center.x - prev.canvasWidth / 2) / prev.scale + prev.centerX;
						const wy = (center.y - prev.canvasHeight / 2) / prev.scale + prev.centerY;
						const newCenterX = wx - (center.x - prev.canvasWidth / 2) / newScale;
						const newCenterY = wy - (center.y - prev.canvasHeight / 2) / newScale;
						let panDx = 0;
						let panDy = 0;
						if (lastTouchCenterRef.current) {
							panDx = (center.x - lastTouchCenterRef.current.x) / newScale;
							panDy = (center.y - lastTouchCenterRef.current.y) / newScale;
						}
						lastTouchCenterRef.current = center;
						return {
							...prev,
							centerX: newCenterX - panDx,
							centerY: newCenterY - panDy,
							scale: newScale
						};
					});
				} else if (e.touches.length === 1 && isPanningRef.current) {
					const touch = e.touches[0];
					const dx = touch.clientX - lastMouseRef.current.x;
					const dy = touch.clientY - lastMouseRef.current.y;
					lastMouseRef.current = {
						x: touch.clientX,
						y: touch.clientY
					};
					setViewport((prev) => ({
						...prev,
						centerX: prev.centerX - dx / prev.scale,
						centerY: prev.centerY - dy / prev.scale
					}));
				}
			}, [canvasRef]),
			onTouchEnd: useCallback((_e) => {
				lastTouchDistRef.current = null;
				lastTouchCenterRef.current = null;
				isPanningRef.current = false;
				setIsPanning(false);
			}, [])
		},
		fitToWindow,
		setZoom,
		isPanning
	};
}
//#endregion
//#region src/features/wafer-map/components/ColorModeSelector.tsx
var modes = [
	{
		value: "uniform",
		label: "Uniform"
	},
	{
		value: "byClass",
		label: "By Class"
	},
	{
		value: "bySize",
		label: "By Size"
	},
	{
		value: "byCluster",
		label: "By Cluster"
	}
];
function ColorModeSelector({ value, onChange }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex items-center gap-1",
		children: [/* @__PURE__ */ jsx(Palette, { className: "h-3.5 w-3.5 text-muted-foreground" }), modes.map((m) => /* @__PURE__ */ jsx("button", {
			onClick: () => onChange(m.value),
			className: cn("rounded px-2 py-0.5 text-xs transition-colors", value === m.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"),
			title: `Color defects ${m.label.toLowerCase()}`,
			children: m.label
		}, m.value))]
	});
}
//#endregion
//#region src/features/wafer-map/index.tsx
/**
* WaferMap page component -- full-screen Canvas visualization of a semiconductor
* wafer with die grid and defect overlay.
*
* Renders:
* - Wafer outline with notch indicator
* - Die grid colored by defect density (green -> red gradient)
* - Defect dots (batch-rendered for performance)
* - Floating toolbar with zoom controls
* - Floating legend with die color key
*
* Interactions:
* - Mouse wheel to zoom, drag to pan, touch pinch-to-zoom
* - Click defect to highlight in inspection store
* - Hover die to update inspection store
*/ var ZOOM_STEP = 1.3;
function WaferMapPage() {
	const { t } = useTranslation();
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const selectedDefectIds = useInspectionStore((s) => s.selectedDefectIds);
	const filteredDefectIds = useInspectionStore((s) => s.filteredDefectIds);
	const highlightedDefectId = useInspectionStore((s) => s.highlightedDefectId);
	const hoveredDie = useInspectionStore((s) => s.hoveredDie);
	const highlightDefect = useInspectionStore((s) => s.highlightDefect);
	const setHoveredDie = useInspectionStore((s) => s.setHoveredDie);
	const selectDefects = useInspectionStore((s) => s.selectDefects);
	const resetSelection = useInspectionStore((s) => s.resetSelection);
	const canvasRef = useRef(null);
	const overlayCanvasRef = useRef(null);
	const [colorMode, setColorMode] = useState("uniform");
	const [rotation, setRotation] = useState(0);
	const [selectionRect, setSelectionRect] = useState(null);
	const isSelectingRef = useRef(false);
	const activeFile = activeFileId ? files.get(activeFileId) ?? null : null;
	const geometry = activeFile?.waferGeometry ?? null;
	const dies = activeFile?.dieMap ?? [];
	const defects = activeFile?.defects ?? [];
	const { viewport, eventHandlers, fitToWindow, setZoom, isPanning } = useWaferZoomPan(canvasRef, geometry);
	useWaferMapRenderer(canvasRef, viewport, geometry, dies, defects, useMemo(() => ({
		selectedDefectIds,
		highlightedDefectId,
		hoveredDie
	}), [
		selectedDefectIds,
		highlightedDefectId,
		hoveredDie
	]), filteredDefectIds, colorMode);
	const handleCanvasClick = useCallback((e) => {
		if (!geometry) return;
		if (e.shiftKey) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const defect = hitTestDefect(e.clientX - rect.left, e.clientY - rect.top, viewport, defects);
		if (defect) {
			highlightDefect(defect.defectId);
			return;
		}
		highlightDefect(null);
	}, [
		viewport,
		defects,
		geometry,
		highlightDefect
	]);
	const handleCanvasMouseMove = useCallback((e) => {
		if (!geometry) return;
		if (isPanning) return;
		if (isSelectingRef.current) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const die = hitTestDie(e.clientX - rect.left, e.clientY - rect.top, viewport, geometry, dies);
		if (die) setHoveredDie({
			xIndex: die.xIndex,
			yIndex: die.yIndex
		});
		else setHoveredDie(null);
	}, [
		viewport,
		geometry,
		dies,
		isPanning,
		setHoveredDie
	]);
	const handleCanvasMouseLeave = useCallback(() => {
		setHoveredDie(null);
		if (isSelectingRef.current) {
			isSelectingRef.current = false;
			setSelectionRect(null);
		}
	}, [setHoveredDie]);
	const handleSelectionMouseDown = useCallback((e) => {
		if (!e.shiftKey || e.button !== 0) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		isSelectingRef.current = true;
		setSelectionRect({
			startX: cx,
			startY: cy,
			endX: cx,
			endY: cy
		});
	}, []);
	const handleSelectionMouseMove = useCallback((e) => {
		if (!isSelectingRef.current) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		setSelectionRect((prev) => prev ? {
			...prev,
			endX: cx,
			endY: cy
		} : null);
	}, []);
	const handleSelectionMouseUp = useCallback((_e) => {
		if (!isSelectingRef.current || !selectionRect) {
			isSelectingRef.current = false;
			return;
		}
		isSelectingRef.current = false;
		const minCx = Math.min(selectionRect.startX, selectionRect.endX);
		const maxCx = Math.max(selectionRect.startX, selectionRect.endX);
		const minCy = Math.min(selectionRect.startY, selectionRect.endY);
		const maxCy = Math.max(selectionRect.startY, selectionRect.endY);
		if (maxCx - minCx < 4 && maxCy - minCy < 4) {
			setSelectionRect(null);
			return;
		}
		const [wMinX, wMinY] = canvasToWafer(minCx, minCy, viewport);
		const [wMaxX, wMaxY] = canvasToWafer(maxCx, maxCy, viewport);
		const left = Math.min(wMinX, wMaxX);
		const right = Math.max(wMinX, wMaxX);
		const top = Math.min(wMinY, wMaxY);
		const bottom = Math.max(wMinY, wMaxY);
		const matchingIds = [];
		for (const d of defects) if (d.xAbs >= left && d.xAbs <= right && d.yAbs >= top && d.yAbs <= bottom) matchingIds.push(d.defectId);
		if (matchingIds.length > 0) selectDefects(matchingIds);
		setSelectionRect(null);
	}, [
		selectionRect,
		viewport,
		defects,
		selectDefects
	]);
	useEffect(() => {
		const overlay = overlayCanvasRef.current;
		if (!overlay) return;
		const ctx = overlay.getContext("2d");
		if (!ctx) return;
		const dpr = window.devicePixelRatio || 1;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);
		if (!selectionRect) return;
		const x = Math.min(selectionRect.startX, selectionRect.endX);
		const y = Math.min(selectionRect.startY, selectionRect.endY);
		const w = Math.abs(selectionRect.endX - selectionRect.startX);
		const h = Math.abs(selectionRect.endY - selectionRect.startY);
		ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
		ctx.fillRect(x, y, w, h);
		ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
		ctx.lineWidth = 2;
		ctx.strokeRect(x, y, w, h);
	}, [selectionRect]);
	useEffect(() => {
		const canvas = canvasRef.current;
		const overlay = overlayCanvasRef.current;
		if (!canvas || !overlay) return;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const { width, height } = entry.contentRect;
			if (width === 0 || height === 0) return;
			const dpr = window.devicePixelRatio || 1;
			overlay.width = width * dpr;
			overlay.height = height * dpr;
			overlay.style.width = `${width}px`;
			overlay.style.height = `${height}px`;
		});
		observer.observe(canvas);
		return () => observer.disconnect();
	}, []);
	const handleZoomIn = useCallback(() => {
		setZoom(viewport.scale * ZOOM_STEP);
	}, [viewport.scale, setZoom]);
	const handleZoomOut = useCallback(() => {
		setZoom(viewport.scale / ZOOM_STEP);
	}, [viewport.scale, setZoom]);
	const zoomPercent = useMemo(() => {
		if (!geometry) return 100;
		const fitScale = Math.min(viewport.canvasWidth * .9 / geometry.waferDiameter, viewport.canvasHeight * .9 / geometry.waferDiameter);
		if (fitScale === 0) return 100;
		return Math.round(viewport.scale / fitScale * 100);
	}, [viewport, geometry]);
	if (!activeFile || !geometry) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: CircleDot,
			title: t("common.noData"),
			description: t("waferMap.openFileToView")
		})
	});
	const colors = readColorScheme();
	return /* @__PURE__ */ jsxs("div", {
		className: "relative flex h-full w-full flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ jsx("canvas", {
				ref: canvasRef,
				className: cn("h-full w-full", isPanning ? "cursor-grabbing" : isSelectingRef.current ? "cursor-crosshair" : "cursor-crosshair"),
				style: { touchAction: "none" },
				onClick: handleCanvasClick,
				onMouseMove: (e) => {
					handleSelectionMouseMove(e);
					eventHandlers.onMouseMove(e);
					handleCanvasMouseMove(e);
				},
				onMouseLeave: (e) => {
					eventHandlers.onMouseLeave(e);
					handleCanvasMouseLeave();
				},
				onWheel: eventHandlers.onWheel,
				onMouseDown: (e) => {
					handleSelectionMouseDown(e);
					eventHandlers.onMouseDown(e);
				},
				onMouseUp: (e) => {
					handleSelectionMouseUp(e);
					eventHandlers.onMouseUp(e);
				},
				onTouchStart: eventHandlers.onTouchStart,
				onTouchMove: eventHandlers.onTouchMove,
				onTouchEnd: eventHandlers.onTouchEnd
			}),
			/* @__PURE__ */ jsx("canvas", {
				ref: overlayCanvasRef,
				className: "pointer-events-none absolute inset-0 h-full w-full",
				style: { touchAction: "none" }
			}),
			/* @__PURE__ */ jsxs("div", {
				className: cn("absolute right-3 top-3 flex items-center gap-1", "rounded-lg border border-border bg-card/90 p-1 shadow-md backdrop-blur-sm"),
				children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: handleZoomIn,
						className: cn("flex h-8 w-8 items-center justify-center rounded-md", "text-muted-foreground transition-colors", "hover:bg-accent hover:text-accent-foreground", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"),
						title: t("waferMap.zoomIn"),
						"aria-label": t("waferMap.zoomIn"),
						children: /* @__PURE__ */ jsx(ZoomIn, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ jsxs("span", {
						className: cn("min-w-[3.5rem] select-none text-center text-xs font-medium tabular-nums", "text-muted-foreground"),
						children: [zoomPercent, "%"]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: handleZoomOut,
						className: cn("flex h-8 w-8 items-center justify-center rounded-md", "text-muted-foreground transition-colors", "hover:bg-accent hover:text-accent-foreground", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"),
						title: t("waferMap.zoomOut"),
						"aria-label": t("waferMap.zoomOut"),
						children: /* @__PURE__ */ jsx(ZoomOut, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ jsx("div", { className: "mx-0.5 h-5 w-px bg-border" }),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: fitToWindow,
						className: cn("flex h-8 w-8 items-center justify-center rounded-md", "text-muted-foreground transition-colors", "hover:bg-accent hover:text-accent-foreground", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"),
						title: t("waferMap.fitToWindow"),
						"aria-label": t("waferMap.fitToWindow"),
						children: /* @__PURE__ */ jsx(Maximize, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ jsx("div", { className: "mx-0.5 h-5 w-px bg-border" }),
					/* @__PURE__ */ jsx(ColorModeSelector, {
						value: colorMode,
						onChange: setColorMode
					}),
					/* @__PURE__ */ jsx("div", { className: "mx-0.5 h-5 w-px bg-border" }),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setRotation((prev) => (prev + 90) % 360),
						className: cn("flex h-8 w-8 items-center justify-center rounded-md", "text-muted-foreground transition-colors", "hover:bg-accent hover:text-accent-foreground"),
						title: `Rotate (${rotation}°)`,
						"aria-label": t("waferMap.rotateWafer"),
						children: /* @__PURE__ */ jsx(RotateCw, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ jsx("span", {
						className: "min-w-[2rem] select-none text-center text-xs text-muted-foreground",
						children: rotation === 0 ? "Down" : rotation === 90 ? "Left" : rotation === 180 ? "Up" : "Right"
					}),
					selectedDefectIds.size > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx("div", { className: "mx-0.5 h-5 w-px bg-border" }),
						/* @__PURE__ */ jsxs("span", {
							className: "select-none text-xs font-medium text-blue-500",
							children: [
								selectedDefectIds.size,
								" ",
								t("waferMap.selected")
							]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => resetSelection(),
							className: cn("flex h-8 w-8 items-center justify-center rounded-md", "text-muted-foreground transition-colors", "hover:bg-destructive/10 hover:text-destructive", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"),
							title: t("waferMap.clearSelection"),
							"aria-label": t("waferMap.clearSelection"),
							children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
						})
					] })
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: cn("absolute left-1/2 top-3 -translate-x-1/2", "pointer-events-none select-none rounded-md bg-card/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm", "border border-border/50"),
				children: t("waferMap.shiftDragHint")
			}),
			/* @__PURE__ */ jsxs("div", {
				className: cn("absolute bottom-3 left-3", "rounded-lg border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur-sm"),
				children: [/* @__PURE__ */ jsx("p", {
					className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
					children: t("waferMap.legend")
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col gap-1",
					children: [
						/* @__PURE__ */ jsx(LegendItem, {
							color: colors.diePass,
							label: t("waferMap.legendPass")
						}),
						/* @__PURE__ */ jsx(LegendItem, {
							color: colors.dieFail,
							label: t("waferMap.legendFail")
						}),
						/* @__PURE__ */ jsx(LegendItem, {
							color: colors.dieUntested,
							label: t("waferMap.legendUntested")
						}),
						/* @__PURE__ */ jsx(LegendItem, {
							color: colors.defectParticle,
							label: t("waferMap.legendDefect"),
							dot: true
						})
					]
				})]
			}),
			hoveredDie && /* @__PURE__ */ jsxs("div", {
				className: cn("absolute bottom-3 right-3", "rounded-lg border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur-sm"),
				children: [/* @__PURE__ */ jsxs("p", {
					className: "text-xs text-muted-foreground",
					children: [
						"Die (",
						hoveredDie.xIndex,
						", ",
						hoveredDie.yIndex,
						")"
					]
				}), (() => {
					const die = dies.find((d) => d.xIndex === hoveredDie.xIndex && d.yIndex === hoveredDie.yIndex);
					if (!die) return null;
					return /* @__PURE__ */ jsxs("p", {
						className: "text-xs font-medium text-foreground",
						children: [
							die.defectCount,
							" defect",
							die.defectCount !== 1 ? "s" : "",
							" ·",
							" ",
							die.status
						]
					});
				})()]
			})
		]
	});
}
function LegendItem({ color, label, dot = false }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex items-center gap-2",
		children: [dot ? /* @__PURE__ */ jsx("span", {
			className: "inline-block h-2.5 w-2.5 rounded-full",
			style: { backgroundColor: color }
		}) : /* @__PURE__ */ jsx("span", {
			className: "inline-block h-2.5 w-4 rounded-sm",
			style: { backgroundColor: color }
		}), /* @__PURE__ */ jsx("span", {
			className: "text-[11px] text-muted-foreground",
			children: label
		})]
	});
}
//#endregion
export { WaferMapPage as default };

//# sourceMappingURL=wafer-map-BvLaWFCN.js.map