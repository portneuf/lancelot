import { useMemo, useCallback } from 'react';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useInspectionStore } from '@/stores';
import type { ClassLookupEntry } from '@/core/models/inspection-file';

interface DefectFilterBarProps {
  classLookup: ClassLookupEntry[];
  totalDefects: number;
  filteredCount: number;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export function DefectFilterBar({
  classLookup,
  totalDefects,
  filteredCount,
  showAdvanced,
  onToggleAdvanced,
}: DefectFilterBarProps) {
  const filters = useInspectionStore((s) => s.filters);
  const updateFilters = useInspectionStore((s) => s.updateFilters);
  const clearFilters = useInspectionStore((s) => s.clearFilters);

  const hasActiveFilters = useMemo(() => {
    return filters.classNumbers.size > 0 ||
      Object.keys(filters.numericRanges).length > 0 ||
      filters.searchText !== '';
  }, [filters]);

  const handleClassToggle = useCallback((classNumber: number) => {
    const next = new Set(filters.classNumbers);
    if (next.has(classNumber)) {
      next.delete(classNumber);
    } else {
      next.add(classNumber);
    }
    updateFilters({ classNumbers: next });
  }, [filters.classNumbers, updateFilters]);

  const handleSearchChange = useCallback((value: string) => {
    updateFilters({ searchText: value });
  }, [updateFilters]);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-2">
      <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />

      {/* Class filter chips */}
      {classLookup.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {classLookup.map((cls) => {
            const isActive = filters.classNumbers.has(cls.classNumber);
            return (
              <button
                key={cls.classNumber}
                onClick={() => handleClassToggle(cls.classNumber)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                )}
              >
                {cls.className}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search..."
        value={filters.searchText}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-32 rounded border border-border bg-background px-2 py-0.5 text-xs"
      />

      {/* Advanced filters toggle */}
      <button
        onClick={onToggleAdvanced}
        className={cn(
          'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
          showAdvanced
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:border-primary/50',
        )}
        title="Toggle range sliders"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Sliders
      </button>

      {/* Filter status + clear */}
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        {hasActiveFilters && (
          <>
            <span>{filteredCount.toLocaleString()} / {totalDefects.toLocaleString()}</span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
