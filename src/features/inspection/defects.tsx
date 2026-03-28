import { Bug } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useInspectionStore } from '@/stores';
import { useFilteredDefects } from '@/hooks/useFilteredDefects';
import { DefectTable } from './components/DefectTable';
import { DefectDetailPanel } from './components/DefectDetailPanel';

const numberFormatter = new Intl.NumberFormat();

export default function DefectsPage() {
  const { file, filteredDefects, totalCount, filteredCount } = useFilteredDefects();
  const highlightedDefectId = useInspectionStore((s) => s.highlightedDefectId);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={Bug} title="No Data" description="Open a file to view defects" />
      </div>
    );
  }

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
