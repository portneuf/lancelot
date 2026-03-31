/**
 * Stacking/Overlay View — aggregated heatmap of multiple wafers.
 *
 * Overlays defect data from selected wafers into a single heatmap.
 * Three aggregation modes:
 * - Density: defects per area
 * - Hit-Count: how many wafers have defects in this zone
 * - Class-Dominance: most frequent defect class per zone
 *
 * Supports cartesian grid (10x10 to 50x50) and wafer selection
 * via checkboxes in the sidebar.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFileStore } from '@/stores';
import { useTranslation } from '@/i18n/useTranslation';
import { EmptyState } from '@/components/shared/EmptyState';
import { useStackingEngine } from './useStackingEngine';
import { readColorScheme } from '@/features/wafer-map/hooks/useWaferMapRenderer';
import type { AggregationMode } from '@/core/storage';
import type { InspectionFile } from '@/core/models/inspection-file';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_OPTIONS = [10, 20, 30, 50] as const;
type GridOption = (typeof GRID_OPTIONS)[number];

const AGGREGATION_OPTIONS: { value: AggregationMode; labelKey: string }[] = [
  { value: 'density', labelKey: 'stacking.density' },
  { value: 'hit-count', labelKey: 'stacking.hitCount' },
  { value: 'class-dominance', labelKey: 'stacking.classDominance' },
];

// ---------------------------------------------------------------------------
// Heatmap color scales
// ---------------------------------------------------------------------------

function densityColor(t: number): string {
  // Blue → Yellow → Red
  if (t < 0.5) {
    const s = t * 2;
    const r = Math.round(s * 255);
    const g = Math.round(s * 220);
    const b = Math.round((1 - s) * 200 + 55);
    return `rgb(${r},${g},${b})`;
  }
  const s = (t - 0.5) * 2;
  const r = 255;
  const g = Math.round((1 - s) * 220);
  const b = Math.round((1 - s) * 50);
  return `rgb(${r},${g},${b})`;
}

const CLASS_PALETTE = [
  '#2563eb', '#f97316', '#22c55e', '#ef4444',
  '#a855f7', '#06b6d4', '#eab308', '#ec4899',
  '#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StackingPage() {
  const { t } = useTranslation();
  const files = useFileStore((s) => s.files);

  const [aggregation, setAggregation] = useState<AggregationMode>('density');
  const [gridSize, setGridSize] = useState<GridOption>(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // All available files
  const allEntries = useMemo(
    () => [...files.entries()].map(([id, file]) => ({ id, file })),
    [files],
  );

  // Auto-select all on first load
  useEffect(() => {
    if (allEntries.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(allEntries.map((e) => e.id)));
    }
  }, [allEntries.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selected files
  const selectedFiles: InspectionFile[] = useMemo(
    () => allEntries.filter((e) => selectedIds.has(e.id)).map((e) => e.file),
    [allEntries, selectedIds],
  );

  // Compute stacking
  const result = useStackingEngine(selectedFiles, aggregation, gridSize);

  // Toggle wafer selection
  const toggleWafer = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Render heatmap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || result.cells.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cellSize = size / result.gridSize;
    const colors = readColorScheme();

    // Draw wafer outline
    const center = size / 2;
    const radius = size * 0.45;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.waferBg;
    ctx.fill();
    ctx.strokeStyle = colors.waferEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Clip to wafer circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    // Draw heatmap cells
    for (const cell of result.cells) {
      const x = cell.gridX * cellSize;
      const y = cell.gridY * cellSize;

      if (aggregation === 'class-dominance') {
        ctx.fillStyle = CLASS_PALETTE[cell.value % CLASS_PALETTE.length];
        ctx.globalAlpha = 0.75;
      } else {
        const t = result.maxValue > 0 ? cell.value / result.maxValue : 0;
        ctx.fillStyle = densityColor(t);
        ctx.globalAlpha = 0.7;
      }

      ctx.fillRect(x, y, cellSize, cellSize);
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // Redraw wafer edge on top
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = colors.waferEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [result, aggregation]);

  // Empty state
  if (allEntries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Layers}
          title={t('common.noData')}
          description={t('stacking.openFilesToView')}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area — heatmap canvas */}
      <div className="flex flex-1 items-center justify-center p-4">
        {selectedFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('stacking.selectWafers')}</p>
        ) : (
          <canvas
            ref={canvasRef}
            className="max-h-full max-w-full"
            style={{ aspectRatio: '1 / 1' }}
          />
        )}
      </div>

      {/* Sidebar — controls */}
      <div className="flex w-64 flex-col border-l border-border bg-card">
        {/* Header */}
        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
          {t('stacking.title')}
        </div>

        {/* Aggregation mode */}
        <div className="border-b border-border px-3 py-3">
          <span className="mb-2 block text-xs font-medium text-muted-foreground">
            {t('stacking.aggregation')}
          </span>
          <div className="flex flex-col gap-1">
            {AGGREGATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAggregation(opt.value)}
                className={cn(
                  'rounded px-2 py-1 text-left text-xs transition-colors',
                  aggregation === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent',
                )}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid size */}
        <div className="border-b border-border px-3 py-3">
          <span className="mb-2 block text-xs font-medium text-muted-foreground">
            {t('stacking.gridSize')}
          </span>
          <div className="flex gap-1">
            {GRID_OPTIONS.map((gs) => (
              <button
                key={gs}
                onClick={() => setGridSize(gs)}
                className={cn(
                  'flex-1 rounded border px-1 py-0.5 text-xs transition-colors',
                  gridSize === gs
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/50',
                )}
              >
                {gs}
              </button>
            ))}
          </div>
        </div>

        {/* Wafer selection */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('stacking.wafers')} ({selectedIds.size}/{allEntries.length})
            </span>
            <button
              onClick={() => {
                if (selectedIds.size === allEntries.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(allEntries.map((e) => e.id)));
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              {selectedIds.size === allEntries.length ? t('stacking.deselectAll') : t('stacking.selectAll')}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {allEntries.map(({ id, file }) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(id)}
                  onChange={() => toggleWafer(id)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                <span className="truncate">{file.identity.waferId}</span>
                <span className="ml-auto text-muted-foreground">
                  {file.defects.length.toLocaleString()}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Stats footer */}
        {result.cells.length > 0 && (
          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            {result.waferCount} {t('stacking.wafers').toLowerCase()} · {result.cells.length} {t('stacking.activeCells')}
          </div>
        )}
      </div>
    </div>
  );
}
