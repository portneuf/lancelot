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
import type { WaferGeometry, DieMapEntry } from '@/core/models/wafer';
import type { DefectRecord } from '@/core/models/defect';
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
    hoveredDie: {
        xIndex: number;
        yIndex: number;
    } | null;
}
export type WaferMapColorMode = 'uniform' | 'byClass' | 'bySize' | 'byCluster';
export declare function readColorScheme(): WaferMapColorScheme;
/** Convert canvas pixel coordinates to wafer-space (um). */
export declare function canvasToWafer(px: number, py: number, viewport: WaferMapViewport): [number, number];
export declare function renderWaferMap(ctx: CanvasRenderingContext2D, viewport: WaferMapViewport, geometry: WaferGeometry, dies: readonly DieMapEntry[], defects: readonly DefectRecord[], colorScheme: WaferMapColorScheme, selection: WaferMapSelection, filteredDefectIds?: ReadonlySet<number> | null, colorMode?: WaferMapColorMode): void;
/** Find the defect closest to a canvas point, within a pixel threshold. */
export declare function hitTestDefect(canvasX: number, canvasY: number, viewport: WaferMapViewport, defects: readonly DefectRecord[], hitRadiusPx?: number): DefectRecord | null;
/** Find the die at a canvas point. */
export declare function hitTestDie(canvasX: number, canvasY: number, viewport: WaferMapViewport, geometry: WaferGeometry, dies: readonly DieMapEntry[]): DieMapEntry | null;
export declare function useWaferMapRenderer(canvasRef: React.RefObject<HTMLCanvasElement | null>, viewport: WaferMapViewport, geometry: WaferGeometry | null, dies: readonly DieMapEntry[], defects: readonly DefectRecord[], selection: WaferMapSelection, filteredDefectIds?: ReadonlySet<number> | null, colorMode?: WaferMapColorMode): void;
