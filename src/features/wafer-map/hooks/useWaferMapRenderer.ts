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
 */

import { useCallback, useEffect, useRef } from 'react';
import type { WaferGeometry, DieMapEntry, OrientationMarkLocation } from '@/core/models/wafer';
import type { DefectRecord } from '@/core/models/defect';
import { buildClassColorMap, buildSequentialLUT } from '@/core/utils/color-scales';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaferMapViewport {
  /** Center X in wafer-space micrometers. */
  centerX: number;
  /** Center Y in wafer-space micrometers. */
  centerY: number;
  /** Pixels per micrometer. */
  scale: number;
  /** Canvas width in CSS pixels. */
  canvasWidth: number;
  /** Canvas height in CSS pixels. */
  canvasHeight: number;
}

export interface WaferMapColorScheme {
  diePass: string;
  dieFail: string;
  dieUntested: string;
  defectParticle: string;
  waferBg: string;
  waferEdge: string;
  waferNotch: string;
}

export interface WaferMapSelection {
  selectedDefectIds: ReadonlySet<number>;
  highlightedDefectId: number | null;
  hoveredDie: { xIndex: number; yIndex: number } | null;
}

export type WaferMapColorMode = 'uniform' | 'byClass' | 'bySize' | 'byCluster';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function readCSSColor(prop: string, fallback: string): string {
  const val = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  return val || fallback;
}

export function readColorScheme(): WaferMapColorScheme {
  return {
    diePass: readCSSColor('--color-die-pass', '#22c55e'),
    dieFail: readCSSColor('--color-die-fail', '#ef4444'),
    dieUntested: readCSSColor('--color-die-untested', '#94a3b8'),
    defectParticle: readCSSColor('--color-defect-particle', '#f97316'),
    waferBg: readCSSColor('--color-wafer-bg', '#f1f5f9'),
    waferEdge: readCSSColor('--color-wafer-edge', '#64748b'),
    waferNotch: readCSSColor('--color-wafer-notch', '#334155'),
  };
}

// ---------------------------------------------------------------------------
// Coordinate transforms
// ---------------------------------------------------------------------------

/** Convert wafer-space (um) point to canvas pixel coordinates. */
function waferToCanvas(
  wx: number,
  wy: number,
  viewport: WaferMapViewport,
): [number, number] {
  const px = (wx - viewport.centerX) * viewport.scale + viewport.canvasWidth / 2;
  const py = (wy - viewport.centerY) * viewport.scale + viewport.canvasHeight / 2;
  return [px, py];
}

/** Convert canvas pixel coordinates to wafer-space (um). */
export function canvasToWafer(
  px: number,
  py: number,
  viewport: WaferMapViewport,
): [number, number] {
  const wx = (px - viewport.canvasWidth / 2) / viewport.scale + viewport.centerX;
  const wy = (py - viewport.canvasHeight / 2) / viewport.scale + viewport.centerY;
  return [wx, wy];
}

// ---------------------------------------------------------------------------
// Die color computation
// ---------------------------------------------------------------------------

/** Pre-compute the maximum defect count across all dies for gradient normalization. */
function computeMaxDefects(dies: readonly DieMapEntry[]): number {
  let max = 0;
  for (let i = 0; i < dies.length; i++) {
    if (dies[i].defectCount > max) max = dies[i].defectCount;
  }
  return max;
}

/**
 * Linearly interpolate a color between green (pass) and red (fail) based on
 * defect density. Dies with zero defects get the pass color.
 */
function dieColor(
  die: DieMapEntry,
  maxDefects: number,
  colors: WaferMapColorScheme,
): string {
  if (die.status === 'untested' || die.status === 'skipped') return colors.dieUntested;
  if (die.status === 'failed') return colors.dieFail;
  if (die.defectCount === 0 || maxDefects === 0) return colors.diePass;

  // Gradient from pass -> fail based on normalized defect count
  const t = Math.min(die.defectCount / maxDefects, 1);

  // Parse pass and fail colors to interpolate via RGBA
  const pass = parseColor(colors.diePass);
  const fail = parseColor(colors.dieFail);

  if (!pass || !fail) {
    return t > 0.5 ? colors.dieFail : colors.diePass;
  }

  const r = Math.round(pass.r + (fail.r - pass.r) * t);
  const g = Math.round(pass.g + (fail.g - pass.g) * t);
  const b = Math.round(pass.b + (fail.b - pass.b) * t);
  return `rgb(${r},${g},${b})`;
}

