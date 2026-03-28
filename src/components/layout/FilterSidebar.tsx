import { useMemo } from 'react';
import { SlidersHorizontal, X, Filter } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFileStore, useInspectionStore } from '@/stores';
import { useFilteredDefects } from '@/hooks/useFilteredDefects';
import { DynamicFilterPanel } from '@/features/inspection/components/DynamicFilterPanel';
import { useTranslation } from '@/i18n/useTranslation';

interface FilterSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function FilterSidebar({ open, onClose }: FilterSidebarProps) {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const file = activeFileId ? files.get(activeFileId) : undefined;

  const filters = useInspectionStore((s) => s.filters);
  const updateFilters = useInspectionStore((s) => s.updateFilters);
  const clearFilters = useInspectionStore((s) => s.clearFilters);

  const { filteredCount, totalCount, isFiltered } = useFilteredDefects();
  const { t } = useTranslation();

  const hasActiveFilters = useMemo(() => {
    return filters.classNumbers.size > 0 ||
      Object.keys(filters.numericRanges).length > 0 ||
      filters.searchText !== '';
  }, [filters]);

  if (!open || !file) return null;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{t('filters.title')}</span>
          {isFiltered && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Close filters">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Class chips */}
        {file.classLookup.length > 0 && (
          <div className="border-b border-border px-3 py-3">
            <span className="mb-2 block text-xs font-medium text-muted-foreground">{t('filters.defectClass')}</span>
            <div className="flex flex-wrap gap-1">
              {file.classLookup.map((cls) => {
                const isActive = filters.classNumbers.has(cls.classNumber);
                return (
                  <button
                    key={cls.classNumber}
                    onClick={() => {
                      const next = new Set(filters.classNumbers);
                      if (next.has(cls.classNumber)) next.delete(cls.classNumber);
                      else next.add(cls.classNumber);
                      updateFilters({ classNumbers: next });
                    }}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-xs transition-colors',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    {cls.className}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="border-b border-border px-3 py-3">
          <span className="mb-2 block text-xs font-medium text-muted-foreground">{t('filters.search')}</span>
          <input
            type="text"
            placeholder={t('filters.searchPlaceholder')}
            value={filters.searchText}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
            className="w-full rounded border border-border bg-card px-2 py-1 text-xs"
          />
        </div>

        {/* Range sliders */}
        <div className="px-0 py-0">
          <DynamicFilterPanel
            defects={file.defects}
            defectSchema={file.defectSchema}
          />
        </div>
      </div>

      {/* Footer: Clear all */}
      {hasActiveFilters && (
        <div className="border-t border-border px-3 py-2">
          <button
            onClick={clearFilters}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            <Filter className="h-3 w-3" />
            {t('filters.clearAll')}
          </button>
        </div>
      )}
    </aside>
  );
}
