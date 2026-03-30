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
import type { WaferMapViewport } from './useWaferMapRenderer';
import type { WaferGeometry } from '@/core/models/wafer';
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
export declare function useWaferZoomPan(canvasRef: React.RefObject<HTMLCanvasElement | null>, geometry: WaferGeometry | null): UseWaferZoomPanResult;
