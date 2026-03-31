import { useCallback, useEffect, useRef } from "react";
//#region src/core/utils/color-scales.ts
/**
* Color scale utilities for wafer map defect visualization.
*
* Provides categorical (class-based) and sequential (size-based) color scales.
*/ /** 8-color categorical palette for defect classes (visually distinct). */ var CATEGORICAL_PALETTE = [
	"#2563eb",
	"#dc2626",
	"#16a34a",
	"#ca8a04",
	"#9333ea",
	"#0891b2",
	"#e11d48",
	"#65a30d"
];
/**
* Build a Map<classNumber, color> from class numbers.
*/ function buildClassColorMap(classNumbers) {
	const map = /* @__PURE__ */ new Map();
	[...new Set(classNumbers)].sort((a, b) => a - b).forEach((cn, i) => {
		map.set(cn, CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]);
	});
	return map;
}
/**
* Interpolate a sequential color scale from blue to red.
*
* @param t - Normalized value 0..1 (0 = min, 1 = max)
* @returns CSS color string
*/ function sequentialColor(t) {
	const clamped = Math.max(0, Math.min(1, t));
	let r, g, b;
	if (clamped < .25) {
		const s = clamped / .25;
		r = 0;
		g = Math.round(s * 200);
		b = Math.round(255 - s * 55);
	} else if (clamped < .5) {
		const s = (clamped - .25) / .25;
		r = 0;
		g = Math.round(200 + s * 55);
		b = Math.round(200 - s * 200);
	} else if (clamped < .75) {
		const s = (clamped - .5) / .25;
		r = Math.round(s * 255);
		g = 255;
		b = 0;
	} else {
		const s = (clamped - .75) / .25;
		r = 255;
		g = Math.round(255 - s * 255);
		b = 0;
	}
	return `rgb(${r},${g},${b})`;
}
/**
* Precompute a sequential color lookup table for fast rendering.
*
* @param steps - Number of discrete colors (default 256)
* @returns Array of CSS color strings
*/ function buildSequentialLUT(steps = 256) {
	return Array.from({ length: steps }, (_, i) => sequentialColor(i / (steps - 1)));
}
//#endregion
//#region src/features/wafer-map/hooks/useWaferMapRenderer.ts
/**
* Pure rendering function + React hook for drawing the wafer map on an HTML5 Canvas.
*
* The renderer converts wafer-space coordinates (micrometers) into canvas pixels
* using the viewport transform, then draws the wafer outline, die grid, and
* defect dots in a single composited frame.
*
* Performance:
* - Dies outside the visible viewport are frustum-culled
* - All defect dots are batched into a single beginPath()/fill() call
* - Re-renders are throttled via requestAnimationFrame
*/ function readCSSColor(prop, fallback) {
	return getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback;
}
function readColorScheme() {
	return {
		diePass: readCSSColor("--color-die-pass", "#22c55e"),
		dieFail: readCSSColor("--color-die-fail", "#ef4444"),
		dieUntested: readCSSColor("--color-die-untested", "#94a3b8"),
		defectParticle: readCSSColor("--color-defect-particle", "#f97316"),
		waferBg: readCSSColor("--color-wafer-bg", "#f1f5f9"),
		waferEdge: readCSSColor("--color-wafer-edge", "#64748b"),
		waferNotch: readCSSColor("--color-wafer-notch", "#334155")
	};
}
/** Convert wafer-space (um) point to canvas pixel coordinates. */ function waferToCanvas(wx, wy, viewport) {
	return [(wx - viewport.centerX) * viewport.scale + viewport.canvasWidth / 2, (wy - viewport.centerY) * viewport.scale + viewport.canvasHeight / 2];
}
/** Convert canvas pixel coordinates to wafer-space (um). */ function canvasToWafer(px, py, viewport) {
	return [(px - viewport.canvasWidth / 2) / viewport.scale + viewport.centerX, (py - viewport.canvasHeight / 2) / viewport.scale + viewport.centerY];
}
/** Pre-compute the maximum defect count across all dies for gradient normalization. */ function computeMaxDefects(dies) {
	let max = 0;
	for (let i = 0; i < dies.length; i++) if (dies[i].defectCount > max) max = dies[i].defectCount;
	return max;
}
/**
* Linearly interpolate a color between green (pass) and red (fail) based on
* defect density. Dies with zero defects get the pass color.
*/ function dieColor(die, maxDefects, colors) {
	if (die.status === "untested" || die.status === "skipped") return colors.dieUntested;
	if (die.status === "failed") return colors.dieFail;
	if (die.defectCount === 0 || maxDefects === 0) return colors.diePass;
	const t = Math.min(die.defectCount / maxDefects, 1);
	const pass = parseColor(colors.diePass);
	const fail = parseColor(colors.dieFail);
	if (!pass || !fail) return t > .5 ? colors.dieFail : colors.diePass;
	return `rgb(${Math.round(pass.r + (fail.r - pass.r) * t)},${Math.round(pass.g + (fail.g - pass.g) * t)},${Math.round(pass.b + (fail.b - pass.b) * t)})`;
}
/** Parse a CSS color string into RGB components using an offscreen canvas. */ var _colorCtx = null;
function parseColor(css) {
	if (!_colorCtx) {
		const c = document.createElement("canvas");
		c.width = 1;
		c.height = 1;
		_colorCtx = c.getContext("2d");
	}
	if (!_colorCtx) return null;
	_colorCtx.clearRect(0, 0, 1, 1);
	_colorCtx.fillStyle = css;
	_colorCtx.fillRect(0, 0, 1, 1);
	const d = _colorCtx.getImageData(0, 0, 1, 1).data;
	return {
		r: d[0],
		g: d[1],
		b: d[2]
	};
}
function drawNotch(ctx, viewport, geometry, color) {
	const location = geometry.orientationMarkLocation ?? "DOWN";
	const radius = geometry.waferDiameter / 2;
	const notchDepth = radius * .04;
	const notchWidth = radius * .06;
	const [scx, scy] = geometry.sampleCenterLocation;
	let nx;
	let ny;
	let angle;
	switch (location) {
		case "DOWN":
			nx = scx;
			ny = scy + radius;
			angle = Math.PI / 2;
			break;
		case "UP":
			nx = scx;
			ny = scy - radius;
			angle = -Math.PI / 2;
			break;
		case "LEFT":
			nx = scx - radius;
			ny = scy;
			angle = Math.PI;
			break;
		case "RIGHT":
			nx = scx + radius;
			ny = scy;
			angle = 0;
			break;
	}
	const [cx, cy] = waferToCanvas(nx, ny, viewport);
	const depthPx = notchDepth * viewport.scale;
	const widthPx = notchWidth * viewport.scale;
	ctx.beginPath();
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const lx = cx - sin * widthPx;
	const ly = cy + cos * widthPx;
	const rx = cx + sin * widthPx;
	const ry = cy - cos * widthPx;
	const tx = cx - cos * depthPx;
	const ty = cy - sin * depthPx;
	ctx.moveTo(lx, ly);
	ctx.lineTo(tx, ty);
	ctx.lineTo(rx, ry);
	ctx.strokeStyle = color;
	ctx.lineWidth = Math.max(2, viewport.scale * radius * .005);
	ctx.stroke();
}
/** Check if a rectangle in canvas space is visible (intersects the canvas). */ function isRectVisible(x, y, w, h, canvasW, canvasH) {
	return x + w >= 0 && x <= canvasW && y + h >= 0 && y <= canvasH;
}
function renderWaferMap(ctx, viewport, geometry, dies, defects, colorScheme, selection, filteredDefectIds, colorMode = "uniform") {
	const { canvasWidth, canvasHeight } = viewport;
	const dpr = window.devicePixelRatio || 1;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
	const waferRadius = geometry.waferDiameter / 2;
	const [sampleCx, sampleCy] = geometry.sampleCenterLocation;
	const [waferCx, waferCy] = waferToCanvas(sampleCx, sampleCy, viewport);
	const radiusPx = waferRadius * viewport.scale;
	ctx.beginPath();
	ctx.arc(waferCx, waferCy, radiusPx, 0, Math.PI * 2);
	ctx.fillStyle = colorScheme.waferBg;
	ctx.fill();
	ctx.beginPath();
	ctx.arc(waferCx, waferCy, radiusPx, 0, Math.PI * 2);
	ctx.strokeStyle = colorScheme.waferEdge;
	ctx.lineWidth = Math.max(1.5, viewport.scale * waferRadius * .003);
	ctx.stroke();
	if (geometry.orientationMarkType !== "NONE") drawNotch(ctx, viewport, geometry, colorScheme.waferNotch);
	ctx.save();
	ctx.beginPath();
	ctx.arc(waferCx, waferCy, radiusPx, 0, Math.PI * 2);
	ctx.clip();
	const maxDefects = computeMaxDefects(dies);
	const [pitchX, pitchY] = geometry.diePitch;
	const [originX, originY] = geometry.dieOrigin;
	const dieWidthPx = pitchX * viewport.scale;
	const dieHeightPx = pitchY * viewport.scale;
	for (let i = 0; i < dies.length; i++) {
		const die = dies[i];
		const [dx, dy] = waferToCanvas(originX + die.xIndex * pitchX + pitchX / 2, originY + die.yIndex * pitchY + pitchY / 2, viewport);
		const rx = dx - dieWidthPx / 2;
		const ry = dy - dieHeightPx / 2;
		if (!isRectVisible(rx, ry, dieWidthPx, dieHeightPx, canvasWidth, canvasHeight)) continue;
		ctx.fillStyle = dieColor(die, maxDefects, colorScheme);
		ctx.fillRect(rx, ry, dieWidthPx, dieHeightPx);
		ctx.strokeStyle = colorScheme.waferEdge;
		ctx.lineWidth = .5;
		ctx.strokeRect(rx, ry, dieWidthPx, dieHeightPx);
		if (selection.hoveredDie && selection.hoveredDie.xIndex === die.xIndex && selection.hoveredDie.yIndex === die.yIndex) {
			ctx.strokeStyle = "rgba(255,255,255,0.9)";
			ctx.lineWidth = 2;
			ctx.strokeRect(rx + 1, ry + 1, dieWidthPx - 2, dieHeightPx - 2);
		}
	}
	ctx.restore();
	const defectRadius = Math.max(2, Math.min(5, viewport.scale * pitchX * .02));
	const hasFilter = filteredDefectIds != null && filteredDefectIds.size > 0;
	if (hasFilter) {
		ctx.beginPath();
		ctx.globalAlpha = .1;
		ctx.fillStyle = colorScheme.defectParticle;
		for (let i = 0; i < defects.length; i++) {
			const d = defects[i];
			if (filteredDefectIds.has(d.defectId)) continue;
			if (selection.selectedDefectIds.has(d.defectId)) continue;
			if (selection.highlightedDefectId === d.defectId) continue;
			const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
			if (px + defectRadius < 0 || px - defectRadius > canvasWidth || py + defectRadius < 0 || py - defectRadius > canvasHeight) continue;
			ctx.moveTo(px + defectRadius, py);
			ctx.arc(px, py, defectRadius, 0, Math.PI * 2);
		}
		ctx.fill();
		ctx.globalAlpha = 1;
	}
	if (colorMode === "uniform") {
		ctx.beginPath();
		ctx.fillStyle = colorScheme.defectParticle;
		for (let i = 0; i < defects.length; i++) {
			const d = defects[i];
			if (hasFilter && !filteredDefectIds.has(d.defectId)) continue;
			if (selection.selectedDefectIds.has(d.defectId)) continue;
			if (selection.highlightedDefectId === d.defectId) continue;
			const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
			if (px + defectRadius < 0 || px - defectRadius > canvasWidth || py + defectRadius < 0 || py - defectRadius > canvasHeight) continue;
			ctx.moveTo(px + defectRadius, py);
			ctx.arc(px, py, defectRadius, 0, Math.PI * 2);
		}
		ctx.fill();
	} else if (colorMode === "byClass" || colorMode === "byCluster") {
		const classNums = defects.map((d) => (colorMode === "byClass" ? d.classNumber : d.clusterNumber) ?? 0);
		const classColorMap = buildClassColorMap([...new Set(classNums)]);
		for (const [classNum, color] of classColorMap) {
			ctx.beginPath();
			ctx.fillStyle = color;
			for (let i = 0; i < defects.length; i++) {
				const d = defects[i];
				if (((colorMode === "byClass" ? d.classNumber : d.clusterNumber) ?? 0) !== classNum) continue;
				if (hasFilter && !filteredDefectIds.has(d.defectId)) continue;
				if (selection.selectedDefectIds.has(d.defectId)) continue;
				if (selection.highlightedDefectId === d.defectId) continue;
				const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
				if (px + defectRadius < 0 || px - defectRadius > canvasWidth || py + defectRadius < 0 || py - defectRadius > canvasHeight) continue;
				ctx.moveTo(px + defectRadius, py);
				ctx.arc(px, py, defectRadius, 0, Math.PI * 2);
			}
			ctx.fill();
		}
	} else if (colorMode === "bySize") {
		const BUCKET_COUNT = 32;
		const lut = buildSequentialLUT(BUCKET_COUNT);
		let sizeMin = Infinity, sizeMax = -Infinity;
		for (let i = 0; i < defects.length; i++) {
			const s = defects[i].size ?? 0;
			if (s < sizeMin) sizeMin = s;
			if (s > sizeMax) sizeMax = s;
		}
		const sizeRange = sizeMax - sizeMin || 1;
		const buckets = Array.from({ length: BUCKET_COUNT }, () => []);
		for (let i = 0; i < defects.length; i++) {
			const d = defects[i];
			if (hasFilter && filteredDefectIds && !filteredDefectIds.has(d.defectId)) continue;
			if (selection.selectedDefectIds.has(d.defectId)) continue;
			if (selection.highlightedDefectId === d.defectId) continue;
			const t = ((d.size ?? 0) - sizeMin) / sizeRange;
			buckets[Math.min(BUCKET_COUNT - 1, Math.max(0, Math.floor(t * (BUCKET_COUNT - 1))))].push(i);
		}
		for (let b = 0; b < BUCKET_COUNT; b++) {
			if (buckets[b].length === 0) continue;
			ctx.beginPath();
			ctx.fillStyle = lut[b];
			for (const di of buckets[b]) {
				const d = defects[di];
				const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
				if (px + defectRadius < 0 || px - defectRadius > canvasWidth || py + defectRadius < 0 || py - defectRadius > canvasHeight) continue;
				ctx.moveTo(px + defectRadius, py);
				ctx.arc(px, py, defectRadius, 0, Math.PI * 2);
			}
			ctx.fill();
		}
	}
	if (selection.selectedDefectIds.size > 0) {
		const selectedRadius = defectRadius * 1.5;
		ctx.beginPath();
		ctx.fillStyle = colorScheme.defectParticle;
		for (let i = 0; i < defects.length; i++) {
			const d = defects[i];
			if (!selection.selectedDefectIds.has(d.defectId)) continue;
			if (selection.highlightedDefectId === d.defectId) continue;
			const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
			ctx.moveTo(px + selectedRadius, py);
			ctx.arc(px, py, selectedRadius, 0, Math.PI * 2);
		}
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.9)";
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}
	if (selection.highlightedDefectId !== null) {
		const hd = defects.find((d) => d.defectId === selection.highlightedDefectId);
		if (hd) {
			const [px, py] = waferToCanvas(hd.xAbs, hd.yAbs, viewport);
			const hlRadius = defectRadius * 2;
			ctx.beginPath();
			ctx.arc(px, py, hlRadius + 3, 0, Math.PI * 2);
			ctx.strokeStyle = "rgba(255,255,255,0.6)";
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(px, py, hlRadius, 0, Math.PI * 2);
			ctx.fillStyle = colorScheme.defectParticle;
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 2;
			ctx.stroke();
		}
	}
}
/** Find the defect closest to a canvas point, within a pixel threshold. */ function hitTestDefect(canvasX, canvasY, viewport, defects, hitRadiusPx = 8) {
	const hitRadiusSq = hitRadiusPx * hitRadiusPx;
	let best = null;
	let bestDistSq = Infinity;
	for (let i = 0; i < defects.length; i++) {
		const d = defects[i];
		const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
		const dx = px - canvasX;
		const dy = py - canvasY;
		const distSq = dx * dx + dy * dy;
		if (distSq < hitRadiusSq && distSq < bestDistSq) {
			bestDistSq = distSq;
			best = d;
		}
	}
	return best;
}
/** Find the die at a canvas point. */ function hitTestDie(canvasX, canvasY, viewport, geometry, dies) {
	const [wx, wy] = canvasToWafer(canvasX, canvasY, viewport);
	const [pitchX, pitchY] = geometry.diePitch;
	const [originX, originY] = geometry.dieOrigin;
	for (let i = 0; i < dies.length; i++) {
		const die = dies[i];
		const dieLeft = originX + die.xIndex * pitchX;
		const dieTop = originY + die.yIndex * pitchY;
		if (wx >= dieLeft && wx <= dieLeft + pitchX && wy >= dieTop && wy <= dieTop + pitchY) return die;
	}
	return null;
}
function useWaferMapRenderer(canvasRef, viewport, geometry, dies, defects, selection, filteredDefectIds, colorMode = "uniform") {
	const rafRef = useRef(0);
	const colorSchemeRef = useRef(readColorScheme());
	useEffect(() => {
		const observer = new MutationObserver(() => {
			colorSchemeRef.current = readColorScheme();
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"]
		});
		return () => observer.disconnect();
	}, []);
	const render = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !geometry) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		colorSchemeRef.current = readColorScheme();
		renderWaferMap(ctx, viewport, geometry, dies, defects, colorSchemeRef.current, selection, filteredDefectIds, colorMode);
	}, [
		canvasRef,
		viewport,
		geometry,
		dies,
		defects,
		selection,
		filteredDefectIds,
		colorMode
	]);
	useEffect(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(render);
		return () => cancelAnimationFrame(rafRef.current);
	}, [render]);
}
//#endregion
export { renderWaferMap as a, readColorScheme as i, hitTestDefect as n, useWaferMapRenderer as o, hitTestDie as r, canvasToWafer as t };

//# sourceMappingURL=useWaferMapRenderer-Dcn7o9Dv.js.map