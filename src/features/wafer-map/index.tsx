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
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleDot, Maximize, ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';
import { useInspectionStore } from '@/stores';
import {
  useWaferMapRenderer,
  canvasToWafer,
  hitTestDefect,
  hitTestDie,
  readColorScheme,
} from './hooks/useWaferMapRenderer';
import { useWaferZoomPan } from './hooks/useWaferZoomPan';
import { ColorModeSelector } from './components/ColorModeSelector';
import type { WaferMapSelection, WaferMapColorMode } from './hooks/useWaferMapRenderer';

// ---------------------------------------------------------------------------
// Selection rectangle types
// ---------------------------------------------------------------------------

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ZOOM_STEP = 1.3;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WaferMapPage() {
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [colorMode, setColorMode] = useState<WaferMapColorMode>('uniform');
  const [rotation, setRotation] = useState(0);

  // Rectangle brush selection state
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const isSelectingRef = useRef(false);

  // Derive active file data
  const activeFile = activeFileId ? files.get(activeFileId) ?? null : null;
  const geometry = activeFile?.waferGeometry ?? null;
  const dies = activeFile?.dieMap ?? [];
  const defects = activeFile?.defects ?? [];

  // Zoom/pan
  const { viewport, eventHandlers, fitToWindow, setZoom, isPanning } =
    useWaferZoomPan(canvasRef, geometry);

  // Selection state for renderer
  const selection: WaferMapSelection = useMemo(
    () => ({
      selectedDefectIds,
      highlightedDefectId,
      hoveredDie,
    }),
    [selectedDefectIds, highlightedDefectId, hoveredDie],
  );

  // Render
  useWaferMapRenderer(canvasRef, viewport, geometry, dies, defects, selection, filteredDefectIds, colorMode);

  // -------------------------------------------------------------------------
  // Interaction handlers
  // -------------------------------------------------------------------------

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!geometry) return;
      // Don't process click if we just finished a selection drag
      if (e.shiftKey) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Defect hit test first (takes priority over die)
      const defect = hitTestDefect(cx, cy, viewport, defects);
      if (defect) {
        highlightDefect(defect.defectId);
        return;
      }

      // Clear highlight if clicked on empty space
      highlightDefect(null);
    },
    [viewport, defects, geometry, highlightDefect],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!geometry) return;
      if (isPanning) return; // don't hit-test while panning
      if (isSelectingRef.current) return; // don't hit-test while selecting

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const die = hitTestDie(cx, cy, viewport, geometry, dies);
      if (die) {
        setHoveredDie({ xIndex: die.xIndex, yIndex: die.yIndex });
      } else {
        setHoveredDie(null);
      }
    },
    [viewport, geometry, dies, isPanning, setHoveredDie],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredDie(null);
    // Cancel any active selection on mouse leave
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      setSelectionRect(null);
    }
  }, [setHoveredDie]);

  // -------------------------------------------------------------------------
  // Rectangle brush selection handlers (Shift+drag)
  // -------------------------------------------------------------------------

  const handleSelectionMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!e.shiftKey || e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      isSelectingRef.current = true;
      setSelectionRect({ startX: cx, startY: cy, endX: cx, endY: cy });
    },
    [],
  );

  const handleSelectionMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isSelectingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      setSelectionRect((prev) =>
        prev ? { ...prev, endX: cx, endY: cy } : null,
      );
    },
    [],
  );

  const handleSelectionMouseUp = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isSelectingRef.current || !selectionRect) {
        isSelectingRef.current = false;
        return;
      }

      isSelectingRef.current = false;

      // Compute wafer-space bounds from the selection rectangle
      const minCx = Math.min(selectionRect.startX, selectionRect.endX);
      const maxCx = Math.max(selectionRect.startX, selectionRect.endX);
      const minCy = Math.min(selectionRect.startY, selectionRect.endY);
      const maxCy = Math.max(selectionRect.startY, selectionRect.endY);

      // Ignore tiny drags (less than 4px)
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

      // Find all defects within the rectangle bounds
      const matchingIds: number[] = [];
      for (const d of defects) {
        if (d.xAbs >= left && d.xAbs <= right && d.yAbs >= top && d.yAbs <= bottom) {
          matchingIds.push(d.defectId);
        }
      }

      if (matchingIds.length > 0) {
        selectDefects(matchingIds);
      }

      setSelectionRect(null);
    },
    [selectionRect, viewport, defects, selectDefects],
  );

  // Draw the selection rectangle overlay
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);

    if (!selectionRect) return;

    const x = Math.min(selectionRect.startX, selectionRect.endX);
    const y = Math.min(selectionRect.startY, selectionRect.endY);
    const w = Math.abs(selectionRect.endX - selectionRect.startX);
    const h = Math.abs(selectionRect.endY - selectionRect.startY);

    // Semi-transparent blue fill
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fillRect(x, y, w, h);

    // Blue border
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }, [selectionRect]);

  // Keep overlay canvas sized to match main canvas
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

  // Zoom toolbar actions
  const handleZoomIn = useCallback(() => {
    setZoom(viewport.scale * ZOOM_STEP);
  }, [viewport.scale, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(viewport.scale / ZOOM_STEP);
  }, [viewport.scale, setZoom]);

  // Compute display zoom percentage
  const zoomPercent = useMemo(() => {
    if (!geometry) return 100;
    // Compute what 100% would be (fit to window scale)
    const fitScale = Math.min(
      (viewport.canvasWidth * 0.9) / geometry.waferDiameter,
      (viewport.canvasHeight * 0.9) / geometry.waferDiameter,
    );
    if (fitScale === 0) return 100;
    return Math.round((viewport.scale / fitScale) * 100);
  }, [viewport, geometry]);

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (!activeFile || !geometry) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={CircleDot}
          title="No Data"
          description="Open a file to view the wafer map"
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Color scheme for legend (read once per render)
  // -------------------------------------------------------------------------

  const colors = readColorScheme();

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={cn(
          'h-full w-full',
          isPanning ? 'cursor-grabbing' : isSelectingRef.current ? 'cursor-crosshair' : 'cursor-crosshair',
        )}
        style={{ touchAction: 'none' }}
        onClick={handleCanvasClick}
        onMouseMove={(e) => {
          handleSelectionMouseMove(e);
          eventHandlers.onMouseMove(e);
          handleCanvasMouseMove(e);
        }}
        onMouseLeave={(e) => {
          eventHandlers.onMouseLeave(e);
          handleCanvasMouseLeave();
        }}
        onWheel={eventHandlers.onWheel}
        onMouseDown={(e) => {
          handleSelectionMouseDown(e);
          eventHandlers.onMouseDown(e);
        }}
        onMouseUp={(e) => {
          handleSelectionMouseUp(e);
          eventHandlers.onMouseUp(e);
        }}
        onTouchStart={eventHandlers.onTouchStart}
        onTouchMove={eventHandlers.onTouchMove}
        onTouchEnd={eventHandlers.onTouchEnd}
      />

      {/* Selection rectangle overlay canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ touchAction: 'none' }}
      />

      {/* Floating toolbar - top right */}
      <div
        className={cn(
          'absolute right-3 top-3 flex items-center gap-1',
          'rounded-lg border border-border bg-card/90 p-1 shadow-md backdrop-blur-sm',
        )}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <span
          className={cn(
            'min-w-[3.5rem] select-none text-center text-xs font-medium tabular-nums',
            'text-muted-foreground',
          )}
        >
          {zoomPercent}%
        </span>

        <button
          type="button"
          onClick={handleZoomOut}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <div className="mx-0.5 h-5 w-px bg-border" />

        <button
          type="button"
          onClick={fitToWindow}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          title="Fit to window"
          aria-label="Fit to window"
        >
          <Maximize className="h-4 w-4" />
        </button>

        <div className="mx-0.5 h-5 w-px bg-border" />

        <ColorModeSelector value={colorMode} onChange={setColorMode} />

        <div className="mx-0.5 h-5 w-px bg-border" />

        <button
          type="button"
          onClick={() => setRotation((prev) => (prev + 90) % 360)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
          )}
          title={`Rotate (${rotation}°)`}
          aria-label="Rotate wafer"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <span className="min-w-[2rem] select-none text-center text-xs text-muted-foreground">
          {rotation === 0 ? 'Down' : rotation === 90 ? 'Left' : rotation === 180 ? 'Up' : 'Right'}
        </span>

        {/* Selection indicator */}
        {selectedDefectIds.size > 0 && (
          <>
            <div className="mx-0.5 h-5 w-px bg-border" />
            <span className="select-none text-xs font-medium text-blue-500">
              {selectedDefectIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => resetSelection()}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md',
                'text-muted-foreground transition-colors',
                'hover:bg-destructive/10 hover:text-destructive',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Shift-drag hint - shown briefly when no selection exists */}
      <div
        className={cn(
          'absolute left-1/2 top-3 -translate-x-1/2',
          'pointer-events-none select-none rounded-md bg-card/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm',
          'border border-border/50',
        )}
      >
        Shift + drag to select defects
      </div>

      {/* Floating legend - bottom left */}
      <div
        className={cn(
          'absolute bottom-3 left-3',
          'rounded-lg border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur-sm',
        )}
      >
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Legend
        </p>
        <div className="flex flex-col gap-1">
          <LegendItem color={colors.diePass} label="Pass (0 defects)" />
          <LegendItem color={colors.dieFail} label="Fail (high defects)" />
          <LegendItem color={colors.dieUntested} label="Untested / Skipped" />
          <LegendItem color={colors.defectParticle} label="Defect" dot />
        </div>
      </div>

      {/* Hovered die info - bottom right */}
      {hoveredDie && (
        <div
          className={cn(
            'absolute bottom-3 right-3',
            'rounded-lg border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur-sm',
          )}
        >
          <p className="text-xs text-muted-foreground">
            Die ({hoveredDie.xIndex}, {hoveredDie.yIndex})
          </p>
          {(() => {
            const die = dies.find(
              (d) =>
                d.xIndex === hoveredDie.xIndex &&
                d.yIndex === hoveredDie.yIndex,
            );
            if (!die) return null;
            return (
              <p className="text-xs font-medium text-foreground">
                {die.defectCount} defect{die.defectCount !== 1 ? 's' : ''} &middot;{' '}
                {die.status}
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend item sub-component
// ---------------------------------------------------------------------------

function LegendItem({
  color,
  label,
  dot = false,
}: {
  color: string;
  label: string;
  dot?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {dot ? (
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span
          className="inline-block h-2.5 w-4 rounded-sm"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
