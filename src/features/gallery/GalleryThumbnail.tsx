/**
 * Single wafer map thumbnail for the Gallery grid.
 *
 * Uses IntersectionObserver for lazy rendering — only renders
 * when scrolled into view. Displays wafer ID, defect count,
 * and selection state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { renderThumbnail } from './useGalleryRenderer';
import type { InspectionFile } from '@/core/models/inspection-file';
import type { WaferMapColorMode } from '@/features/wafer-map/hooks/useWaferMapRenderer';

interface GalleryThumbnailProps {
  file: InspectionFile;
  fileId: string;
  size: number;
  colorMode: WaferMapColorMode;
  isSelected: boolean;
  onSelect: (fileId: string, shiftKey: boolean) => void;
  onClick: (fileId: string) => void;
}

export function GalleryThumbnail({
  file,
  fileId,
  size,
  colorMode,
  isSelected,
  onSelect,
  onClick,
}: GalleryThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cacheKey = `${fileId}-${size}-${colorMode}`;
    try {
      const bitmap = await renderThumbnail(file, size, colorMode, cacheKey);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(bitmap, 0, 0);
      setRendered(true);
    } catch {
      // OffscreenCanvas not supported — fallback would go here
    }
  }, [file, fileId, size, colorMode]);

  // Lazy rendering via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          draw();
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        onSelect(fileId, true);
      } else {
        onClick(fileId);
      }
    },
    [fileId, onSelect, onClick],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors cursor-pointer',
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
          : 'border-border hover:border-primary/40 hover:bg-accent/50',
      )}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded"
        style={{ width: size, height: size }}
      />

      {!rendered && (
        <div
          className="absolute inset-2 flex items-center justify-center rounded bg-muted text-xs text-muted-foreground"
          style={{ bottom: 'auto', height: size }}
        >
          Loading...
        </div>
      )}

      <div className="flex w-full flex-col items-center gap-0.5 text-center">
        <span className="truncate text-xs font-medium">{file.identity.waferId}</span>
        <span className="text-[10px] text-muted-foreground">
          {file.defects.length.toLocaleString()} defects
        </span>
      </div>
    </div>
  );
}
