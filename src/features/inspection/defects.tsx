import { Bug } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFileStore } from '@/stores';

export default function DefectsPage() {
  const activeFileId = useFileStore((s) => s.activeFileId);

  if (!activeFileId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={Bug} title="No Data" description="Open a file to view defects" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-4 text-2xl font-bold">Defect Table</h1>
      <p className="text-sm text-muted-foreground">Defect table will be implemented in Phase 3.</p>
    </div>
  );
}
