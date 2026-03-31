/**
 * Gallery thumbnail renderer.
 *
 * Renders a wafer map thumbnail onto a small canvas using the existing
 * renderWaferMap() function with a computed viewport. Caches rendered
 * thumbnails as ImageBitmap for instant re-display.
 */
import type { WaferMapColorMode } from '@/features/wafer-map/hooks/useWaferMapRenderer';
import type { InspectionFile } from '@/core/models/inspection-file';
export declare function clearThumbnailCache(): void;
/**
 * Render a wafer map thumbnail and return an ImageBitmap.
 * Results are cached by cacheKey.
 */
export declare function renderThumbnail(file: InspectionFile, size: number, colorMode: WaferMapColorMode, cacheKey: string): Promise<ImageBitmap>;
