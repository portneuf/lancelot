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

import { useCallback, useMemo, useRef, useState } from 'react';
import { CircleDot, Maximize, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';
import { useInspectionStore } from '@/stores';
import {
  useWaferMapRenderer,
  hitTestDefect,
  hitTestDie,
  readColorScheme,
} from './hooks/useWaferMapRenderer';
import { useWaferZoomPan } from './hooks/useWaferZoomPan';
import { ColorModeSelector } from './components/ColorModeSelector';
import type { WaferMapSelection, WaferMapColorMode } from './hooks/useWaferMapRenderer';

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colorMode, setColorMode] = useState<WaferMapColorMode>('uniform');
  const [rotation, setRotation] = useState(0);

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
  }, [setHoveredDie]);

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
          isPanning ? 'cursor-grabbing' : 'cursor-crosshair',
        )}
        style={{ touchAction: 'none' }}
        onClick={handleCanvasClick}
        onMouseMove={(e) => {
          eventHandlers.onMouseMove(e);
          handleCanvasMouseMove(e);
        }}
        onMouseLeave={(e) => {
          eventHandlers.onMouseLeave(e);
          handleCanvasMouseLeave();
        }}
        onWheel={eventHandlers.onWheel}
        onMouseDown={eventHandlers.onMouseDown}
        onMouseUp={eventHandlers.onMouseUp}
        onTouchStart={eventHandlers.onTouchStart}
        onTouchMove={eventHandlers.onTouchMove}
        onTouchEnd={eventHandlers.onTouchEnd}
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
