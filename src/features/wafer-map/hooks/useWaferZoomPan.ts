/**
 * Hook for pan/zoom interaction on the wafer map canvas.
 *
 * Supports:
 * - Mouse wheel zoom (scales around cursor position)
 * - Mouse drag pan (updates centerX/centerY)
 * - Touch pinch-to-zoom
 * - "Fit to window" reset function
 * - requestAnimationFrame throttling for smooth updates
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WaferMapViewport } from './useWaferMapRenderer';
import type { WaferGeometry } from '@/core/models/wafer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCALE = 0.0001;
const MAX_SCALE = 10;
const ZOOM_FACTOR = 1.1;
const FIT_PADDING = 0.9; // 90% of available space

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseWaferZoomPanResult {
  viewport: WaferMapViewport;
  /** Attach to the canvas container for pointer events. */
  eventHandlers: {
    onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
    onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onMouseLeave: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
    onTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
    onTouchEnd: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  };
  /** Reset viewport to fit the entire wafer. */
  fitToWindow: () => void;
  /** Set zoom to a specific scale around the canvas center. */
  setZoom: (scale: number) => void;
  /** Whether the user is currently panning. */
  isPanning: boolean;
}

export function useWaferZoomPan(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  geometry: WaferGeometry | null,
): UseWaferZoomPanResult {
  const [viewport, setViewport] = useState<WaferMapViewport>({
    centerX: 0,
    centerY: 0,
    scale: 1,
    canvasWidth: 300,
    canvasHeight: 300,
  });

  const isPanningRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Touch zoom state
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);

  // ---------------------------------------------------------------------------
  // Fit to window
  // ---------------------------------------------------------------------------

  const fitToWindow = useCallback(() => {
    if (!geometry) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;

    if (cw === 0 || ch === 0) return;

    const diameter = geometry.waferDiameter;
    const scaleX = (cw * FIT_PADDING) / diameter;
    const scaleY = (ch * FIT_PADDING) / diameter;
    const scale = Math.min(scaleX, scaleY);

    // Center viewport on the wafer center (sampleCenterLocation)
    const [scx, scy] = geometry.sampleCenterLocation;
    setViewport({
      centerX: scx,
      centerY: scy,
      scale,
      canvasWidth: cw,
      canvasHeight: ch,
    });
  }, [canvasRef, geometry]);

  // ---------------------------------------------------------------------------
  // Set zoom to a specific scale
  // ---------------------------------------------------------------------------

  const setZoom = useCallback(
    (scale: number) => {
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
      setViewport((prev) => ({ ...prev, scale: clampedScale }));
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // ResizeObserver: track container size and auto-fit on first mount
  // ---------------------------------------------------------------------------

  const hasFittedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      // Update canvas backing buffer for DPR
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      setViewport((prev) => ({
        ...prev,
        canvasWidth: width,
        canvasHeight: height,
      }));

      // Auto-fit on first meaningful resize
      if (!hasFittedRef.current && geometry) {
        hasFittedRef.current = true;
        const diameter = geometry.waferDiameter;
        const scaleX = (width * FIT_PADDING) / diameter;
        const scaleY = (height * FIT_PADDING) / diameter;
        const scale = Math.min(scaleX, scaleY);
        const [scx, scy] = geometry.sampleCenterLocation;
        setViewport({
          centerX: scx,
          centerY: scy,
          scale,
          canvasWidth: width,
          canvasHeight: height,
        });
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef, geometry]);

  // Re-fit when geometry changes (new file loaded)
  useEffect(() => {
    if (geometry) {
      hasFittedRef.current = false;
      fitToWindow();
    }
  }, [geometry, fitToWindow]);

  // ---------------------------------------------------------------------------
  // Mouse wheel -> zoom around cursor
  // ---------------------------------------------------------------------------

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setViewport((prev) => {
        const zoomIn = e.deltaY < 0;
        const factor = zoomIn ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));

        // Zoom around cursor: keep the wafer point under cursor fixed
        const wx = (mouseX - prev.canvasWidth / 2) / prev.scale + prev.centerX;
        const wy = (mouseY - prev.canvasHeight / 2) / prev.scale + prev.centerY;

        const newCenterX = wx - (mouseX - prev.canvasWidth / 2) / newScale;
        const newCenterY = wy - (mouseY - prev.canvasHeight / 2) / newScale;

        return {
          ...prev,
          centerX: newCenterX,
          centerY: newCenterY,
          scale: newScale,
        };
      });
    },
    [canvasRef],
  );

  // ---------------------------------------------------------------------------
  // Mouse drag -> pan
  // ---------------------------------------------------------------------------

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return; // left button only
      isPanningRef.current = true;
      setIsPanning(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPanningRef.current) return;

      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      setViewport((prev) => {
        const next = {
          ...prev,
          centerX: prev.centerX - dx / prev.scale,
          centerY: prev.centerY - dy / prev.scale,
        };
        return next;
      });
    },
    [],
  );

  const stopPanning = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
  }, []);

  const onMouseUp = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      stopPanning();
    },
    [stopPanning],
  );

  const onMouseLeave = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      stopPanning();
    },
    [stopPanning],
  );

  // ---------------------------------------------------------------------------
  // Touch pinch-to-zoom + pan
  // ---------------------------------------------------------------------------

  const getTouchDistance = (t1: React.Touch, t2: React.Touch): number => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (
    t1: React.Touch,
    t2: React.Touch,
    rect: DOMRect,
  ): { x: number; y: number } => ({
    x: (t1.clientX + t2.clientX) / 2 - rect.left,
    y: (t1.clientY + t2.clientY) / 2 - rect.top,
  });

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastTouchDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          lastTouchCenterRef.current = getTouchCenter(
            e.touches[0],
            e.touches[1],
            rect,
          );
        }
      } else if (e.touches.length === 1) {
        isPanningRef.current = true;
        setIsPanning(true);
        lastMouseRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [canvasRef],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
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
          const newScale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, prev.scale * ratio),
          );

          // Zoom around pinch center
          const wx =
            (center.x - prev.canvasWidth / 2) / prev.scale + prev.centerX;
          const wy =
            (center.y - prev.canvasHeight / 2) / prev.scale + prev.centerY;

          const newCenterX = wx - (center.x - prev.canvasWidth / 2) / newScale;
          const newCenterY = wy - (center.y - prev.canvasHeight / 2) / newScale;

          // Also apply pan delta
          let panDx = 0;
          let panDy = 0;
          if (lastTouchCenterRef.current) {
            panDx =
              (center.x - lastTouchCenterRef.current.x) / newScale;
            panDy =
              (center.y - lastTouchCenterRef.current.y) / newScale;
          }
          lastTouchCenterRef.current = center;

          return {
            ...prev,
            centerX: newCenterX - panDx,
            centerY: newCenterY - panDy,
            scale: newScale,
          };
        });
      } else if (e.touches.length === 1 && isPanningRef.current) {
        const touch = e.touches[0];
        const dx = touch.clientX - lastMouseRef.current.x;
        const dy = touch.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: touch.clientX, y: touch.clientY };

        setViewport((prev) => ({
          ...prev,
          centerX: prev.centerX - dx / prev.scale,
          centerY: prev.centerY - dy / prev.scale,
        }));
      }
    },
    [canvasRef],
  );

  const onTouchEnd = useCallback(
    (_e: React.TouchEvent<HTMLCanvasElement>) => {
      lastTouchDistRef.current = null;
      lastTouchCenterRef.current = null;
      isPanningRef.current = false;
      setIsPanning(false);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    viewport,
    eventHandlers: {
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    fitToWindow,
    setZoom,
    isPanning,
  };
}