/** Parse a CSS color string into RGB components using an offscreen canvas. */
let _colorCtx: CanvasRenderingContext2D | null = null;
function parseColor(css: string): { r: number; g: number; b: number } | null {
  if (!_colorCtx) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    _colorCtx = c.getContext('2d');
  }
  if (!_colorCtx) return null;
  _colorCtx.clearRect(0, 0, 1, 1);
  _colorCtx.fillStyle = css;
  _colorCtx.fillRect(0, 0, 1, 1);
  const d = _colorCtx.getImageData(0, 0, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2] };
}

// ---------------------------------------------------------------------------
// Notch drawing
// ---------------------------------------------------------------------------

function drawNotch(
  ctx: CanvasRenderingContext2D,
  viewport: WaferMapViewport,
  geometry: WaferGeometry,
  color: string,
): void {
  const location: OrientationMarkLocation = geometry.orientationMarkLocation ?? 'DOWN';
  const radius = geometry.waferDiameter / 2;
  const notchDepth = radius * 0.04;
  const notchWidth = radius * 0.06;

  // Notch is relative to the wafer center (sampleCenterLocation)
  const [scx, scy] = geometry.sampleCenterLocation;
  let nx: number;
  let ny: number;
  let angle: number;

  switch (location) {
    case 'DOWN':
      nx = scx;
      ny = scy + radius;
      angle = Math.PI / 2;
      break;
    case 'UP':
      nx = scx;
      ny = scy - radius;
      angle = -Math.PI / 2;
      break;
    case 'LEFT':
      nx = scx - radius;
      ny = scy;
      angle = Math.PI;
      break;
    case 'RIGHT':
      nx = scx + radius;
      ny = scy;
      angle = 0;
      break;
  }

  // Notch triangle points in wafer space
  const [cx, cy] = waferToCanvas(nx, ny, viewport);
  const depthPx = notchDepth * viewport.scale;
  const widthPx = notchWidth * viewport.scale;

  ctx.beginPath();

  // Draw a small V-shaped notch
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Two points on the wafer edge, one point toward center
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
  ctx.lineWidth = Math.max(2, viewport.scale * radius * 0.005);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Frustum culling
// ---------------------------------------------------------------------------

/** Check if a rectangle in canvas space is visible (intersects the canvas). */
function isRectVisible(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number,
): boolean {
  return x + w >= 0 && x <= canvasW && y + h >= 0 && y <= canvasH;
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export function renderWaferMap(
  ctx: CanvasRenderingContext2D,
  viewport: WaferMapViewport,
  geometry: WaferGeometry,
  dies: readonly DieMapEntry[],
  defects: readonly DefectRecord[],
  colorScheme: WaferMapColorScheme,
  selection: WaferMapSelection,
  filteredDefectIds?: ReadonlySet<number> | null,
  colorMode: WaferMapColorMode = 'uniform',
): void {
  const { canvasWidth, canvasHeight } = viewport;
  const dpr = window.devicePixelRatio || 1;

  // 1. Clear canvas
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 2. Draw wafer outline (circle from geometry.waferDiameter)
  // Wafer center is at sampleCenterLocation in the same coordinate system as defect xAbs/yAbs
  const waferRadius = geometry.waferDiameter / 2;
  const [sampleCx, sampleCy] = geometry.sampleCenterLocation;
  const [waferCx, waferCy] = waferToCanvas(sampleCx, sampleCy, viewport);
  const radiusPx = waferRadius * viewport.scale;

  // Wafer fill
  ctx.beginPath();
  ctx.arc(waferCx, waferCy, radiusPx, 0, Math.PI * 2);
  ctx.fillStyle = colorScheme.waferBg;
  ctx.fill();

  // Wafer edge
  ctx.beginPath();
  ctx.arc(waferCx, waferCy, radiusPx, 0, Math.PI * 2);
  ctx.strokeStyle = colorScheme.waferEdge;
  ctx.lineWidth = Math.max(1.5, viewport.scale * waferRadius * 0.003);
  ctx.stroke();

  // 3. Draw notch indicator
  if (geometry.orientationMarkType !== 'NONE') {
    drawNotch(ctx, viewport, geometry, colorScheme.waferNotch);
  }

  // Clip to wafer circle for die drawing
  ctx.save();
  ctx.beginPath();
  ctx.arc(waferCx, waferCy, radiusPx, 0, Math.PI * 2);
  ctx.clip();

  // 4. Draw die grid rectangles colored by defect count
  const maxDefects = computeMaxDefects(dies);
  const [pitchX, pitchY] = geometry.diePitch;
  const [originX, originY] = geometry.dieOrigin;
  const dieWidthPx = pitchX * viewport.scale;
  const dieHeightPx = pitchY * viewport.scale;

  for (let i = 0; i < dies.length; i++) {
    const die = dies[i];

    // Compute die center in wafer-space (same coordinate system as defect xAbs/yAbs)
    const dieWx = originX + die.xIndex * pitchX + pitchX / 2;
    const dieWy = originY + die.yIndex * pitchY + pitchY / 2;
    const [dx, dy] = waferToCanvas(dieWx, dieWy, viewport);
    const rx = dx - dieWidthPx / 2;
    const ry = dy - dieHeightPx / 2;

    // Frustum cull
    if (!isRectVisible(rx, ry, dieWidthPx, dieHeightPx, canvasWidth, canvasHeight)) {
      continue;
    }

    // Die fill
    ctx.fillStyle = dieColor(die, maxDefects, colorScheme);
    ctx.fillRect(rx, ry, dieWidthPx, dieHeightPx);

    // Die border
    ctx.strokeStyle = colorScheme.waferEdge;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(rx, ry, dieWidthPx, dieHeightPx);

    // Hovered die highlight
    if (
      selection.hoveredDie &&
      selection.hoveredDie.xIndex === die.xIndex &&
      selection.hoveredDie.yIndex === die.yIndex
    ) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx + 1, ry + 1, dieWidthPx - 2, dieHeightPx - 2);
    }
  }

  ctx.restore(); // remove wafer clip

  // 5. Draw defects as dots - batch render using single beginPath()/fill()
  const defectRadius = Math.max(2, Math.min(5, viewport.scale * pitchX * 0.02));

  // Batch: normal (non-selected, non-highlighted) defects
  // If filters are active, draw in two passes: dimmed (non-matching) + full (matching)
  const hasFilter = filteredDefectIds != null && filteredDefectIds.size > 0;

  if (hasFilter) {
    // Pass 1: dimmed defects (not matching filter)
    ctx.beginPath();
    ctx.globalAlpha = 0.1;
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

  // Pass 2 (or only pass): matching defects at full opacity, colored by mode
  if (colorMode === 'uniform') {
    // Single color for all defects
    ctx.beginPath();
    ctx.fillStyle = colorScheme.defectParticle;
    for (let i = 0; i < defects.length; i++) {
      const d = defects[i];
      if (hasFilter && !filteredDefectIds!.has(d.defectId)) continue;
      if (selection.selectedDefectIds.has(d.defectId)) continue;
      if (selection.highlightedDefectId === d.defectId) continue;
      const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
      if (px + defectRadius < 0 || px - defectRadius > canvasWidth || py + defectRadius < 0 || py - defectRadius > canvasHeight) continue;
      ctx.moveTo(px + defectRadius, py);
      ctx.arc(px, py, defectRadius, 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (colorMode === 'byClass' || colorMode === 'byCluster') {
    // Group defects by class/cluster, render one batch per color
    const classNums = defects.map((d) => (colorMode === 'byClass' ? d.classNumber : d.clusterNumber) ?? 0);
    const classColorMap = buildClassColorMap([...new Set(classNums)]);

    for (const [classNum, color] of classColorMap) {
      ctx.beginPath();
      ctx.fillStyle = color;
      for (let i = 0; i < defects.length; i++) {
        const d = defects[i];
        const key = (colorMode === 'byClass' ? d.classNumber : d.clusterNumber) ?? 0;
        if (key !== classNum) continue;
        if (hasFilter && !filteredDefectIds!.has(d.defectId)) continue;
        if (selection.selectedDefectIds.has(d.defectId)) continue;
        if (selection.highlightedDefectId === d.defectId) continue;
        const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
        if (px + defectRadius < 0 || px - defectRadius > canvasWidth || py + defectRadius < 0 || py - defectRadius > canvasHeight) continue;
        ctx.moveTo(px + defectRadius, py);
        ctx.arc(px, py, defectRadius, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  } else if (colorMode === 'bySize') {
    // Sequential color scale based on defect size
    const sizes = defects.map((d) => d.size ?? 0);
    let sizeMin = Infinity, sizeMax = -Infinity;
    for (const s of sizes) { if (s < sizeMin) sizeMin = s; if (s > sizeMax) sizeMax = s; }
    const sizeRange = sizeMax - sizeMin || 1;
    const lut = buildSequentialLUT(64);

    // Render each defect individually with its color
    for (let i = 0; i < defects.length; i++) {
      const d = defects[i];
      if (hasFilter && filteredDefectIds && !filteredDefectIds.has(d.defectId)) continue;
      if (selection.selectedDefectIds.has(d.defectId)) continue;
      if (selection.highlightedDefectId === d.defectId) continue;
      const [px, py] = waferToCanvas(d.xAbs, d.yAbs, viewport);
      if (px + defectRadius < 0 || px - defectRadius > canvasWidth || py + defectRadius < 0 || py - defectRadius > canvasHeight) continue;

      const t = ((d.size ?? 0) - sizeMin) / sizeRange;
      const lutIdx = Math.min(lut.length - 1, Math.max(0, Math.floor(t * (lut.length - 1))));
      ctx.fillStyle = lut[lutIdx];
      ctx.beginPath();
      ctx.arc(px, py, defectRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. Draw selected defects on top (slightly larger, with outline)
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

    // White outline for selected
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 7. Draw highlighted defect with prominent ring
  if (selection.highlightedDefectId !== null) {
    const hd = defects.find((d) => d.defectId === selection.highlightedDefectId);
    if (hd) {
      const [px, py] = waferToCanvas(hd.xAbs, hd.yAbs, viewport);
      const hlRadius = defectRadius * 2;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(px, py, hlRadius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Fill
      ctx.beginPath();
      ctx.arc(px, py, hlRadius, 0, Math.PI * 2);
      ctx.fillStyle = colorScheme.defectParticle;
      ctx.fill();

      // Inner ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Hit-testing helpers
// ---------------------------------------------------------------------------

/** Find the defect closest to a canvas point, within a pixel threshold. */
export function hitTestDefect(
  canvasX: number,
  canvasY: number,
  viewport: WaferMapViewport,
  defects: readonly DefectRecord[],
  hitRadiusPx: number = 8,
): DefectRecord | null {
  const hitRadiusSq = hitRadiusPx * hitRadiusPx;
  let best: DefectRecord | null = null;
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

/** Find the die at a canvas point. */
export function hitTestDie(
  canvasX: number,
  canvasY: number,
  viewport: WaferMapViewport,
  geometry: WaferGeometry,
  dies: readonly DieMapEntry[],
): DieMapEntry | null {
  const [wx, wy] = canvasToWafer(canvasX, canvasY, viewport);
  const [pitchX, pitchY] = geometry.diePitch;
  const [originX, originY] = geometry.dieOrigin;
  const [sampleCx, sampleCy] = geometry.sampleCenterLocation;

  for (let i = 0; i < dies.length; i++) {
    const die = dies[i];
    const dieLeft = sampleCx + originX + die.xIndex * pitchX;
    const dieTop = sampleCy + originY + die.yIndex * pitchY;

    if (
      wx >= dieLeft &&
      wx <= dieLeft + pitchX &&
      wy >= dieTop &&
      wy <= dieTop + pitchY
    ) {
      return die;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useWaferMapRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  viewport: WaferMapViewport,
  geometry: WaferGeometry | null,
  dies: readonly DieMapEntry[],
  defects: readonly DefectRecord[],
  selection: WaferMapSelection,
  filteredDefectIds?: ReadonlySet<number> | null,
  colorMode: WaferMapColorMode = 'uniform',
): void {
  const rafRef = useRef<number>(0);
  const colorSchemeRef = useRef<WaferMapColorScheme>(readColorScheme());

  // Refresh color scheme when theme may have changed (observe class mutations)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      colorSchemeRef.current = readColorScheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !geometry) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Refresh colors each frame for live theme switching
    colorSchemeRef.current = readColorScheme();

    renderWaferMap(
      ctx,
      viewport,
      geometry,
      dies,
      defects,
      colorSchemeRef.current,
      selection,
      filteredDefectIds,
      colorMode,
    );
  }, [canvasRef, viewport, geometry, dies, defects, selection, filteredDefectIds, colorMode]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);
}
