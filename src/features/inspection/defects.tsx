import { Bug } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';
import { DefectTable } from './components/DefectTable';

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

  const defectCount = file.defects.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <h1 className="text-sm font-semibold">Defect Table</h1>
        <span className="text-xs text-muted-foreground">
          {numberFormatter.format(defectCount)} defect{defectCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table area */}
      <div className="min-h-0 flex-1">
        <DefectTable
          defects={file.defects}
          defectSchema={file.defectSchema}
          classLookup={file.classLookup}
        />
      </div>
    </div>
  );
}
