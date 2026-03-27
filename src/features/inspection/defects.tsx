import { useMemo, useState, useEffect } from 'react';
import { Bug } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore, useInspectionStore } from '@/stores';
import { DefectTable } from './components/DefectTable';
import { DefectFilterBar } from './components/DefectFilterBar';
import { DynamicFilterPanel } from './components/DynamicFilterPanel';
import { DefectDetailPanel } from './components/DefectDetailPanel';
import { readField } from './utils/read-field';
import type { DefectRecord } from '@/core/models/defect';

const numberFormatter = new Intl.NumberFormat();

export default function DefectsPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);
  const file = activeFileId ? files.get(activeFileId) : undefined;

  const filters = useInspectionStore((s) => s.filters);
  const setFilteredDefectIds = useInspectionStore((s) => s.setFilteredDefectIds);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredDefects = useMemo(() => {
    if (!file) return [];
    let defects: DefectRecord[] = file.defects;

    // Class filter
    if (filters.classNumbers.size > 0) {
      defects = defects.filter((d) => d.classNumber != null && filters.classNumbers.has(d.classNumber));
    }

    // Numeric range filters (generic for all columns)
    for (const [key, range] of Object.entries(filters.numericRanges)) {
      const [min, max] = range;
      if (min == null && max == null) continue;
      defects = defects.filter((d) => {
        const val = readField(d, key);
        if (typeof val !== 'number') return true;
        if (min != null && val < min) return false;
        if (max != null && val > max) return false;
        return true;
      });
    }

    // Text search
    if (filters.searchText) {
      const q = filters.searchText.toLowerCase();
      defects = defects.filter((d) =>
        String(d.defectId).includes(q) ||
        String(d.classNumber).includes(q) ||
        (d.extra['_className'] ?? '').toString().toLowerCase().includes(q),
      );
    }

    return defects;
  }, [file?.defects, filters]);

  const totalCount = file?.defects.length ?? 0;
  const filteredCount = filteredDefects.length;

  // Sync filteredDefectIds to store for WaferMap dimming
  useEffect(() => {
    if (filteredCount < totalCount && filteredCount > 0) {
      setFilteredDefectIds(new Set(filteredDefects.map((d) => d.defectId)));
    } else {
      setFilteredDefectIds(null);
    }
  }, [filteredDefects, filteredCount, totalCount, setFilteredDefectIds]);

  // Clear filter sync on unmount
  useEffect(() => {
    return () => setFilteredDefectIds(null);
  }, [setFilteredDefectIds]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={Bug} title="No Data" description="Open a file to view defects" />
      </div>
    );
  }

  const highlightedDefectId = useInspectionStore((s) => s.highlightedDefectId);

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
          <h1 className="text-sm font-semibold">Defect Table</h1>
          <span className="text-xs text-muted-foreground">
            {numberFormatter.format(filteredCount)} defect{filteredCount !== 1 ? 's' : ''}
            {filteredCount !== totalCount && ` (of ${numberFormatter.format(totalCount)})`}
          </span>
        </div>

        {/* Compact filter bar */}
        <DefectFilterBar
          classLookup={file.classLookup}
          totalDefects={totalCount}
          filteredCount={filteredCount}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
        />

        {/* Dynamic slider panel (collapsible) */}
        {showAdvanced && (
          <DynamicFilterPanel
            defects={file.defects}
            defectSchema={file.defectSchema}
          />
        )}

        {/* Table area */}
        <div className="min-h-0 flex-1">
          <DefectTable
            defects={filteredDefects}
            defectSchema={file.defectSchema}
            classLookup={file.classLookup}
          />
        </div>
      </div>

      {/* Defect detail panel (right side) */}
      {highlightedDefectId !== null && (
        <DefectDetailPanel
          defects={filteredDefects}
          defectSchema={file.defectSchema}
          classLookup={file.classLookup}
        />
      )}
    </div>
  );
}
