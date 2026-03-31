/**
 * Gallery View — grid of wafer map thumbnails.
 *
 * Shows all loaded wafers as miniature wafer maps in a configurable grid.
 * Supports sorting, color modes, and multi-selection for stacking.
 * Click a thumbnail to navigate to the wafer map view.
 * Shift+click to select/deselect for stacking.
 */

import { useCallback, useMemo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFileStore } from '@/stores';
import { useLancelotNavigate } from '@/hooks/useLancelotNavigate';
import { useTranslation } from '@/i18n/useTranslation';
import { EmptyState } from '@/components/shared/EmptyState';
import { GalleryThumbnail } from './GalleryThumbnail';
import { clearThumbnailCache } from './useGalleryRenderer';
import type { InspectionFile } from '@/core/models/inspection-file';
import type { WaferMapColorMode } from '@/features/wafer-map/hooks/useWaferMapRenderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = 'waferId' | 'lotId' | 'defectCount' | 'fileName' | 'slot';
type GridSize = 3 | 4 | 5 | 6;

interface FileEntry {
  id: string;
  file: InspectionFile;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function sortFiles(entries: FileEntry[], key: SortKey): FileEntry[] {
  return [...entries].sort((a, b) => {
    switch (key) {
      case 'waferId':
        return a.file.identity.waferId.localeCompare(b.file.identity.waferId);
      case 'lotId':
        return a.file.identity.lotId.localeCompare(b.file.identity.lotId);
      case 'defectCount':
        return b.file.defects.length - a.file.defects.length;
      case 'fileName':
        return a.file.source.fileName.localeCompare(b.file.source.fileName);
      case 'slot':
        return (a.file.identity.slot ?? 0) - (b.file.identity.slot ?? 0);
    }
  });
}

// ---------------------------------------------------------------------------
// Thumbnail size from grid columns
// ---------------------------------------------------------------------------

const GRID_SIZES: GridSize[] = [3, 4, 5, 6];
const THUMB_SIZES: Record<GridSize, number> = { 3: 200, 4: 160, 5: 130, 6: 110 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GalleryPage() {
  const { t } = useTranslation();
  const files = useFileStore((s) => s.files);
  const switchToFile = useFileStore((s) => s.switchToFile);
  const lancelotNavigate = useLancelotNavigate();

  const [sortKey, setSortKey] = useState<SortKey>('waferId');
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [colorMode, setColorMode] = useState<WaferMapColorMode>('uniform');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const entries: FileEntry[] = useMemo(
    () => [...files.entries()].map(([id, file]) => ({ id, file })),
    [files],
  );

  const sorted = useMemo(() => sortFiles(entries, sortKey), [entries, sortKey]);

  const handleThumbnailClick = useCallback(
    (fileId: string) => {
      switchToFile(fileId);
      lancelotNavigate('wafer-map');
    },
    [switchToFile, lancelotNavigate],
  );

  const handleSelect = useCallback((fileId: string, _shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const handleColorModeChange = useCallback((mode: WaferMapColorMode) => {
    clearThumbnailCache();
    setColorMode(mode);
  }, []);

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={LayoutGrid}
          title={t('common.noData')}
          description={t('gallery.openFilesToView')}
        />
      </div>
    );
  }

  const thumbSize = THUMB_SIZES[gridSize];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
        {/* Sort */}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {t('gallery.sortBy')}:
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded border border-border bg-card px-2 py-1 text-xs"
          >
            <option value="waferId">{t('gallery.sortWaferId')}</option>
            <option value="lotId">{t('gallery.sortLotId')}</option>
            <option value="defectCount">{t('gallery.sortDefects')}</option>
            <option value="fileName">{t('gallery.sortFileName')}</option>
            <option value="slot">{t('gallery.sortSlot')}</option>
          </select>
        </label>

        {/* Color mode */}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {t('gallery.colorMode')}:
          <select
            value={colorMode}
            onChange={(e) => handleColorModeChange(e.target.value as WaferMapColorMode)}
            className="rounded border border-border bg-card px-2 py-1 text-xs"
          >
            <option value="uniform">{t('gallery.colorUniform')}</option>
            <option value="byClass">{t('gallery.colorByClass')}</option>
            <option value="bySize">{t('gallery.colorBySize')}</option>
          </select>
        </label>

        {/* Grid size */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {t('gallery.gridSize')}:
          {GRID_SIZES.map((gs) => (
            <button
              key={gs}
              onClick={() => { clearThumbnailCache(); setGridSize(gs); }}
              className={cn(
                'rounded border px-2 py-0.5 text-xs transition-colors',
                gridSize === gs
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-primary/50',
              )}
            >
              {gs}×{gs}
            </button>
          ))}
        </div>

        {/* Selection info */}
        {selectedIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-medium text-primary">
              {selectedIds.size} {t('gallery.selected')}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent"
            >
              {t('common.clearSelection')}
            </button>
          </div>
        )}

        {/* Count */}
        <span className="ml-auto text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'wafer' : 'wafers'}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
        >
          {sorted.map(({ id, file }) => (
            <GalleryThumbnail
              key={id}
              file={file}
              fileId={id}
              size={thumbSize}
              colorMode={colorMode}
              isSelected={selectedIds.has(id)}
              onSelect={handleSelect}
              onClick={handleThumbnailClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
