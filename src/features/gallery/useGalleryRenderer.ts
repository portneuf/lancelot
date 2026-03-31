/**
 * Gallery thumbnail renderer.
 *
 * Renders a wafer map thumbnail onto a small canvas using the existing
 * renderWaferMap() function with a computed viewport. Caches rendered
 * thumbnails as ImageBitmap for instant re-display.
 */

import {
  renderWaferMap,
  readColorScheme,
} from '@/features/wafer-map/hooks/useWaferMapRenderer';
import type { WaferMapViewport, WaferMapColorMode } from '@/features/wafer-map/hooks/useWaferMapRenderer';
import type { InspectionFile } from '@/core/models/inspection-file';

const EMPTY_SELECTION = {
  selectedDefectIds: new Set<number>(),
  highlightedDefectId: null,
  hoveredDie: null,
};

const thumbnailCache = new Map<string, ImageBitmap>();

export function clearThumbnailCache(): void {
  for (const bmp of thumbnailCache.values()) bmp.close();
  thumbnailCache.clear();
}

/**
 * Render a wafer map thumbnail and return an ImageBitmap.
 * Results are cached by cacheKey.
 */
export async function renderThumbnail(
  file: InspectionFile,
  size: number,
  colorMode: WaferMapColorMode,
  cacheKey: string,
): Promise<ImageBitmap> {
  const cached = thumbnailCache.get(cacheKey);
  if (cached) return cached;

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2d not supported');

  const geometry = file.waferGeometry;
  const diameter = geometry.waferDiameter;
  const padding = 0.88;
  const scale = (size * padding) / diameter;
  const [scx, scy] = geometry.sampleCenterLocation;

  const viewport: WaferMapViewport = {
    centerX: scx,
    centerY: scy,
    scale,
    canvasWidth: size,
    canvasHeight: size,
  };

  const colors = readColorScheme();

  renderWaferMap(
    ctx as unknown as CanvasRenderingContext2D,
    viewport,
    geometry,
    file.dieMap,
    file.defects,
    colors,
    EMPTY_SELECTION,
    null,
    colorMode,
  );

  const bitmap = await createImageBitmap(canvas);
  thumbnailCache.set(cacheKey, bitmap);
  return bitmap;
}
