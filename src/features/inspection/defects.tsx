import { useMemo } from 'react';
import { Bug } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore, useInspectionStore } from '@/stores';
import { DefectTable } from './components/DefectTable';
import { DefectFilterBar } from './components/DefectFilterBar';
import type { DefectRecord } from '@/core/models/defect';

const numberFormatter = new Intl.NumberFormat();

export default function DefectsPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const files = useFileStore((s) => s.files);

  const file = activeFileId ? files.get(activeFileId) : undefined;

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={Bug} title="No Data" description="Open a file to view defects" />
      </div>
    );
  }

  const filters = useInspectionStore((s) => s.filters);

  const filteredDefects = useMemo(() => {
    let defects: DefectRecord[] = file.defects;

    // Class filter
    if (filters.classNumbers.size > 0) {
      defects = defects.filter((d) => d.classNumber != null && filters.classNumbers.has(d.classNumber));
    }

    // Size range filter
    if (filters.sizeRange[0] != null) {
      const min = filters.sizeRange[0];
      defects = defects.filter((d) => (d.size ?? 0) >= min);
    }
    if (filters.sizeRange[1] != null) {
      const max = filters.sizeRange[1];
      defects = defects.filter((d) => (d.size ?? 0) <= max);
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
  }, [file.defects, filters]);

  const totalCount = file.defects.length;
  const filteredCount = filteredDefects.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <h1 className="text-sm font-semibold">Defect Table</h1>
        <span className="text-xs text-muted-foreground">
          {numberFormatter.format(filteredCount)} defect{filteredCount !== 1 ? 's' : ''}
          {filteredCount !== totalCount && ` (of ${numberFormatter.format(totalCount)})`}
        </span>
      </div>

      {/* Filter bar */}
      <DefectFilterBar
        classLookup={file.classLookup}
        totalDefects={totalCount}
        filteredCount={filteredCount}
      />

      {/* Table area */}
      <div className="min-h-0 flex-1">
        <DefectTable
          defects={filteredDefects}
          defectSchema={file.defectSchema}
          classLookup={file.classLookup}
        />
      </div>
    </div>
  );
}
